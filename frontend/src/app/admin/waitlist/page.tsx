"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/common/button";
import { getWaitlistEntries, type WaitlistEntry } from "@/lib/api";

const SESSION_KEY = "candl-admin-secret";

export default function AdminWaitlistPage() {
  const router = useRouter();
  const [secret, setSecret] = useState<string | null>(null);
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [expandedMessageId, setExpandedMessageId] = useState<number | null>(null);

  const handleCopy = (id: number, address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedId(id);
    setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1500);
  };

  const load = async (withSecret: string) => {
    setLoading(true);
    setError(null);
    try {
      const rows = await getWaitlistEntries(withSecret);
      setEntries(rows);
      setSecret(withSecret);
    } catch {
      // The stored secret is missing or no longer valid -- send them back to
      // /admin, the only place the unlock form lives.
      sessionStorage.removeItem(SESSION_KEY);
      router.replace("/admin");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      load(stored);
    } else {
      router.replace("/admin");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!secret) return null;

  return (
    <div className="container mx-auto px-4 py-16 max-w-7xl">
      <Link href="/admin">
        <button type="button" className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-emerald-500 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Admin
        </button>
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Waitlist</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{entries.length} signup{entries.length === 1 ? "" : "s"}</p>
        </div>

        <Button variant="outline" size="sm" onClick={() => load(secret)} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/40 dark:border-white/10 text-left text-slate-500 dark:text-slate-400">
              <th className="px-4 py-3 font-medium">Sr. No.</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">X / Twitter</th>
              <th className="px-4 py-3 font-medium">Wallet</th>
              <th className="px-4 py-3 font-medium">Message</th>
              <th className="px-4 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr key={entry.id} className="border-b border-white/20 dark:border-white/5 last:border-0">
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{index + 1}</td>
                <td className="px-4 py-3 text-slate-900 dark:text-white whitespace-nowrap">{entry.name}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{entry.email}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{entry.twitter ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono text-xs whitespace-nowrap">
                  {entry.walletAddress ? (
                    <div className="flex items-center gap-1.5">
                      <span>{entry.walletAddress}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(entry.id, entry.walletAddress!)}
                        aria-label="Copy wallet address"
                        className="text-slate-400 hover:text-emerald-500 transition-colors shrink-0"
                      >
                        {copiedId === entry.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
                <td
                  className={`px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs ${
                    entry.message && expandedMessageId !== entry.id ? "truncate cursor-pointer" : "whitespace-pre-wrap break-words"
                  }`}
                  title={entry.message ?? undefined}
                  onClick={() => entry.message && setExpandedMessageId((current) => (current === entry.id ? null : entry.id))}
                >
                  {entry.message ?? "—"}
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {new Date(entry.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {!loading && entries.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  No signups yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
