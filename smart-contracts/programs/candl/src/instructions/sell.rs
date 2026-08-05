use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

use crate::constants::*;
use crate::errors::CandlError;
use crate::events::TradeExecuted;
use crate::state::{sell_refund, spot_price, BondingCurve, Market, MarketState, ProtocolConfig, TraderPosition};

const BPS_DENOMINATOR: u64 = 10_000;

#[derive(Accounts)]
pub struct Sell<'info> {
    #[account(seeds = [PROTOCOL_CONFIG_SEED], bump = protocol_config.bump)]
    pub protocol_config: Account<'info, ProtocolConfig>,

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

    /// CHECK: validated against protocol_config.authority; only receives lamports.
    #[account(mut, address = protocol_config.authority)]
    pub protocol_treasury: UncheckedAccount<'info>,

    /// CHECK: validated against market.creator; only receives lamports.
    #[account(mut, address = market.creator)]
    pub creator: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Sell>, share_amount: u64, min_sol_out: u64) -> Result<()> {
    require!(share_amount > 0, CandlError::ZeroShareAmount);

    let market = &ctx.accounts.market;
    require!(market.state == MarketState::Active, CandlError::MarketNotActive);

    let now = Clock::get()?.unix_timestamp;
    require!(now < market.expires_at(), CandlError::MarketExpired);

    require!(
        ctx.accounts.trader_position.shares >= share_amount,
        CandlError::InsufficientShares
    );

    let protocol_config = &ctx.accounts.protocol_config;
    let bonding_curve = &ctx.accounts.bonding_curve;

    let refund = sell_refund(
        bonding_curve.outstanding_shares,
        share_amount,
        protocol_config.curve_alpha,
        protocol_config.curve_beta,
    )?;

    let protocol_fee = refund
        .checked_mul(market.fee_protocol_bps as u64)
        .and_then(|v| v.checked_div(BPS_DENOMINATOR))
        .ok_or(CandlError::MathOverflow)?;
    let creator_fee = refund
        .checked_mul(market.fee_creator_bps as u64)
        .and_then(|v| v.checked_div(BPS_DENOMINATOR))
        .ok_or(CandlError::MathOverflow)?;

    let net_payout = refund
        .checked_sub(protocol_fee)
        .and_then(|v| v.checked_sub(creator_fee))
        .ok_or(CandlError::MathOverflow)?;

    require!(net_payout >= min_sol_out, CandlError::SlippageExceeded);

    let market_key = market.key();
    let vault_bump = market.vault_bump;
    let signer_seeds: &[&[u8]] = &[VAULT_SEED, market_key.as_ref(), &[vault_bump]];
    let vault_ai = ctx.accounts.vault.to_account_info();

    system_program::transfer(
        CpiContext::new_with_signer(
            system_program::ID,
            Transfer { from: vault_ai.clone(), to: ctx.accounts.trader.to_account_info() },
            &[signer_seeds],
        ),
        net_payout,
    )?;
    system_program::transfer(
        CpiContext::new_with_signer(
            system_program::ID,
            Transfer { from: vault_ai.clone(), to: ctx.accounts.protocol_treasury.to_account_info() },
            &[signer_seeds],
        ),
        protocol_fee,
    )?;
    system_program::transfer(
        CpiContext::new_with_signer(
            system_program::ID,
            Transfer { from: vault_ai, to: ctx.accounts.creator.to_account_info() },
            &[signer_seeds],
        ),
        creator_fee,
    )?;

    let bonding_curve = &mut ctx.accounts.bonding_curve;
    bonding_curve.outstanding_shares = bonding_curve
        .outstanding_shares
        .checked_sub(share_amount)
        .ok_or(CandlError::MathOverflow)?;
    bonding_curve.real_sol_reserves = bonding_curve
        .real_sol_reserves
        .checked_sub(refund)
        .ok_or(CandlError::MathOverflow)?;

    let trader_position = &mut ctx.accounts.trader_position;
    trader_position.shares = trader_position
        .shares
        .checked_sub(share_amount)
        .ok_or(CandlError::MathOverflow)?;

    let price = spot_price(bonding_curve.outstanding_shares, protocol_config.curve_alpha, protocol_config.curve_beta)?;

    emit!(TradeExecuted {
        market: market.key(),
        trader: ctx.accounts.trader.key(),
        is_buy: false,
        sol_amount: refund,
        share_amount,
        price,
        fee_paid: protocol_fee.checked_add(creator_fee).ok_or(CandlError::MathOverflow)?,
        timestamp: now,
    });

    Ok(())
}
