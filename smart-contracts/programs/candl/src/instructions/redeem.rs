use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer as SolTransfer};
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer as TokenTransfer};

use crate::constants::*;
use crate::errors::CandlError;
use crate::events::SharesRedeemed;
use crate::state::{BondingCurve, Market, MarketState, TraderPosition};

#[derive(Accounts)]
pub struct Redeem<'info> {
    #[account(
        mut,
        seeds = [MARKET_SEED, market.nft_mint.as_ref()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,

    #[account(
        mut,
        seeds = [BONDING_CURVE_SEED, market.key().as_ref()],
        bump = bonding_curve.bump,
    )]
    pub bonding_curve: Account<'info, BondingCurve>,

    #[account(mut, seeds = [VAULT_SEED, market.key().as_ref()], bump = market.vault_bump)]
    pub vault: SystemAccount<'info>,

    #[account(
        mut,
        seeds = [POSITION_SEED, market.key().as_ref(), trader.key().as_ref()],
        bump = trader_position.bump,
    )]
    pub trader_position: Account<'info, TraderPosition>,

    #[account(mut)]
    pub trader: Signer<'info>,

    /// Only touched if this redemption drains the market to zero supply,
    /// returning the NFT to its creator (docs/04-market-lifecycle.md).
    #[account(mut, seeds = [ESCROW_SEED, market.key().as_ref()], bump = market.escrow_bump)]
    pub escrow: Account<'info, TokenAccount>,

    pub nft_mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = creator_token_account.mint == nft_mint.key(),
        constraint = creator_token_account.owner == market.creator,
    )]
    pub creator_token_account: Account<'info, TokenAccount>,

    /// CHECK: validated against market.creator; only receives lamports
    /// (the vault's rent-exempt seed from create_market.rs, refunded here
    /// once the market is fully settled).
    #[account(mut, address = market.creator)]
    pub creator: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Redeem>, shares: u64) -> Result<()> {
    require!(shares > 0, CandlError::ZeroShareAmount);

    let market = &ctx.accounts.market;
    require!(market.state == MarketState::Settling, CandlError::MarketNotSettling);

    require!(ctx.accounts.trader_position.shares >= shares, CandlError::InsufficientShares);

    let bonding_curve = &ctx.accounts.bonding_curve;
    require!(bonding_curve.outstanding_shares > 0, CandlError::InsufficientShares);

    // Redemption amount = (shares / outstanding_shares) * reserve (docs/04-market-lifecycle.md).
    let payout = (shares as u128)
        .checked_mul(bonding_curve.real_sol_reserves as u128)
        .and_then(|v| v.checked_div(bonding_curve.outstanding_shares as u128))
        .ok_or(CandlError::MathOverflow)?;
    let payout = u64::try_from(payout).map_err(|_| CandlError::MathOverflow)?;

    let market_key = market.key();
    let vault_bump = market.vault_bump;
    let vault_signer_seeds: &[&[u8]] = &[VAULT_SEED, market_key.as_ref(), &[vault_bump]];

    system_program::transfer(
        CpiContext::new_with_signer(
            system_program::ID,
            SolTransfer { from: ctx.accounts.vault.to_account_info(), to: ctx.accounts.trader.to_account_info() },
            &[vault_signer_seeds],
        ),
        payout,
    )?;

    let bonding_curve = &mut ctx.accounts.bonding_curve;
    bonding_curve.outstanding_shares =
        bonding_curve.outstanding_shares.checked_sub(shares).ok_or(CandlError::MathOverflow)?;
    bonding_curve.real_sol_reserves =
        bonding_curve.real_sol_reserves.checked_sub(payout).ok_or(CandlError::MathOverflow)?;

    let trader_position = &mut ctx.accounts.trader_position;
    trader_position.shares = trader_position.shares.checked_sub(shares).ok_or(CandlError::MathOverflow)?;

    let fully_settled = bonding_curve.outstanding_shares == 0;

    if fully_settled {
        let escrow_bump = market.escrow_bump;
        let escrow_signer_seeds: &[&[u8]] = &[ESCROW_SEED, market_key.as_ref(), &[escrow_bump]];

        token::transfer(
            CpiContext::new_with_signer(
                token::ID,
                TokenTransfer {
                    from: ctx.accounts.escrow.to_account_info(),
                    to: ctx.accounts.creator_token_account.to_account_info(),
                    authority: ctx.accounts.escrow.to_account_info(),
                },
                &[escrow_signer_seeds],
            ),
            1,
        )?;

        // real_sol_reserves just hit 0, so everything left in the vault is
        // the rent-exempt seed create_market.rs deposited -- refund all of
        // it to the creator now that the vault will never be used again.
        let vault_remaining = ctx.accounts.vault.lamports();
        if vault_remaining > 0 {
            system_program::transfer(
                CpiContext::new_with_signer(
                    system_program::ID,
                    SolTransfer { from: ctx.accounts.vault.to_account_info(), to: ctx.accounts.creator.to_account_info() },
                    &[vault_signer_seeds],
                ),
                vault_remaining,
            )?;
        }

        ctx.accounts.market.state = MarketState::Settled;
    }

    emit!(SharesRedeemed {
        market: market_key,
        trader: ctx.accounts.trader.key(),
        shares,
        sol_received: payout,
    });

    Ok(())
}
