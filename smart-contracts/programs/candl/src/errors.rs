use anchor_lang::prelude::*;

#[error_code]
pub enum CandlError {
    #[msg("Curve math overflowed")]
    MathOverflow,
    #[msg("Fee configuration exceeds protocol maximum")]
    FeeTooHigh,
    #[msg("Market duration is outside protocol bounds")]
    InvalidDuration,
    #[msg("Market extension exceeds the maximum allowed per call")]
    ExtensionTooLong,
    #[msg("Market is not in the Active state")]
    MarketNotActive,
    #[msg("Market is not in the Settling state")]
    MarketNotSettling,
    #[msg("Market has already expired")]
    MarketExpired,
    #[msg("Market has not expired yet")]
    MarketNotExpired,
    #[msg("Share amount must be greater than zero")]
    ZeroShareAmount,
    #[msg("Trade would exceed the provided slippage tolerance")]
    SlippageExceeded,
    #[msg("Trader does not hold enough shares for this action")]
    InsufficientShares,
    #[msg("Only the market creator may perform this action")]
    NotCreator,
    #[msg("Signer does not hold the NFT being deposited")]
    NotNftOwner,
    #[msg("Reserve does not match the expected curve invariant")]
    ReserveInvariantViolated,
}
