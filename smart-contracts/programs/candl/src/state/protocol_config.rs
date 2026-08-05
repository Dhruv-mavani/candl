use anchor_lang::prelude::*;

/// Singleton account holding the protocol-wide curve and fee parameters.
/// docs/03-economics.md: "these percentages apply uniformly across all
/// markets" -- fees and the curve shape are not a per-market choice in V1.
#[account]
#[derive(InitSpace)]
pub struct ProtocolConfig {
    /// Reserve(S) = curve_alpha * S^3 + curve_beta * S, both fixed-point
    /// scaled by CURVE_SCALE (see constants.rs).
    pub curve_alpha: u64,
    pub curve_beta: u64,
    pub protocol_fee_bps: u16,
    pub creator_fee_bps: u16,
    /// Governance authority: can update this config, and receives protocol
    /// fees as the protocol treasury (V1 simplification -- one account
    /// serves both roles instead of introducing a separate treasury PDA).
    pub authority: Pubkey,
    pub bump: u8,
}
