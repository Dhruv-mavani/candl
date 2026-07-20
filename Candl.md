https://ethereum.org/real-world-assets/

# Candl — Founder Questionnaire

> This document captures the identity, vision, philosophy, and principles of Candl.
> Every answer here shapes the protocol, the engineering, and the culture.

---

## Section 1 — Identity

**Q1. What is Candl in one sentence?**

Candl is a decentralized market protocol on Solana that enables continuous price discovery and instant liquidity for unique digital assets using bonding curves.

---

**Q2. What is Candl in one paragraph?**

_(Explain to someone who has never heard of NFTs or bonding curves.)_

Imagine you create a unique piece of digital art. Today, if you want to sell it, you list it on a marketplace and wait — maybe nobody buys it for weeks. Candl changes that completely. When you bring your digital art to Candl, it automatically creates a market around it. Anyone can buy into it instantly, and anyone can sell out instantly, at any time. The price moves up when people buy and moves down when people sell, determined by a mathematical formula called a bonding curve. Every trade generates a live chart — the same kind of candlestick chart stock traders use. So instead of your art sitting on a shelf waiting for a buyer, it becomes a continuously tradable financial asset with real-time pricing, analytics, and liquidity — all powered by code running on the Solana blockchain, with no middlemen.

---

**Q3. What problem does Candl solve?**

NFTs today suffer from a fundamental liquidity problem. Traditional NFT marketplaces are based on listings: an owner sets a price, lists the NFT, and waits for a buyer. This creates several problems:

- **No price discovery.** There is no continuous market to determine what an NFT is actually worth at any given moment.
- **No instant liquidity.** Sellers can wait days, weeks, or months for a buyer.
- **No trading experience.** Unlike tokens, NFTs have no charts, no volume data, no analytics, no depth — they feel like static collectibles, not financial assets.
- **Floor price dependency.** The only pricing signal for NFT collections is the floor price, which says nothing about individual pieces.

Candl solves all of these by giving every individual NFT its own automated market maker (bonding curve), so it can be bought and sold instantly, with a live price, live chart, and full analytics — just like a token on DexScreener.

---

**Q4. Why did you decide to build Candl?**

_(What frustrated you enough to think this should exist?)_

The frustration came from seeing the massive gap between how tokens and NFTs are treated in crypto. Tokens have instant liquidity, live charts, analytics, trading indicators, volume profiles, and price discovery from the moment they launch (thanks to AMMs and platforms like Pump.fun). NFTs have none of that. They sit on marketplaces like static listings on eBay. The infrastructure that makes tokens tradable and exciting simply doesn't exist for unique assets. Candl exists because NFTs deserve the same trading infrastructure that tokens have — and nobody has built it properly on Solana yet.

---

**Q5. If Candl succeeds, what changes in Web3?**

If Candl succeeds:

- Every unique digital asset becomes a continuously tradable financial instrument.
- Artists launch NFTs the way token creators launch memecoins — with instant markets, instant liquidity, and live charts from minute one.
- The concept of "listing an NFT and waiting for a buyer" becomes obsolete.
- Developers have an open protocol and SDK to create bonding-curve markets for any unique asset — digital art, game items, music rights, domain names, event tickets, AI-generated assets, real-world assets.
- NFTs stop being collectibles and start being markets.
- A new category of financial infrastructure emerges on Solana: liquidity infrastructure for non-fungible assets.

---

## Section 2 — Vision

**Q6. What is Candl's long-term vision?**

_(Forget V1. Imagine Candl after 10 years.)_

Candl is the liquidity layer for all non-fungible assets on Solana — and eventually, across chains.

In 10 years, Candl is not a website. It is infrastructure. Like Metaplex is the standard for NFT metadata, Candl is the standard for NFT liquidity. Every application that needs to create a market around a unique asset uses Candl's protocol or SDK. The website is just one frontend among hundreds built on top of the protocol.

The protocol supports multiple asset types beyond digital art: game items, music royalties, real-world asset representations, AI-generated content, domain names, event tickets. Each asset has its own bonding curve, its own chart, its own analytics. Developers build custom frontends, trading bots, portfolio trackers, and analytics dashboards on top of Candl's public API and SDK.

Governance is decentralized. The protocol evolves through community proposals. A plugin system allows third-party developers to extend functionality. Candl is to NFT trading what Uniswap was to token trading — the protocol that made it possible.

---

**Q7. How do you want people to describe Candl?**

"Candl is the protocol that turned NFTs into tradable markets."

"Candl is Pump.fun for unique assets."

"Candl is the liquidity infrastructure layer for non-fungible assets on Solana."

"Candl made NFT trading feel like stock trading."

---

**Q8. What do you NOT want Candl to become?**

- Another generic NFT marketplace (like OpenSea or Magic Eden).
- A PFP collection launchpad.
- A speculative casino with no real utility.
- A closed-source product that can't be built upon.
- A monolithic application that tries to do everything in one codebase.
- A hackathon project or portfolio piece — it should be production-grade infrastructure.

---

**Q9. If someone copies Candl, what can they NOT copy?**

_(Think philosophy.)_

They cannot copy the philosophy of documentation before code, economics before architecture, and protocol before frontend. They cannot copy the disciplined development process where every feature is designed, documented, and reviewed before a single line of code is written. They cannot copy the engineering culture that treats this like a seed-stage startup building foundational Solana infrastructure, not a weekend project. They cannot copy the long-term thinking that prioritizes maintainability over speed, modularity over convenience, and protocol-level design over application-level shortcuts.

---

## Section 3 — Mission

**Q10. Why should creators use Candl?**

Because Candl gives creators something no other platform offers: instant, continuous liquidity for their work from the moment they launch. Instead of listing an NFT and hoping someone buys it, a creator deposits their NFT into Candl and a market is automatically created. Buyers can purchase instantly. The price moves with demand. The creator earns royalties on every trade — not just the first sale, but every buy and every sell. The creator also gets a professional market page with a live chart, analytics, volume data, and holder information — turning their art into a living financial asset.

---

**Q11. Why should traders use Candl?**

Because Candl transforms NFTs from static collectibles into actively tradable assets. Traders get:

- Instant buy and sell execution against the bonding curve — no waiting for counterparties.
- Live candlestick charts built from on-chain trades.
- Full market analytics: volume, market cap, holder distribution, depth, liquidity, price impact estimation, slippage calculation.
- The same trading experience they expect from DexScreener or TradingView, but for individual NFTs.
- The ability to trade NFT markets the way they trade token markets.

---

**Q12. Why should developers build on Candl?**

Because Candl is designed as a protocol, not an application. Developers get:

- An open-source Anchor program they can interact with directly.
- A TypeScript SDK for creating markets, executing trades, and querying state.
- A public REST API and WebSocket API for real-time data.
- A modular architecture where every service is independent and replaceable.
- Clear documentation, types, and examples.
- The ability to build custom frontends, trading bots, portfolio trackers, analytics dashboards, and integrations on top of Candl's infrastructure.

Candl is to NFT liquidity what Metaplex is to NFT metadata — foundational infrastructure that other developers build on top of.

---

**Q13. Why should investors care?**

_(Not VC investors. Protocol users.)_

Because Candl creates a new asset class: continuously tradable NFT markets. Every NFT on Candl has transparent, on-chain pricing. Every trade updates the reserve. Every market has verifiable liquidity. The bonding curve ensures that there is always a price and always liquidity — no rug pulls from empty order books. The protocol's fee structure means that value flows to creators (royalties), the protocol treasury (fees), and traders (price appreciation). Users can see exactly where their money is and what it's worth at all times.

---

## Section 4 — Philosophy

**Q14. What principles should NEVER be broken?**

1. **Documentation before code.** Every feature is designed and documented before implementation begins.
2. **Economics before architecture.** The economic model must be sound before the technical architecture is designed around it.
3. **Protocol before frontend.** The on-chain program and SDK must work independently of any website.
4. **Simplicity over cleverness.** Prefer readable code over clever code. If a simpler solution exists with similar performance, choose it.
5. **Modularity over monoliths.** Every feature lives in its own module. Every service owns one responsibility.
6. **Security over speed.** Never sacrifice security for faster development. Validate everything. Handle overflow, underflow, invalid accounts, and replay attacks.
7. **Long-term maintainability over short-term convenience.** Choose the architecture that would be easiest to maintain five years from now.
8. **Open source over closed source.** The protocol, SDK, and core infrastructure should always be open source.
9. **Event-driven over tightly coupled.** Systems react to events, not direct calls. This enables scaling and loose coupling.
10. **On-chain truth, off-chain computation.** The blockchain is the source of truth for ownership, trades, and reserves. Charts, analytics, and search are computed off-chain.

---

**Q15. If a feature violates one of these principles, what should happen?**

The feature is redesigned before implementation. No exceptions. If a principle is violated and the code is already written, it is refactored. These principles exist specifically to prevent the kind of technical debt that kills projects. If there is ever a conflict between shipping faster and maintaining these principles, the principles win.

---

**Q16. What's more important? Rank them.**

1. **Security** — A protocol that handles money must be secure above all else.
2. **Economics** — The economic model must be sound. A secure protocol with broken economics is useless.
3. **Transparency** — Users must always be able to verify what's happening with their assets.
4. **Developer Experience** — The protocol must be easy to build on. Good DX attracts contributors and integrations.
5. **Speed** — Performance matters, but only after security, economics, transparency, and DX are solid.

---

## Section 5 — Design

**Q17. Why temporary markets instead of permanent?**

Markets in Candl have a duration because it creates urgency, narrative, and a clear lifecycle. A temporary market has a beginning (creation), a middle (active trading), and an end (settlement). This structure:

- Creates natural trading pressure as the expiry approaches.
- Prevents stale, abandoned markets from cluttering the platform.
- Gives creators control over how long their market runs.
- Allows for a clean settlement phase where final positions are resolved.
- Enables the "Story Curve" concept where the market itself tells a story through its price action.

Markets can be extended but never shortened — this protects traders who entered with certain time expectations.

---

**Q18. Why Market Shares instead of NFTs?**

When you buy into a Candl market, you don't buy the NFT itself. You buy **market shares** — units of ownership in that market's bonding curve. This design choice is critical because:

- It enables fractional participation. You don't need to buy the entire NFT.
- It enables continuous trading. Shares can be bought and sold at any time against the curve.
- It creates a familiar financial mental model — shares, like stocks.
- The NFT itself can remain with the creator (or locked in the protocol), while market participants trade exposure to its value.
- It avoids the complexity of fractional NFT ownership and redemption.

---

**Q19. Why Market Duration?**

Market duration serves multiple purposes:

- It creates a finite trading window, which generates urgency and activity.
- It prevents the protocol from being littered with inactive, zero-volume markets.
- It gives creators a defined period to generate attention and trading around their work.
- It enables a clear settlement mechanism at the end.
- It makes each market a discrete event — like an IPO with a defined trading period.

---

**Q20. Why Settlement Phase?**

The settlement phase is the period after a market's active trading window closes. During settlement:

- No new buys are allowed.
- Remaining shareholders can redeem their shares for a proportional amount of the reserve.
- The creator receives their earnings (royalties accumulated during trading).
- The market resolves cleanly, with no ambiguity about who owns what.

This ensures every market has a definitive conclusion, unlike traditional NFT listings that can sit forever.

---

**Q21. Why can markets be extended but never shortened?**

This is a trust and fairness principle. If a trader buys shares in a market expecting it to run for 30 days, shortening it to 7 days would betray that expectation. It could enable manipulation — a creator could shorten a market right before the price crashes.

Extending is different: it gives the market more time, which benefits all participants. No one is harmed by having more time to trade. The asymmetry is intentional: protect traders from sudden endings, allow creators to give more time when their market is thriving.

---

## Section 6 — Candl Promise

**Q22. Candl promises creators that...**

...their work will have instant liquidity from the moment the market opens. They will earn royalties on every trade — not just the first sale, but every buy and every sell. They will have a professional market page with live charts, analytics, and real-time data. They will never need to negotiate a price or find a buyer manually. The protocol will handle pricing, trading, and settlement automatically.

---

**Q23. Candl promises traders that...**

...they can buy and sell instantly against the bonding curve at a transparent, mathematically determined price. They will always know the current price, the reserve balance, the liquidity available, and the price impact of their trade before they execute it. Every trade is on-chain and verifiable. The slippage they see is the slippage they get. No hidden fees. No manipulation by market makers. The bonding curve is the market maker, and it treats everyone equally.

---

**Q24. Candl promises developers that...**

...the protocol is open source, well-documented, and designed to be built upon. The SDK is clean, typed, and maintained. The API is stable, versioned, and comprehensive. Every module is independent and replaceable. The architecture follows clear boundaries between on-chain logic, off-chain services, and frontend. Developers can build custom trading interfaces, bots, analytics tools, and integrations without touching Candl's core code.

---

**Q25. Candl DOES NOT promise...**

- Guaranteed profits for traders. Bonding curves ensure liquidity, not returns.
- Permanent markets. Markets have durations and settlement phases.
- Ownership of the underlying NFT. Buying shares gives you exposure to the market, not the NFT itself.
- Protection against price decline. If more people sell than buy, the price goes down.
- That every NFT will have an active market. Liquidity depends on demand.
- Immunity from smart contract risk. Despite rigorous testing and auditing, on-chain code carries inherent risk.

---

## Section 7 — Project Goals

**Q26. What are Candl's goals for V1?**

V1 is the smallest product that proves the protocol works. It includes:

- Create market (deposit NFT, configure bonding curve, set duration)
- Buy shares (instant purchase against the bonding curve)
- Sell shares (instant sale back to the bonding curve)
- Bonding curve engine (constant product with virtual reserves)
- NFT market page (price, chart, analytics, trade history)
- Live candlestick chart (generated from on-chain trade events)
- Wallet connection (Phantom, Solflare, Backpack)
- Basic analytics (volume, price history, holder count, reserve balance)
- Market discovery page (trending, new, hot markets)

Nothing more. V1 proves that the concept works and that the architecture supports it.

---

**Q27. What are NOT V1 goals?**

- Multiple bonding curve types (V1 uses one curve: constant product with virtual reserves)
- Creator dashboard
- Portfolio page
- Price alerts or notifications
- Advanced analytics (RSI, MACD, VWAP, etc.)
- SDK
- Public API
- Search
- Recommendations
- Leaderboards
- Mobile app
- Governance
- Plugin system
- Multi-asset support
- Cross-chain anything

---

**Q28. What belongs in V2?**

V2 is advanced trading and creator tools:

- Creator dashboard (earnings, market performance, analytics)
- Multiple bonding curve types (linear, quadratic, sigmoid, custom)
- Dynamic Story Curve (narrative-driven curve visualization)
- Better analytics (volume profile, price impact estimator, depth chart)
- Portfolio page (track all your positions across markets)
- Price alerts and notifications
- Market extension by creator
- Improved chart with technical indicators

---

**Q29. What belongs in Future Ideas?**

These are documented in `docs/16-future-ideas.md` and are NOT implemented until explicitly approved:

- SDK and public API (V3)
- Embeddable widgets and white-label markets (V3)
- Third-party integrations (V3)
- Governance and DAO (V4+)
- Plugin system (V4+)
- Multi-asset support beyond NFTs (V4+)
- Cross-chain research (V4+)
- Mobile application
- Derivatives and futures markets
- Launchpad features
- Social features (following creators, commenting)
- AI-powered market analysis
- Market bundles / index funds of NFT markets

---

## Section 8 — Open Source

**Q30. Why should Candl be open source?**

Because Candl is infrastructure, not an application. Infrastructure protocols on Solana succeed when they are open source — Metaplex, Anchor, Jupiter, Helius. Open source enables:

- Trust. Users can verify the smart contract code.
- Adoption. Developers can build on top of the protocol.
- Contribution. Engineers can improve the codebase.
- Transparency. The community can audit the economics and security.
- Longevity. Open source projects outlive closed-source products.

If Candl is going to become the liquidity layer for non-fungible assets, it must be open and permissionless.

---

**Q31. What kind of contributors do you want?**

- **Solana developers** who understand on-chain programs, Anchor, and PDAs.
- **Backend engineers** who can build indexers, event pipelines, and APIs.
- **Frontend developers** who care about beautiful, performant UIs.
- **Protocol designers** who think about economics, incentives, and game theory.
- **Security researchers** who can find and report vulnerabilities.
- **Technical writers** who can maintain and improve documentation.
- **Anyone** who reads the documentation, understands the vision, and wants to contribute thoughtfully.

---

**Q32. What coding standards should contributors follow?**

- Small files, small functions.
- Explicit types. No `any`. No implicit returns for complex logic.
- Readable names over clever abbreviations.
- No magic numbers — use named constants.
- No duplicated logic — extract shared code into modules.
- Every module has tests.
- Every architectural decision is documented in `docs/15-decisions.md`.
- Documentation before code. If a feature isn't documented, it isn't ready to be implemented.
- Follow the existing project structure. Don't create new top-level directories without discussion.
- Use consistent naming conventions throughout the codebase.

---

## Section 9 — Engineering

**Q33. How should new features be added?**

Every new feature follows this lifecycle:

```
Idea → Discussion → Documentation → Architecture → Implementation → Testing → Review
```

No exceptions. The idea is discussed first. Then it is documented in the appropriate `docs/` file. Then the architecture is reviewed to ensure it fits within the existing system. Then — and only then — is it implemented. After implementation, it is tested and reviewed.

---

**Q34. When should code be written?**

Code should be written only after:

1. The feature has been discussed and approved.
2. The documentation for the feature exists (what it does, why it exists, how it works).
3. The architecture has been reviewed (where does this belong? what does it depend on? can it be reused?).
4. The economic implications have been considered (if applicable).

Never write code to "figure out the design." Design first, then implement.

---

**Q35. When should architecture change?**

Architecture should change when:

- A new requirement fundamentally cannot be supported by the current design.
- A clear simplification is possible without sacrificing capability.
- A security concern requires structural changes.
- Performance testing reveals bottlenecks that require architectural intervention.

Architecture should NOT change for:

- Individual feature requests that can be handled within the existing structure.
- Stylistic preferences.
- Premature optimization.

When architecture does change, it is documented in `docs/15-decisions.md` with the reasoning and trade-offs.

---

**Q36. What documents must exist before implementation?**

Before any module is implemented, the following must exist:

- **Purpose**: Why does this module exist?
- **Responsibilities**: What does this module do? What does it NOT do?
- **Files**: What files will this module contain?
- **Dependencies**: What does this module depend on?
- **API surface**: What does this module expose to other modules?
- **Future extensibility**: How might this module need to change in the future?

This is documented either in the relevant `docs/` file or as a module README.

---

## Section 10 — Project Rules

**Q37. Candl is NOT...**

- Not an NFT marketplace.
- Not a PFP launchpad.
- Not a meme token platform.
- Not a social network.
- Not a hackathon project.
- Not a monolithic application.
- Not a closed-source product.
- Not a quick flip.
- Not just a website.
- Not a copy of OpenSea, Magic Eden, or Blur.
- Not a weekend project.
- Not optimized for short-term convenience.

---

**Q38. Candl IS...**

- A protocol.
- Open source infrastructure.
- A decentralized market protocol for unique assets.
- Liquidity infrastructure for non-fungible assets.
- An automated market maker for individual NFTs.
- A system where every unique asset gets its own bonding curve, live chart, and analytics.
- Built on Solana with Anchor.
- Modular, event-driven, and designed for scale.
- Documentation-first.
- Security-first.
- Built to be maintained by a team of engineers for years.
- The kind of project that would make a Solana Foundation engineer say, "This is thoughtfully designed."

---

**Q39. Every contributor must remember...**

- We are building a protocol, not a website.
- Documentation comes before code.
- Economics comes before architecture.
- Every module owns one responsibility.
- Every piece of data has exactly one owner.
- If a simpler solution exists, use it.
- If a feature isn't documented, it isn't ready.
- If an implementation decision is unclear, choose the architecture that would be easiest to maintain five years from now.
- The chain is the source of truth. Off-chain services are for computation and display.
- Never trust client input. Validate everything on-chain.

---

**Q40. If there is a disagreement, how should decisions be made?**

1. Refer to the principles in this document. If a principle clearly applies, follow it.
2. If the principles don't resolve it, evaluate both options against the question: "Which option is easier to maintain five years from now?"
3. If still unclear, document both options in `docs/15-decisions.md` with their trade-offs and choose the simpler one.
4. The founder (Dhruv) has final say on product and vision decisions.
5. For technical decisions, the reasoning must be documented. No decisions by authority alone — the reasoning must stand on its own.

---

## Section 11 — Personal

**Q41. What do you personally want Candl to become?**

I want Candl to become real Solana infrastructure — something the ecosystem actually uses, like Metaplex, Jupiter, or Helius. Not a demo project. Not a portfolio piece. Something that other developers build on top of. Something that changes how people think about NFTs. I want to build something that proves I can design and ship protocol-level software, not just consume APIs.

---

**Q42. Five years from now, what do you want someone to say after reading the Candl repository?**

"This was built by someone who understood protocol design. The documentation is excellent. The architecture is clean. The code is maintainable. This wasn't a weekend project — this was thoughtfully engineered from day one."

---

**Q43. Why are you building this instead of another AI startup?**

Because the crypto ecosystem — especially Solana — has a genuine gap in NFT trading infrastructure. The problem is real, the solution is technically interesting, and the intersection of NFTs, AMMs, and trading infrastructure is an underexplored design space. Building a protocol that solves a real infrastructure problem is more compelling than building another AI wrapper. This is the kind of project where the engineering itself is the product.

---

**Q44. What does success mean for Candl?**

Success means:

- The protocol works on mainnet with real users and real SOL.
- Developers use the SDK to build integrations.
- The Solana ecosystem recognizes Candl as legitimate infrastructure.
- The codebase is clean enough that new contributors can onboard in a day.
- The documentation is complete enough that someone can understand Candl without reading code.
- At least one market has enough trading volume to produce a meaningful candlestick chart.

---

**Q45. Complete this sentence: Candl exists because...**

Candl exists because every unique digital asset deserves the same liquidity, price discovery, and trading experience that fungible tokens have — and nobody has built that properly on Solana yet.

---

## BONUS QUESTIONS (Founder)

_(These won't necessarily go into official docs, but they shape the protocol.)_

**Q46. What's the biggest fear you have about Candl?**

That the economic model doesn't create enough incentive for traders to participate. A bonding curve only works if people actually trade. If markets launch and nobody buys, the protocol is useless. The fear is building technically excellent infrastructure that nobody uses because the incentives aren't compelling enough.

---

**Q47. What's the biggest thing that excites you?**

The idea that someone could open an NFT page on Candl and see a live candlestick chart, volume data, holder analytics, and price history — the same experience they'd get opening a token on DexScreener — but for a single, unique piece of art. That doesn't exist today. Building it is genuinely exciting.

---

**Q48. What feature do you think people will remember Candl for?**

The live candlestick chart on every NFT. That's the signature feature — the thing that makes Candl visually and conceptually distinct from every other NFT platform. When someone sees a candlestick chart on an NFT for the first time, they'll immediately understand what Candl is.

---

**Q49. If Candl becomes one of the biggest protocols on Solana, what made it successful?**

Three things:

1. **The protocol design.** Clean, modular, open source. Other developers could build on it.
2. **The documentation.** People could understand Candl without reading code. Contributors could onboard quickly.
3. **The positioning.** Candl wasn't "another NFT marketplace." It was liquidity infrastructure for non-fungible assets. That distinction attracted developers, not just users.

---

**Q50. What's one sentence you want every engineer on Candl to believe?**

"We are building infrastructure that the Solana ecosystem will use for years — so every line of code, every architectural decision, and every document should reflect that."
