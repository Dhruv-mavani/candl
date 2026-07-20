"use client";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <Link href="/">
        <button className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-emerald-500 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>
      </Link>

      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl p-8 md:p-12 shadow-xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Privacy Policy</h1>
            <p className="text-slate-500 dark:text-slate-400">Last updated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-slate-600 dark:text-slate-300">
          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">1. Introduction</h2>
            <p>
              Candl ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and disclose information when you access or use the Candl interface (the "Interface") which interacts with the decentralized Candl Protocol on the Solana blockchain.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">2. Blockchain Transparency</h2>
            <p>
              Please note that Candl operates on the public Solana blockchain. When you connect your wallet and execute transactions (e.g., buying or selling fractional NFT shares, creating markets), your public wallet address and the transaction data are permanently recorded on the blockchain. This data is public, immutable, and not controlled by us. It cannot be deleted or altered.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">3. Information We Collect</h2>
            <p>
              We adhere to a principle of data minimization. The Interface may collect:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li><strong>Public Blockchain Data:</strong> When you connect your wallet, we read your public wallet address to display your balances, portfolio, and transaction history.</li>
              <li><strong>Usage Data:</strong> We may collect anonymous, aggregated telemetry data regarding how users interact with the Interface to improve user experience. This does not include personally identifiable information (PII).</li>
            </ul>
            <p className="mt-2">We <strong>do not</strong> collect names, physical addresses, IP addresses for tracking, or traditional KYC data, as Candl is a non-custodial, decentralized protocol interface.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">4. Use of Information</h2>
            <p>
              The minimal information we gather is used strictly to:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li>Facilitate your interaction with the Candl Protocol.</li>
              <li>Provide customer support and respond to inquiries.</li>
              <li>Monitor and analyze trends, usage, and activities to improve the Interface.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">5. Third-Party Services</h2>
            <p>
              The Interface may use third-party RPC providers (e.g., Helius, Alchemy) to read data from and broadcast transactions to the Solana blockchain. These providers may collect technical data such as your IP address. Please review the privacy policies of your wallet provider (e.g., Phantom, Solflare) and any RPC nodes you utilize.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">6. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us through our official Discord or Twitter channels.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
