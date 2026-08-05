use anchor_lang::prelude::*;

/// One trader's share balance in one market. Shares are not SPL tokens
/// (docs/15-decisions.md ADR #2) -- this account is the balance ledger.
#[account]
#[derive(InitSpace)]
pub struct TraderPosition {
    pub market: Pubkey,
    pub trader: Pubkey,
    pub shares: u64,
    pub bump: u8,
}
