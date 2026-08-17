"use client";
import { useEffect, useState } from "react";
import { Loader2, LogOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/common/label";
import { getWaitlistEntries, type WaitlistEntry } from "@/lib/api";

const SESSION_KEY = "candl-admin-secret";

export default function AdminWaitlistPage() {
  const [secret, setSecret] = useState("");
  const [secretInput, setSecretInput] = useState("");
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) setSecret(stored);
  }, []);

  const load = async (withSecret: string) => {
    setLoading(true);
    setError(null);
    try {
      const rows = await getWaitlistEntries(withSecret);
      setEntries(rows);
      sessionStorage.setItem(SESSION_KEY, withSecret);
      setSecret(withSecret);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load waitlist.");
      sessionStorage.removeItem(SESSION_KEY);
      setSecret("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (secret) load(secret);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (secretInput.trim()) load(secretInput.trim());
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setSecret("");
    setEntries([]);
    setSecretInput("");
  };

  if (!secret) {
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Waitlist</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{entries.length} signup{entries.length === 1 ? "" : "s"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => load(secret)} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4" /> Log out
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/40 dark:border-white/10 text-left text-slate-500 dark:text-slate-400">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">X / Twitter</th>
              <th className="px-4 py-3 font-medium">Wallet</th>
              <th className="px-4 py-3 font-medium">Message</th>
              <th className="px-4 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-white/20 dark:border-white/5 last:border-0">
                <td className="px-4 py-3 text-slate-900 dark:text-white whitespace-nowrap">{entry.name}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{entry.email}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{entry.twitter ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono text-xs whitespace-nowrap">
                  {entry.walletAddress ?? "—"}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">{entry.message ?? "—"}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {new Date(entry.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {!loading && entries.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
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
