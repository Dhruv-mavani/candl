use anchor_lang::{
    prelude::Pubkey,
    solana_program::{instruction::Instruction, program_pack::Pack, system_instruction},
    system_program, AccountDeserialize, InstructionData, ToAccountMetas,
};
use candl::{BondingCurve, Market, MarketState, TraderPosition};
use litesvm::LiteSVM;
use solana_keypair::Keypair;
use solana_message::{Message, VersionedMessage};
use solana_signer::Signer;
use solana_transaction::versioned::VersionedTransaction;
use spl_token::state::{Account as SplTokenAccount, Mint as SplMint};

// docs/03-economics.md's example values (alpha=0.001, beta=0.1) are far too
// flat to produce meaningfully-sized SOL amounts at the tiny share counts
// used in these tests -- refunds would round down below the network's flat
// transaction fee. Steeper test-only constants (alpha=1.0) keep the curve
// math identical, just scaled to produce real, assertable lamport amounts.
const CURVE_ALPHA: u64 = 1_000_000_000; // 1.0 * CURVE_SCALE
const CURVE_BETA: u64 = 100_000_000; // 0.1 * CURVE_SCALE
const PROTOCOL_FEE_BPS: u16 = 95;
const CREATOR_FEE_BPS: u16 = 30;
const ONE_DAY: i64 = 60 * 60 * 24;
const LAMPORTS_PER_SOL: u64 = 1_000_000_000;

struct Ctx {
    svm: LiteSVM,
    authority: Keypair,
    creator: Keypair,
    trader: Keypair,
    nft_mint: Keypair,
    creator_token_account: Keypair,
    creator_return_token_account: Keypair,
    protocol_config: Pubkey,
    market: Pubkey,
    bonding_curve: Pubkey,
    vault: Pubkey,
    vault_rent_exempt_seed: u64,
    escrow: Pubkey,
    trader_position: Pubkey,
}

fn send(svm: &mut LiteSVM, ixs: &[Instruction], payer: &Keypair, extra_signers: &[&Keypair]) -> Result<(), String> {
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(ixs, Some(&payer.pubkey()), &blockhash);
    let mut signers: Vec<&Keypair> = vec![payer];
    signers.extend(extra_signers.iter().filter(|s| s.pubkey() != payer.pubkey()));
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &signers).map_err(|e| e.to_string())?;
    svm.send_transaction(tx).map(|_| ()).map_err(|e| format!("{e:?}"))
}

fn create_mint(svm: &mut LiteSVM, payer: &Keypair, mint: &Keypair, authority: &Keypair) {
    let rent = svm.minimum_balance_for_rent_exemption(SplMint::LEN);
    let ixs = [
        system_instruction::create_account(&payer.pubkey(), &mint.pubkey(), rent, SplMint::LEN as u64, &spl_token::id()),
        spl_token::instruction::initialize_mint2(&spl_token::id(), &mint.pubkey(), &authority.pubkey(), None, 0).unwrap(),
    ];
    send(svm, &ixs, payer, &[mint]).unwrap();
}

fn create_token_account(svm: &mut LiteSVM, payer: &Keypair, account: &Keypair, mint: &Pubkey, owner: &Pubkey) {
    let rent = svm.minimum_balance_for_rent_exemption(SplTokenAccount::LEN);
    let ixs = [
        system_instruction::create_account(
            &payer.pubkey(),
            &account.pubkey(),
            rent,
            SplTokenAccount::LEN as u64,
            &spl_token::id(),
        ),
        spl_token::instruction::initialize_account3(&spl_token::id(), &account.pubkey(), mint, owner).unwrap(),
    ];
    send(svm, &ixs, payer, &[account]).unwrap();
}

fn mint_to(svm: &mut LiteSVM, payer: &Keypair, mint: &Pubkey, dest: &Pubkey, authority: &Keypair, amount: u64) {
    let ix = spl_token::instruction::mint_to(&spl_token::id(), mint, dest, &authority.pubkey(), &[], amount).unwrap();
    send(svm, &[ix], payer, &[authority]).unwrap();
}

fn fetch<T: AccountDeserialize>(svm: &LiteSVM, address: &Pubkey) -> T {
    let account = svm.get_account(address).expect("account not found");
    T::try_deserialize(&mut account.data.as_slice()).expect("failed to deserialize")
}

/// Boots LiteSVM, deploys the program, initializes the protocol, and
/// creates one market with a fresh NFT deposited by `creator`.
fn setup() -> Ctx {
    let program_id = candl::id();
    let mut svm = LiteSVM::new();
    let bytes = include_bytes!("../../../target/deploy/candl.so");
    svm.add_program(program_id, bytes).unwrap();

    let authority = Keypair::new();
    let creator = Keypair::new();
    let trader = Keypair::new();
    let nft_mint = Keypair::new();
    let creator_token_account = Keypair::new();
    let creator_return_token_account = Keypair::new();

    for kp in [&authority, &creator, &trader] {
        svm.airdrop(&kp.pubkey(), 1_000 * LAMPORTS_PER_SOL).unwrap();
    }

    create_mint(&mut svm, &creator, &nft_mint, &creator);
    create_token_account(&mut svm, &creator, &creator_token_account, &nft_mint.pubkey(), &creator.pubkey());
    mint_to(&mut svm, &creator, &nft_mint.pubkey(), &creator_token_account.pubkey(), &creator, 1);
    create_token_account(&mut svm, &creator, &creator_return_token_account, &nft_mint.pubkey(), &creator.pubkey());

    let (protocol_config, _) = Pubkey::find_program_address(&[b"protocol_config"], &program_id);
    let (market, _) = Pubkey::find_program_address(&[b"market", nft_mint.pubkey().as_ref()], &program_id);
    let (bonding_curve, _) = Pubkey::find_program_address(&[b"bonding_curve", market.as_ref()], &program_id);
    let (vault, _) = Pubkey::find_program_address(&[b"vault", market.as_ref()], &program_id);
    let (escrow, _) = Pubkey::find_program_address(&[b"escrow", market.as_ref()], &program_id);
    let (trader_position, _) = Pubkey::find_program_address(&[b"position", market.as_ref(), trader.pubkey().as_ref()], &program_id);

    let init_ix = Instruction::new_with_bytes(
        program_id,
        &candl::instruction::InitializeProtocol {
            curve_alpha: CURVE_ALPHA,
            curve_beta: CURVE_BETA,
            protocol_fee_bps: PROTOCOL_FEE_BPS,
            creator_fee_bps: CREATOR_FEE_BPS,
        }
        .data(),
        candl::accounts::InitializeProtocol { protocol_config, authority: authority.pubkey(), system_program: system_program::ID }
            .to_account_metas(None),
    );
    send(&mut svm, &[init_ix], &authority, &[]).unwrap();

    let create_market_ix = Instruction::new_with_bytes(
        program_id,
        &candl::instruction::CreateMarket { duration: 7 * ONE_DAY }.data(),
        candl::accounts::CreateMarket {
            protocol_config,
            market,
            bonding_curve,
            vault,
            escrow,
            nft_mint: nft_mint.pubkey(),
            creator_token_account: creator_token_account.pubkey(),
            creator: creator.pubkey(),
            token_program: spl_token::id(),
            system_program: system_program::ID,
            rent: anchor_lang::prelude::rent::ID,
        }
        .to_account_metas(None),
    );
    send(&mut svm, &[create_market_ix], &creator, &[]).unwrap();

    let vault_rent_exempt_seed = svm.minimum_balance_for_rent_exemption(0);

    Ctx {
        svm,
        authority,
        creator,
        trader,
        nft_mint,
        creator_token_account,
        creator_return_token_account,
        protocol_config,
        market,
        bonding_curve,
        vault,
        vault_rent_exempt_seed,
        escrow,
        trader_position,
    }
}

fn buy_ix(ctx: &Ctx, share_amount: u64, max_sol_cost: u64) -> Instruction {
    Instruction::new_with_bytes(
        candl::id(),
        &candl::instruction::Buy { share_amount, max_sol_cost }.data(),
        candl::accounts::Buy {
            protocol_config: ctx.protocol_config,
            market: ctx.market,
            bonding_curve: ctx.bonding_curve,
            vault: ctx.vault,
            trader_position: ctx.trader_position,
            trader: ctx.trader.pubkey(),
            protocol_treasury: ctx.authority.pubkey(),
            creator: ctx.creator.pubkey(),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    )
}

#[test]
fn create_market_deposits_the_nft_and_starts_active() {
    let ctx = setup();
    let market: Market = fetch(&ctx.svm, &ctx.market);
    assert_eq!(market.state, MarketState::Active);
    assert_eq!(market.creator, ctx.creator.pubkey());
    assert_eq!(market.fee_protocol_bps, PROTOCOL_FEE_BPS);
    assert_eq!(market.fee_creator_bps, CREATOR_FEE_BPS);

    let escrow = SplTokenAccount::unpack(&ctx.svm.get_account(&ctx.escrow).unwrap().data).unwrap();
    assert_eq!(escrow.amount, 1, "escrow should hold the deposited NFT");

    let creator_ata =
        SplTokenAccount::unpack(&ctx.svm.get_account(&ctx.creator_token_account.pubkey()).unwrap().data).unwrap();
    assert_eq!(creator_ata.amount, 0, "creator no longer holds the NFT");
}

#[test]
fn buy_increases_supply_and_reserve_by_the_curve_amount() {
    let mut ctx = setup();
    let bonding_curve_before: BondingCurve = fetch(&ctx.svm, &ctx.bonding_curve);
    assert_eq!(bonding_curve_before.outstanding_shares, 0);
    assert_eq!(bonding_curve_before.real_sol_reserves, 0);

    let ix = buy_ix(&ctx, 100, 10 * LAMPORTS_PER_SOL);
    send(&mut ctx.svm, &[ix], &ctx.trader, &[]).unwrap();

    let bonding_curve: BondingCurve = fetch(&ctx.svm, &ctx.bonding_curve);
    assert_eq!(bonding_curve.outstanding_shares, 100);
    assert!(bonding_curve.real_sol_reserves > 0);

    let position: TraderPosition = fetch(&ctx.svm, &ctx.trader_position);
    assert_eq!(position.shares, 100);
    assert_eq!(position.trader, ctx.trader.pubkey());

    let vault_balance = ctx.svm.get_balance(&ctx.vault).unwrap();
    assert_eq!(
        vault_balance,
        bonding_curve.real_sol_reserves + ctx.vault_rent_exempt_seed,
        "vault must back the curve's reserve plus its untouched rent-exempt seed"
    );
}

#[test]
fn buy_rejects_when_cost_exceeds_slippage_tolerance() {
    let mut ctx = setup();
    // Cost for 100 shares is nonzero; a max_sol_cost of 1 lamport must fail.
    let ix = buy_ix(&ctx, 100, 1);
    let result = send(&mut ctx.svm, &[ix], &ctx.trader, &[]);
    assert!(result.is_err(), "expected SlippageExceeded, transaction succeeded instead");
}

#[test]
fn sell_burns_shares_and_pays_out_less_than_gross_refund_after_fees() {
    let mut ctx = setup();
    let buy = buy_ix(&ctx, 200, 10 * LAMPORTS_PER_SOL);
    send(&mut ctx.svm, &[buy], &ctx.trader, &[]).unwrap();

    let trader_balance_before = ctx.svm.get_balance(&ctx.trader.pubkey()).unwrap();

    let sell_ix = Instruction::new_with_bytes(
        candl::id(),
        &candl::instruction::Sell { share_amount: 50, min_sol_out: 0 }.data(),
        candl::accounts::Sell {
            protocol_config: ctx.protocol_config,
            market: ctx.market,
            bonding_curve: ctx.bonding_curve,
            vault: ctx.vault,
            trader_position: ctx.trader_position,
            trader: ctx.trader.pubkey(),
            protocol_treasury: ctx.authority.pubkey(),
            creator: ctx.creator.pubkey(),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );
    send(&mut ctx.svm, &[sell_ix], &ctx.trader, &[]).unwrap();

    let position: TraderPosition = fetch(&ctx.svm, &ctx.trader_position);
    assert_eq!(position.shares, 150);

    let trader_balance_after = ctx.svm.get_balance(&ctx.trader.pubkey()).unwrap();
    assert!(trader_balance_after > trader_balance_before, "trader should have received a net SOL payout");
}

#[test]
fn settle_and_full_redemption_returns_nft_to_creator() {
    let mut ctx = setup();
    let buy = buy_ix(&ctx, 100, 10 * LAMPORTS_PER_SOL);
    send(&mut ctx.svm, &[buy], &ctx.trader, &[]).unwrap();

    // Warp the clock past the market's expiry so settle() is allowed.
    let mut clock: anchor_lang::prelude::Clock = ctx.svm.get_sysvar();
    clock.unix_timestamp += 8 * ONE_DAY;
    ctx.svm.set_sysvar(&clock);

    let settle_ix = Instruction::new_with_bytes(
        candl::id(),
        &candl::instruction::Settle {}.data(),
        candl::accounts::Settle { market: ctx.market, bonding_curve: ctx.bonding_curve }.to_account_metas(None),
    );
    send(&mut ctx.svm, &[settle_ix], &ctx.trader, &[]).unwrap();

    let market: Market = fetch(&ctx.svm, &ctx.market);
    assert_eq!(market.state, MarketState::Settling);

    let position: TraderPosition = fetch(&ctx.svm, &ctx.trader_position);
    let creator_balance_before = ctx.svm.get_balance(&ctx.creator.pubkey()).unwrap();
    let redeem_ix = Instruction::new_with_bytes(
        candl::id(),
        &candl::instruction::Redeem { shares: position.shares }.data(),
        candl::accounts::Redeem {
            market: ctx.market,
            bonding_curve: ctx.bonding_curve,
            vault: ctx.vault,
            trader_position: ctx.trader_position,
            trader: ctx.trader.pubkey(),
            escrow: ctx.escrow,
            nft_mint: ctx.nft_mint.pubkey(),
            creator_token_account: ctx.creator_return_token_account.pubkey(),
            creator: ctx.creator.pubkey(),
            token_program: spl_token::id(),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );
    send(&mut ctx.svm, &[redeem_ix], &ctx.trader, &[]).unwrap();

    let market: Market = fetch(&ctx.svm, &ctx.market);
    assert_eq!(market.state, MarketState::Settled, "market should be fully settled once the sole holder redeems everything");

    let bonding_curve: BondingCurve = fetch(&ctx.svm, &ctx.bonding_curve);
    assert_eq!(bonding_curve.outstanding_shares, 0);
    assert_eq!(bonding_curve.real_sol_reserves, 0);

    let creator_nft_account =
        SplTokenAccount::unpack(&ctx.svm.get_account(&ctx.creator_return_token_account.pubkey()).unwrap().data).unwrap();
    assert_eq!(creator_nft_account.amount, 1, "NFT must be returned to the creator once the market is fully settled");

    // A fully-drained SystemAccount ceases to exist on Solana -- get_balance
    // returning None (not Some(0)) is itself proof no dust was left behind.
    assert_eq!(ctx.svm.get_balance(&ctx.vault).unwrap_or(0), 0, "vault's rent-exempt seed must be fully refunded, not left as dust");
    let creator_balance_after = ctx.svm.get_balance(&ctx.creator.pubkey()).unwrap();
    assert_eq!(
        creator_balance_after,
        creator_balance_before + ctx.vault_rent_exempt_seed,
        "creator must receive back exactly the rent-exempt seed they paid at market creation"
    );
}

#[test]
fn buy_of_a_small_share_amount_succeeds_immediately_after_market_creation() {
    // Regression test: before the vault was seeded with the rent-exempt
    // minimum at create_market time, ANY buy small enough to leave the
    // vault below that threshold (e.g. 3 shares, costing a few hundred
    // lamports on this curve) failed the whole transaction with Solana's
    // InsufficientFundsForRent runtime error -- and since a failed tx
    // leaves no trace, the vault could never organically cross the
    // threshold through small purchases. See docs/15-decisions.md ADR #5.
    let mut ctx = setup();
    let ix = buy_ix(&ctx, 3, LAMPORTS_PER_SOL);
    send(&mut ctx.svm, &[ix], &ctx.trader, &[]).expect("a small first buy must succeed now that the vault is pre-funded");

    let bonding_curve: BondingCurve = fetch(&ctx.svm, &ctx.bonding_curve);
    assert_eq!(bonding_curve.outstanding_shares, 3);
}

#[test]
fn extend_market_pushes_out_expiry_and_only_creator_can_call_it() {
    let mut ctx = setup();
    let market_before: Market = fetch(&ctx.svm, &ctx.market);

    let extend_ix = Instruction::new_with_bytes(
        candl::id(),
        &candl::instruction::ExtendMarket { extension_seconds: ONE_DAY }.data(),
        candl::accounts::ExtendMarket { market: ctx.market, creator: ctx.creator.pubkey() }.to_account_metas(None),
    );
    send(&mut ctx.svm, &[extend_ix], &ctx.creator, &[]).unwrap();

    let market_after: Market = fetch(&ctx.svm, &ctx.market);
    assert_eq!(market_after.duration, market_before.duration + ONE_DAY);

    // A non-creator (the trader) must not be able to extend the market.
    let bad_extend_ix = Instruction::new_with_bytes(
        candl::id(),
        &candl::instruction::ExtendMarket { extension_seconds: ONE_DAY }.data(),
        candl::accounts::ExtendMarket { market: ctx.market, creator: ctx.trader.pubkey() }.to_account_metas(None),
    );
    let result = send(&mut ctx.svm, &[bad_extend_ix], &ctx.trader, &[]);
    assert!(result.is_err(), "a non-creator must not be able to extend the market");
}

/// A trader who never comes back to redeem would otherwise leave the market
/// stuck in Settling forever (the creator can't reclaim their NFT until every
/// share is redeemed) -- force_redeem lets anyone pay a stranger's already-
/// determined payout to their already-fixed wallet, so the market can still
/// reach Settled without that trader lifting a finger.
#[test]
fn force_redeem_lets_a_stranger_pay_out_the_trader_and_still_settle_the_market() {
    let mut ctx = setup();
    let buy = buy_ix(&ctx, 100, 10 * LAMPORTS_PER_SOL);
    send(&mut ctx.svm, &[buy], &ctx.trader, &[]).unwrap();

    let mut clock: anchor_lang::prelude::Clock = ctx.svm.get_sysvar();
    clock.unix_timestamp += 8 * ONE_DAY;
    ctx.svm.set_sysvar(&clock);

    let settle_ix = Instruction::new_with_bytes(
        candl::id(),
        &candl::instruction::Settle {}.data(),
        candl::accounts::Settle { market: ctx.market, bonding_curve: ctx.bonding_curve }.to_account_metas(None),
    );
    send(&mut ctx.svm, &[settle_ix], &ctx.trader, &[]).unwrap();

    // A stranger with no stake in this market at all -- never bought,
    // never sold, has nothing to do with the trader or the creator.
    let stranger = Keypair::new();
    ctx.svm.airdrop(&stranger.pubkey(), 10 * LAMPORTS_PER_SOL).unwrap();

    let position: TraderPosition = fetch(&ctx.svm, &ctx.trader_position);
    let trader_balance_before = ctx.svm.get_balance(&ctx.trader.pubkey()).unwrap();
    let stranger_balance_before = ctx.svm.get_balance(&stranger.pubkey()).unwrap();

    let force_redeem_ix = Instruction::new_with_bytes(
        candl::id(),
        &candl::instruction::ForceRedeem { shares: position.shares }.data(),
        candl::accounts::ForceRedeem {
            market: ctx.market,
            bonding_curve: ctx.bonding_curve,
            vault: ctx.vault,
            trader_position: ctx.trader_position,
            trader: ctx.trader.pubkey(),
            caller: stranger.pubkey(),
            escrow: ctx.escrow,
            nft_mint: ctx.nft_mint.pubkey(),
            creator_token_account: ctx.creator_return_token_account.pubkey(),
            creator: ctx.creator.pubkey(),
            token_program: spl_token::id(),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );
    // The stranger pays and signs -- the trader signs nothing at all.
    send(&mut ctx.svm, &[force_redeem_ix], &stranger, &[]).unwrap();

    let market: Market = fetch(&ctx.svm, &ctx.market);
    assert_eq!(market.state, MarketState::Settled, "market must reach Settled even though the trader never redeemed themselves");

    let trader_balance_after = ctx.svm.get_balance(&ctx.trader.pubkey()).unwrap();
    assert!(trader_balance_after > trader_balance_before, "the trader -- not the stranger -- must receive the payout");

    let stranger_balance_after = ctx.svm.get_balance(&stranger.pubkey()).unwrap();
    assert!(
        stranger_balance_after <= stranger_balance_before,
        "the stranger must only ever be out the network fee, never receive any part of the trader's payout"
    );

    let creator_nft_account =
        SplTokenAccount::unpack(&ctx.svm.get_account(&ctx.creator_return_token_account.pubkey()).unwrap().data).unwrap();
    assert_eq!(creator_nft_account.amount, 1, "NFT must still return to the creator via a stranger-triggered redemption");
}

/// The `trader` account is constrained to trader_position.trader, so nobody
/// can point the payout at their own wallet while redeeming someone else's
/// shares -- this is the property that makes the instruction safe to leave
/// permissionless in the first place.
#[test]
fn force_redeem_rejects_a_mismatched_trader_account() {
    let mut ctx = setup();
    let buy = buy_ix(&ctx, 100, 10 * LAMPORTS_PER_SOL);
    send(&mut ctx.svm, &[buy], &ctx.trader, &[]).unwrap();

    let mut clock: anchor_lang::prelude::Clock = ctx.svm.get_sysvar();
    clock.unix_timestamp += 8 * ONE_DAY;
    ctx.svm.set_sysvar(&clock);

    let settle_ix = Instruction::new_with_bytes(
        candl::id(),
        &candl::instruction::Settle {}.data(),
        candl::accounts::Settle { market: ctx.market, bonding_curve: ctx.bonding_curve }.to_account_metas(None),
    );
    send(&mut ctx.svm, &[settle_ix], &ctx.trader, &[]).unwrap();

    let stranger = Keypair::new();
    ctx.svm.airdrop(&stranger.pubkey(), 10 * LAMPORTS_PER_SOL).unwrap();

    let position: TraderPosition = fetch(&ctx.svm, &ctx.trader_position);
    // Attempt to redirect the trader's payout to the stranger's own wallet
    // instead of the trader's -- trader_position still seeds/derives to the
    // real trader, so this must be rejected outright.
    let bad_force_redeem_ix = Instruction::new_with_bytes(
        candl::id(),
        &candl::instruction::ForceRedeem { shares: position.shares }.data(),
        candl::accounts::ForceRedeem {
            market: ctx.market,
            bonding_curve: ctx.bonding_curve,
            vault: ctx.vault,
            trader_position: ctx.trader_position,
            trader: stranger.pubkey(),
            caller: stranger.pubkey(),
            escrow: ctx.escrow,
            nft_mint: ctx.nft_mint.pubkey(),
            creator_token_account: ctx.creator_return_token_account.pubkey(),
            creator: ctx.creator.pubkey(),
            token_program: spl_token::id(),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );
    let result = send(&mut ctx.svm, &[bad_force_redeem_ix], &stranger, &[]);
    assert!(result.is_err(), "redirecting a redemption to a mismatched trader account must fail");
}
