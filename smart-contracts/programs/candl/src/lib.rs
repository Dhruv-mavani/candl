pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use errors::*;
pub use events::*;
pub use instructions::*;
pub use state::*;

declare_id!("JDqvbHqaL1W57YALJnY1Lyyi6Ai5aFMaNi1mzYATTYAa");

#[program]
pub mod candl {
    use super::*;

    pub fn initialize_protocol(
        ctx: Context<InitializeProtocol>,
        curve_alpha: u64,
        curve_beta: u64,
        protocol_fee_bps: u16,
        creator_fee_bps: u16,
    ) -> Result<()> {
        initialize_protocol::handler(ctx, curve_alpha, curve_beta, protocol_fee_bps, creator_fee_bps)
    }

    pub fn create_market(ctx: Context<CreateMarket>, duration: i64) -> Result<()> {
        create_market::handler(ctx, duration)
    }

    pub fn buy(ctx: Context<Buy>, share_amount: u64, max_sol_cost: u64) -> Result<()> {
        buy::handler(ctx, share_amount, max_sol_cost)
    }

    pub fn sell(ctx: Context<Sell>, share_amount: u64, min_sol_out: u64) -> Result<()> {
        sell::handler(ctx, share_amount, min_sol_out)
    }

    pub fn extend_market(ctx: Context<ExtendMarket>, extension_seconds: i64) -> Result<()> {
        extend_market::handler(ctx, extension_seconds)
    }

    pub fn settle(ctx: Context<Settle>) -> Result<()> {
        settle::handler(ctx)
    }

    pub fn redeem(ctx: Context<Redeem>, shares: u64) -> Result<()> {
        redeem::handler(ctx, shares)
    }

    pub fn force_redeem(ctx: Context<ForceRedeem>, shares: u64) -> Result<()> {
        force_redeem::handler(ctx, shares)
    }
}
