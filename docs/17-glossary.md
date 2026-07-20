# Glossary

> This document defines the terminology used throughout the Candl protocol and documentation. Use these terms consistently in code, APIs, and UI.

---

**Bonding Curve**: A mathematical formula that sets the price of an asset based on its available supply. In Candl, it ensures continuous liquidity.

**Candle / Candlestick**: An aggregation of trade data over a specific time interval, representing the Open, High, Low, and Close (OHLC) prices, as well as volume.

**Creator**: The owner of the NFT who deposits it into the protocol and initializes the market.

**Duration**: The total time a market is scheduled to remain in the `Active` state.

**Escrow**: The Program Derived Address (PDA) that holds the NFT while the market is active or settling.

**Market**: The core concept in Candl. A self-contained trading environment for a single unique NFT, governed by a bonding curve.

**Market Shares**: The units of exposure traders buy and sell. They represent a position in the market's bonding curve and can be redeemed for a portion of the reserve during settlement.

**Price Impact**: The difference between the current spot price and the actual execution price of a trade, caused by the trade's size moving the bonding curve.

**Redemption**: The process of exchanging Market Shares for a proportional amount of SOL from the vault during the `Settling` phase.

**Reserve (Real)**: The actual SOL balance held in the market's vault, collected from trades.

**Reserve (Virtual)**: The theoretical balances (Virtual SOL and Virtual Tokens) used purely by the bonding curve math to determine the current price.

**Settlement**: The final phase of a market's lifecycle. Active trading ceases, shareholders redeem their shares for SOL, the creator claims royalties, and the NFT is eventually returned.

**Slippage**: The difference between the expected price of a trade and the price at which it actually executes (often caused by other trades occurring between transaction creation and execution).

**Trader**: A user who buys or sells Market Shares.

**Vault**: The Program Derived Address (PDA) that holds the Real Reserve (SOL) for a market.
