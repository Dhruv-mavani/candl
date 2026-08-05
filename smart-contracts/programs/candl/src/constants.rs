use anchor_lang::prelude::*;

#[constant]
pub const PROTOCOL_CONFIG_SEED: &[u8] = b"protocol_config";
#[constant]
pub const MARKET_SEED: &[u8] = b"market";
#[constant]
pub const BONDING_CURVE_SEED: &[u8] = b"bonding_curve";
#[constant]
pub const VAULT_SEED: &[u8] = b"vault";
#[constant]
pub const ESCROW_SEED: &[u8] = b"escrow";
#[constant]
pub const POSITION_SEED: &[u8] = b"position";

/// Fixed-point scale for `ProtocolConfig.curve_alpha` / `curve_beta`.
/// A stored value of `1_000_000` represents the real number `0.001`
/// (matching the example in docs/03-economics.md), i.e.
/// `real_value = raw_value / CURVE_SCALE`.
#[constant]
pub const CURVE_SCALE: u128 = 1_000_000_000;

/// docs/03-economics.md: total fee is 1.25%, split 0.95% protocol / 0.30% creator.
#[constant]
pub const MAX_TOTAL_FEE_BPS: u16 = 1000; // 10% hard ceiling on protocol + creator fee combined

#[constant]
pub const MIN_MARKET_DURATION_SECONDS: i64 = 60 * 60 * 24; // 1 day
#[constant]
pub const MAX_MARKET_DURATION_SECONDS: i64 = 60 * 60 * 24 * 30; // 30 days
#[constant]
pub const MAX_EXTENSION_SECONDS: i64 = 60 * 60 * 24 * 30; // 30 days per extension
