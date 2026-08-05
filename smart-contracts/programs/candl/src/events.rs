use anchor_lang::prelude::*;

#[event]
pub struct MarketCreated {
    pub market: Pubkey,
    pub nft_mint: Pubkey,
    pub creator: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct TradeExecuted {
    pub market: Pubkey,
    pub trader: Pubkey,
    pub is_buy: bool,
    pub sol_amount: u64,
    pub share_amount: u64,
    pub price: u64, // Price(outstanding_shares) after the trade -- see docs/03-economics.md
    pub fee_paid: u64,
    pub timestamp: i64,
}

#[event]
pub struct MarketExtended {
    pub market: Pubkey,
    pub new_expires_at: i64,
}

#[event]
pub struct MarketSettled {
    pub market: Pubkey,
    pub final_reserve: u64,
    pub timestamp: i64,
}

#[event]
pub struct SharesRedeemed {
    pub market: Pubkey,
    pub trader: Pubkey,
    pub shares: u64,
    pub sol_received: u64,
}
