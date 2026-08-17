"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/common/label";
import { Textarea } from "@/components/common/textarea";
import { CandlLogo } from "@/components/common/CandlLogo";
import { joinWaitlist } from "@/lib/api";

export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [twitter, setTwitter] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Give us your name.");
      return;
    }
    if (!email.trim()) {
      setError("An email is required so we can reach you.");
      return;
    }

    setSubmitting(true);
    try {
      await joinWaitlist({
        email: email.trim(),
        name: name.trim(),
        twitter: twitter.trim() || undefined,
        walletAddress: walletAddress.trim() || undefined,
        message: message.trim() || undefined,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-lg">
      <Link href="/">
        <button type="button" className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-emerald-500 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>
      </Link>

      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl p-8 md:p-10 shadow-xl">
        <div className="flex flex-col items-center text-center gap-3 mb-8">
          <CandlLogo className="w-28 h-auto text-slate-900 dark:text-white" />
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Join the Waitlist</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">
            Candl is still in development. Leave your details and we&apos;ll let you know the moment trading opens.
          </p>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            <p className="font-semibold text-slate-900 dark:text-white">You&apos;re on the list</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">We&apos;ll email you as soon as Candl is ready.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="wl-name">Name</Label>
              <Input
                id="wl-name"
                placeholder="Your name"
                value={name}
                disabled={submitting}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="wl-email">Email</Label>
              <Input
                id="wl-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                disabled={submitting}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="wl-twitter">X / Twitter handle (optional)</Label>
              <Input
                id="wl-twitter"
                placeholder="@yourhandle"
                value={twitter}
                disabled={submitting}
                onChange={(e) => setTwitter(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="wl-wallet">Solana wallet address (optional)</Label>
              <Input
                id="wl-wallet"
                placeholder="Your public key"
                value={walletAddress}
                disabled={submitting}
                onChange={(e) => setWalletAddress(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="wl-message">Anything else? (optional)</Label>
              <Textarea
                id="wl-message"
                placeholder="What are you most excited to trade?"
                value={message}
                disabled={submitting}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={submitting} className="w-full mt-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Join Waitlist
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
