use anchor_lang::prelude::*;

use crate::constants::{MAX_TOTAL_FEE_BPS, PROTOCOL_CONFIG_SEED};
use crate::errors::CandlError;
use crate::state::ProtocolConfig;

#[derive(Accounts)]
pub struct InitializeProtocol<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + ProtocolConfig::INIT_SPACE,
        seeds = [PROTOCOL_CONFIG_SEED],
        bump,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializeProtocol>,
    curve_alpha: u64,
    curve_beta: u64,
    protocol_fee_bps: u16,
    creator_fee_bps: u16,
) -> Result<()> {
    let total_fee_bps = protocol_fee_bps
        .checked_add(creator_fee_bps)
        .ok_or(CandlError::MathOverflow)?;
    require!(total_fee_bps <= MAX_TOTAL_FEE_BPS, CandlError::FeeTooHigh);

    let config = &mut ctx.accounts.protocol_config;
    config.curve_alpha = curve_alpha;
    config.curve_beta = curve_beta;
    config.protocol_fee_bps = protocol_fee_bps;
    config.creator_fee_bps = creator_fee_bps;
    config.authority = ctx.accounts.authority.key();
    config.bump = ctx.bumps.protocol_config;

    Ok(())
}
