import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background text-center">
      <SearchX className="size-8 text-slate-400" />
      <p className="text-sm font-medium text-slate-800">Page not found.</p>
      <Link href="/" className="text-sm text-brand hover:underline">
        Back to home
      </Link>
    </div>
  );
}
