use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq, InitSpace)]
pub enum MarketState {
    Active,
    Settling,
    Settled,
}

/// The core account representing a single NFT market.
/// docs/06-smart-contracts.md
#[account]
#[derive(InitSpace)]
pub struct Market {
    pub creator: Pubkey,
    pub nft_mint: Pubkey,
    pub vault: Pubkey,
    pub escrow: Pubkey,
    /// Snapshotted from ProtocolConfig at creation time so a later
    /// governance change never retroactively alters a running market.
    pub fee_protocol_bps: u16,
    pub fee_creator_bps: u16,
    pub created_at: i64,
    pub duration: i64,
    pub state: MarketState,
    pub bump: u8,
    pub vault_bump: u8,
    pub escrow_bump: u8,
}

impl Market {
    pub fn expires_at(&self) -> i64 {
        self.created_at.saturating_add(self.duration)
    }
}
