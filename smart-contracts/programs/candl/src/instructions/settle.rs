use anchor_lang::prelude::*;

use crate::constants::MARKET_SEED;
use crate::errors::CandlError;
use crate::events::MarketSettled;
use crate::state::{BondingCurve, Market, MarketState};

#[derive(Accounts)]
pub struct Settle<'info> {
    #[account(
        mut,
        seeds = [MARKET_SEED, market.nft_mint.as_ref()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,

    #[account(
        seeds = [crate::constants::BONDING_CURVE_SEED, market.key().as_ref()],
        bump = bonding_curve.bump,
    )]
    pub bonding_curve: Account<'info, BondingCurve>,
    // Permissionless -- anyone can trigger settlement once the market has expired.
}

pub fn handler(ctx: Context<Settle>) -> Result<()> {
    let market = &mut ctx.accounts.market;
    require!(market.state == MarketState::Active, CandlError::MarketNotActive);

    let now = Clock::get()?.unix_timestamp;
    require!(now >= market.expires_at(), CandlError::MarketNotExpired);

    market.state = MarketState::Settling;

    emit!(MarketSettled {
        market: market.key(),
        final_reserve: ctx.accounts.bonding_curve.real_sol_reserves,
        timestamp: now,
    });

    Ok(())
}
