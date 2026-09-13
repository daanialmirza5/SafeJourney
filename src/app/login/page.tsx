import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-brand text-lg font-bold text-white">S</div>
        <h1 className="text-2xl font-semibold text-slate-900">SafeJourney</h1>
        <p className="mt-1 text-sm text-slate-500">Don&apos;t let a referral end with a piece of paper.</p>
      </div>
      <LoginForm />
    </div>
  );
}
