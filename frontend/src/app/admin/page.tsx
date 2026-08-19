"use client";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { Coins, Layers, Loader2, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/common/label";
import { getWaitlistEntries, getProtocolStats, type WaitlistEntry } from "@/lib/api";

const glass =
  "bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl";

function lamportsToSol(value: number) {
  return value / 1e9;
}

const SESSION_KEY = "candl-admin-secret";

export default function AdminPage() {
  const { data: protocolStats } = useSWR("/api/v1/protocol/stats", getProtocolStats, { refreshInterval: 15000 });
  // "checking" avoids flashing the unlock form while a stored secret is
  // still being validated against the backend on mount/navigation.
  const [status, setStatus] = useState<"checking" | "locked" | "unlocked">("checking");
  const [secret, setSecret] = useState("");
  const [secretInput, setSecretInput] = useState("");
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unlock = async (withSecret: string) => {
    setLoading(true);
    setError(null);
    try {
      const rows = await getWaitlistEntries(withSecret);
      setWaitlistEntries(rows);
      sessionStorage.setItem(SESSION_KEY, withSecret);
      setSecret(withSecret);
      setStatus("unlocked");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unlock.");
      sessionStorage.removeItem(SESSION_KEY);
      setSecret("");
      setStatus("locked");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      unlock(stored);
    } else {
      setStatus("locked");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (secretInput.trim()) unlock(secretInput.trim());
  };

  if (status === "checking") return null;

  if (status === "locked") {
    return (
      <div className="container mx-auto px-4 py-16 max-w-sm">
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl p-8 shadow-xl">
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white mb-6">Admin Access</h1>
          <form onSubmit={handleUnlock} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="admin-secret">Admin secret</Label>
              <Input
                id="admin-secret"
                type="password"
                value={secretInput}
                onChange={(e) => setSecretInput(e.target.value)}
                disabled={loading}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Unlock
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-6xl">
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-8">Admin Dashboard</h1>

      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      {/* Quick stats -- Waitlist and Protocol Earnings both already live in the top navbar, so this is a glance at real numbers instead of duplicate nav links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className={`p-4 ${glass}`}>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mb-1">
            <Coins className="w-3.5 h-3.5" />
            Protocol Earnings
          </div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
            {protocolStats ? `${lamportsToSol(protocolStats.totalProtocolEarnings).toFixed(6)} SOL` : "—"}
          </div>
        </div>

        <div className={`p-4 ${glass}`}>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Total Volume
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {protocolStats ? `${lamportsToSol(protocolStats.totalVolume).toFixed(4)} SOL` : "—"}
          </div>
        </div>

        <div className={`p-4 ${glass}`}>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mb-1">
            <Layers className="w-3.5 h-3.5" />
            Markets
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">{protocolStats?.totalMarkets ?? "—"}</div>
        </div>

        <div className={`p-4 ${glass}`}>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mb-1">
            <Users className="w-3.5 h-3.5" />
            Waitlist Signups
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">{waitlistEntries?.length ?? "—"}</div>
        </div>
      </div>

      {/* Recent signups */}
      <div className={`p-5 ${glass}`}>
        <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Recent Signups</h2>
        <div className="space-y-3">
          {waitlistEntries && waitlistEntries.length > 0 ? (
            waitlistEntries.slice(0, 5).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-4 text-sm">
                <div className="min-w-0">
                  <div className="font-medium text-slate-900 dark:text-white truncate">{entry.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{entry.email}</div>
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
                  {new Date(entry.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400">No signups yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
