use anchor_lang::prelude::*;
use anchor_lang::system_program::{self as sol_system_program, Transfer as SolTransfer};
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer as TokenTransfer};

use crate::constants::*;
use crate::errors::CandlError;
use crate::events::MarketCreated;
use crate::state::{BondingCurve, CurveType, Market, MarketState, ProtocolConfig};

#[derive(Accounts)]
pub struct CreateMarket<'info> {
    #[account(seeds = [PROTOCOL_CONFIG_SEED], bump = protocol_config.bump)]
    pub protocol_config: Account<'info, ProtocolConfig>,

    #[account(
        init,
        payer = creator,
        space = 8 + Market::INIT_SPACE,
        seeds = [MARKET_SEED, nft_mint.key().as_ref()],
        bump,
    )]
    pub market: Account<'info, Market>,

    #[account(
        init,
        payer = creator,
        space = 8 + BondingCurve::INIT_SPACE,
        seeds = [BONDING_CURVE_SEED, market.key().as_ref()],
        bump,
    )]
    pub bonding_curve: Account<'info, BondingCurve>,

    /// SOL reserve. Never `init`ed as a data account -- the handler below
    /// seeds it with the rent-exempt minimum directly, since a bare
    /// SystemAccount holding a nonzero balance below that threshold makes
    /// Solana reject the whole transaction (this is what small early buys
    /// hit before this seeding existed: see docs/15-decisions.md ADR #5).
    /// The seed is refunded to `creator` in `redeem` once the market is
    /// fully settled (see redeem.rs).
    #[account(mut, seeds = [VAULT_SEED, market.key().as_ref()], bump)]
    pub vault: SystemAccount<'info>,

    /// Holds the deposited NFT. Its own PDA address doubles as its SPL
    /// token authority -- outgoing transfers (at settlement) sign with
    /// these same seeds via CPI.
    #[account(
        init,
        payer = creator,
        seeds = [ESCROW_SEED, market.key().as_ref()],
        bump,
        token::mint = nft_mint,
        token::authority = escrow,
    )]
    pub escrow: Account<'info, TokenAccount>,

    pub nft_mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = creator_token_account.mint == nft_mint.key(),
        constraint = creator_token_account.owner == creator.key(),
        constraint = creator_token_account.amount == 1 @ CandlError::NotNftOwner,
    )]
    pub creator_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<CreateMarket>, duration: i64) -> Result<()> {
    require!(
        (MIN_MARKET_DURATION_SECONDS..=MAX_MARKET_DURATION_SECONDS).contains(&duration),
        CandlError::InvalidDuration
    );

    token::transfer(
        CpiContext::new(
            token::ID,
            TokenTransfer {
                from: ctx.accounts.creator_token_account.to_account_info(),
                to: ctx.accounts.escrow.to_account_info(),
                authority: ctx.accounts.creator.to_account_info(),
            },
        ),
        1,
    )?;

    // Bootstrap the vault past Solana's rent-exempt floor so the first buy
    // -- however small -- doesn't leave it in a nonzero-but-sub-threshold
    // state, which the runtime rejects outright. Refunded to creator on
    // full settlement (redeem.rs).
    let vault_rent_exempt_minimum = ctx.accounts.rent.minimum_balance(0);
    sol_system_program::transfer(
        CpiContext::new(
            sol_system_program::ID,
            SolTransfer { from: ctx.accounts.creator.to_account_info(), to: ctx.accounts.vault.to_account_info() },
        ),
        vault_rent_exempt_minimum,
    )?;

    let now = Clock::get()?.unix_timestamp;
    let protocol_config = &ctx.accounts.protocol_config;

    let market = &mut ctx.accounts.market;
    market.creator = ctx.accounts.creator.key();
    market.nft_mint = ctx.accounts.nft_mint.key();
    market.vault = ctx.accounts.vault.key();
    market.escrow = ctx.accounts.escrow.key();
    market.fee_protocol_bps = protocol_config.protocol_fee_bps;
    market.fee_creator_bps = protocol_config.creator_fee_bps;
    market.created_at = now;
    market.duration = duration;
    market.state = MarketState::Active;
    market.bump = ctx.bumps.market;
    market.vault_bump = ctx.bumps.vault;
    market.escrow_bump = ctx.bumps.escrow;

    let bonding_curve = &mut ctx.accounts.bonding_curve;
    bonding_curve.market = market.key();
    bonding_curve.curve_type = CurveType::Cubic;
    bonding_curve.outstanding_shares = 0;
    bonding_curve.real_sol_reserves = 0;
    bonding_curve.bump = ctx.bumps.bonding_curve;

    emit!(MarketCreated {
        market: market.key(),
        nft_mint: market.nft_mint,
        creator: market.creator,
        timestamp: now,
    });

    Ok(())
}
