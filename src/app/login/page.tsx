import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50/50 px-4 py-12">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-brand text-xl font-bold text-white shadow-xs">
          SJ
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">SafeJourney</h1>
        <p className="mt-1 text-xs font-medium text-slate-500">Your coordinated referral workspace</p>
      </div>
      <LoginForm />
    </div>
  );
}

