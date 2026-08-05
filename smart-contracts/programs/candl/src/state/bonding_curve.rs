use anchor_lang::prelude::*;

use crate::constants::CURVE_SCALE;
use crate::errors::CandlError;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum CurveType {
    Cubic, // V1 only -- see docs/03-economics.md "Future Curves" for planned variants
}

/// Stores the mathematical state of the market. There is no virtual
/// reserve: `real_sol_reserves` must always exactly equal
/// `reserve(outstanding_shares)` (docs/03-economics.md).
#[account]
#[derive(InitSpace)]
pub struct BondingCurve {
    pub market: Pubkey,
    pub curve_type: CurveType,
    pub outstanding_shares: u64,
    pub real_sol_reserves: u64,
    pub bump: u8,
}

/// Reserve(S) = curve_alpha * S^3 + curve_beta * S, computed in u128 to
/// avoid overflowing far before a u64 result would ever be reached
/// (docs/06-smart-contracts.md, Security Considerations: "Cubic Overflow").
/// `curve_alpha` / `curve_beta` are fixed-point values scaled by
/// `CURVE_SCALE`.
pub fn reserve(supply: u64, curve_alpha: u64, curve_beta: u64) -> Result<u64> {
    let supply = supply as u128;
    let alpha = curve_alpha as u128;
    let beta = curve_beta as u128;

    let cubic_term = supply
        .checked_pow(3)
        .and_then(|s3| s3.checked_mul(alpha))
        .ok_or(CandlError::MathOverflow)?;

    let linear_term = supply.checked_mul(beta).ok_or(CandlError::MathOverflow)?;

    let scaled = cubic_term
        .checked_add(linear_term)
        .ok_or(CandlError::MathOverflow)?;

    let lamports = scaled.checked_div(CURVE_SCALE).ok_or(CandlError::MathOverflow)?;

    u64::try_from(lamports).map_err(|_| CandlError::MathOverflow.into())
}

/// Cost to mint `delta` new shares on top of `supply` (docs/03-economics.md: `BuyCost`).
pub fn buy_cost(supply: u64, delta: u64, curve_alpha: u64, curve_beta: u64) -> Result<u64> {
    let new_supply = supply.checked_add(delta).ok_or(CandlError::MathOverflow)?;
    let reserve_after = reserve(new_supply, curve_alpha, curve_beta)?;
    let reserve_before = reserve(supply, curve_alpha, curve_beta)?;
    reserve_after
        .checked_sub(reserve_before)
        .ok_or_else(|| CandlError::MathOverflow.into())
}

/// Refund for burning `delta` shares out of `supply` (docs/03-economics.md: `SellRefund`).
pub fn sell_refund(supply: u64, delta: u64, curve_alpha: u64, curve_beta: u64) -> Result<u64> {
    let new_supply = supply.checked_sub(delta).ok_or(CandlError::MathOverflow)?;
    let reserve_before = reserve(supply, curve_alpha, curve_beta)?;
    let reserve_after = reserve(new_supply, curve_alpha, curve_beta)?;
    reserve_before
        .checked_sub(reserve_after)
        .ok_or_else(|| CandlError::MathOverflow.into())
}

/// Spot price = Price(S) = 3 * curve_alpha * S^2 + curve_beta (docs/03-economics.md).
pub fn spot_price(supply: u64, curve_alpha: u64, curve_beta: u64) -> Result<u64> {
    let supply = supply as u128;
    let alpha = curve_alpha as u128;
    let beta = curve_beta as u128;

    let quadratic_term = supply
        .checked_pow(2)
        .and_then(|s2| s2.checked_mul(alpha))
        .and_then(|v| v.checked_mul(3))
        .ok_or(CandlError::MathOverflow)?;

    let scaled = quadratic_term.checked_add(beta).ok_or(CandlError::MathOverflow)?;
    let price = scaled.checked_div(CURVE_SCALE).ok_or(CandlError::MathOverflow)?;

    u64::try_from(price).map_err(|_| CandlError::MathOverflow.into())
}

#[cfg(test)]
mod tests {
    use super::*;

    // alpha = 0.001, beta = 0.1 (docs/03-economics.md example values), scaled by CURVE_SCALE.
    const ALPHA: u64 = 1_000_000; // 0.001 * 1e9
    const BETA: u64 = 100_000_000; // 0.1 * 1e9

    #[test]
    fn reserve_is_zero_at_zero_supply() {
        assert_eq!(reserve(0, ALPHA, BETA).unwrap(), 0);
    }

    #[test]
    fn reserve_grows_monotonically() {
        let r1 = reserve(100, ALPHA, BETA).unwrap();
        let r2 = reserve(200, ALPHA, BETA).unwrap();
        assert!(r2 > r1);
    }

    #[test]
    fn buy_then_sell_same_delta_is_reserve_neutral() {
        let supply = 500u64;
        let delta = 50u64;
        let cost = buy_cost(supply, delta, ALPHA, BETA).unwrap();
        let refund = sell_refund(supply + delta, delta, ALPHA, BETA).unwrap();
        assert_eq!(cost, refund);
    }

    #[test]
    fn buy_cost_is_positive_for_positive_delta() {
        let cost = buy_cost(1_000, 10, ALPHA, BETA).unwrap();
        assert!(cost > 0);
    }

    #[test]
    fn large_supply_does_not_overflow() {
        // 10 million shares -- well beyond any V1 market's realistic supply.
        let result = reserve(10_000_000, ALPHA, BETA);
        assert!(result.is_ok());
    }

    #[test]
    fn spot_price_increases_with_supply() {
        let p1 = spot_price(100, ALPHA, BETA).unwrap();
        let p2 = spot_price(200, ALPHA, BETA).unwrap();
        assert!(p2 > p1);
    }
}
