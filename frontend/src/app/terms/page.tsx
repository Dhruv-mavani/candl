"use client";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <Link href="/">
        <button className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-emerald-500 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>
      </Link>

      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl p-8 md:p-12 shadow-xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-sky-100 dark:bg-sky-500/10 rounded-2xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Terms of Service</h1>
            <p className="text-slate-500 dark:text-slate-400">Last updated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-slate-600 dark:text-slate-300">
          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">1. Agreement to Terms</h2>
            <p>
              By accessing or using the Candl interface (the "Interface"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Interface.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">2. Interface vs. Protocol</h2>
            <p>
              The Interface provides a convenient web-based frontend to interact with the Candl Protocol, which is a decentralized, open-source set of smart contracts deployed on the Solana blockchain.
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li><strong>Non-Custodial:</strong> The Interface and the Candl core team do not have custody or control over your digital assets. All transactions are peer-to-contract and executed directly by your wallet.</li>
              <li><strong>Immutability:</strong> The Candl Protocol is deployed on-chain. We cannot reverse, cancel, or refund any transaction once it is confirmed on the Solana blockchain.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">3. Asset Verification & Risks</h2>
            <p>
              The Candl Protocol is strictly <strong>asset-agnostic</strong>. It does not natively verify the authenticity, legality, or intellectual property rights of any NFT deposited into a market.
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li><strong>Fake Assets:</strong> Anyone can create a market for any NFT. You are solely responsible for verifying the authenticity of an NFT (e.g., checking Metaplex Certified Collections) before trading its shares.</li>
              <li><strong>Slippage & MEV:</strong> Due to the nature of bonding curves and public mempools, you acknowledge the risks of slippage, sandwich attacks, and front-running by MEV searchers. You are responsible for utilizing appropriate slippage tolerances.</li>
              <li><strong>Smart Contract Risk:</strong> While the protocol is designed with strict arithmetic safety and undergoes auditing, you acknowledge that interacting with smart contracts inherently carries the risk of exploits, hacks, or undiscovered bugs.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">4. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by applicable law, Candl and its contributors shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, use, goodwill, or other intangible losses resulting from:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li>Your access to or use of or inability to access or use the Interface.</li>
              <li>Any unauthorized access, use, or alteration of your transmissions or content.</li>
              <li>Any bugs, viruses, or the like that may be transmitted to or through the Interface.</li>
              <li>Any loss of digital assets due to smart contract vulnerabilities or user error.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">5. User Conduct</h2>
            <p>
              You agree not to engage in any activity that interferes with or disrupts the Interface or the servers and networks connected to the Interface. You agree not to use the Interface to engage in money laundering, terrorist financing, or any other illegal activities.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">6. Modifications to Terms</h2>
            <p>
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. What constitutes a material change will be determined at our sole discretion.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
