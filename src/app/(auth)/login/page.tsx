import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { GoogleButton } from "./google-button";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f8f1e8] via-[#f4e8da] to-[#eadaca] p-4">
      <div className="w-full max-w-md rounded-xl border border-[var(--bc-border)] bg-[var(--bc-surface)] p-8 text-center shadow-xl shadow-[#cbb59f]/30">
        <h1 className="mb-2 text-2xl font-semibold text-[var(--bc-text)]">
          Beauty Concept Admin
        </h1>
        <p className="mb-6 text-sm text-[var(--bc-muted)]">
          Secure internal access
        </p>

        <GoogleButton />
      </div>
    </main>
  );
}
