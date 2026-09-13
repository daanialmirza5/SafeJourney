import Link from "next/link";
import { SearchX } from "lucide-react";

export default function AppNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <SearchX className="size-8 text-slate-400" />
      <p className="text-sm font-medium text-slate-800">We couldn&apos;t find that page or referral.</p>
      <Link href="/dashboard" className="text-sm text-brand hover:underline">
        Back to dashboard
      </Link>
    </div>
  );
}
