use anchor_lang::prelude::*;

use crate::constants::{MARKET_SEED, MAX_EXTENSION_SECONDS};
use crate::errors::CandlError;
use crate::events::MarketExtended;
use crate::state::{Market, MarketState};

#[derive(Accounts)]
pub struct ExtendMarket<'info> {
    #[account(
        mut,
        seeds = [MARKET_SEED, market.nft_mint.as_ref()],
        bump = market.bump,
        has_one = creator @ CandlError::NotCreator,
    )]
    pub market: Account<'info, Market>,

    pub creator: Signer<'info>,
}

pub fn handler(ctx: Context<ExtendMarket>, extension_seconds: i64) -> Result<()> {
    let market = &mut ctx.accounts.market;
    require!(market.state == MarketState::Active, CandlError::MarketNotActive);
    require!(
        extension_seconds > 0 && extension_seconds <= MAX_EXTENSION_SECONDS,
        CandlError::ExtensionTooLong
    );

    market.duration = market
        .duration
        .checked_add(extension_seconds)
        .ok_or(CandlError::MathOverflow)?;

    emit!(MarketExtended { market: market.key(), new_expires_at: market.expires_at() });

    Ok(())
}
