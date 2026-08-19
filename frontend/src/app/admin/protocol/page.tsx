"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProtocolInsights } from "@/components/admin/ProtocolInsights";

const SESSION_KEY = "candl-admin-secret";

export default function AdminProtocolPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) {
      setReady(true);
    } else {
      router.replace("/admin");
    }
  }, [router]);

  if (!ready) return null;

  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <Link href="/admin">
        <button type="button" className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-emerald-500 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Admin
        </button>
      </Link>

      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl p-8 shadow-xl">
        <ProtocolInsights />
      </div>
    </div>
  );
}
