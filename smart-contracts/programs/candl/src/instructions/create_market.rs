use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

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

    /// SOL reserve. Never explicitly created -- a fresh PDA implicitly
    /// exists (owned by the System Program, 0 lamports) until its first
    /// deposit in `buy`. Anchor only needs to validate the PDA derivation
    /// here so `market.vault` stores the right address.
    #[account(seeds = [VAULT_SEED, market.key().as_ref()], bump)]
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
            Transfer {
                from: ctx.accounts.creator_token_account.to_account_info(),
                to: ctx.accounts.escrow.to_account_info(),
                authority: ctx.accounts.creator.to_account_info(),
            },
        ),
        1,
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
