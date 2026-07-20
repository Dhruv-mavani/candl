# Security

> This document outlines the threat model and security practices for the Candl protocol.

---

## Threat Model

### 1. Reserve Draining
**Threat**: An attacker exploits the bonding curve math to withdraw more SOL than they are entitled to, draining the vault.
**Mitigation**:
- Strict integer arithmetic using checked math (`checked_add`, `checked_mul`, etc.).
- Never use floats.
- Ensure `VirtualSolReserve` and `RealSolReserve` invariant checks run at the end of every trade instruction.

### 2. Front-Running & Sandwich Attacks
**Threat**: MEV searchers see a user's `buy` transaction in the mempool, buy shares before them (driving the price up), and sell immediately after the user buys.
**Mitigation**:
- Slippage protection (`min_shares_out` for buys, `min_sol_out` for sells) is mandatory on all trades.
- Frontend must warn users if they set slippage > 5%.

### 3. Fake NFTs & Verification
**Threat**: A user creates a market using a counterfeit NFT to trick buyers.
**Mitigation**:
- The Candl protocol itself is asset-agnostic (it doesn't care if the NFT is fake).
- Mitigation happens at **Layer 2 / Layer 3**: The indexer and frontend must verify collection status via Metaplex Certified Collections before marking a market as "Verified". Unverified markets show heavy warnings.

### 4. Malicious Creator Exploits
**Threat**: A creator attempts to lock the market, steal SOL, or rug-pull.
**Mitigation**:
- The creator does not hold the vault keys; the PDA does.
- The creator cannot withdraw SOL.
- The creator cannot shorten the market duration, only extend it.

### 5. Rounding Errors
**Threat**: Attackers repeatedly buy/sell tiny amounts (dust) to extract value via rounding biases.
**Mitigation**:
- Always round in favor of the protocol. (e.g., round down the shares given to the buyer; round down the SOL given to the seller).

## Auditing

Before Mainnet launch:
1. Internal audit (comprehensive test suite, invariant fuzzing).
2. Public testnet deployment and bug bounty.
3. Formal audit by a top-tier Solana security firm (e.g., OtterSec, Neodyme, or similar).
