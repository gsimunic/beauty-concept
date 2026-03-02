"use client";

import { signOut } from "next-auth/react";

export function LogoutButton({ label }: { label: string }) {
  return (
    <button
      className="rounded-lg border border-[#5f412f] bg-[#744f37] px-4 py-2 text-sm font-medium text-[#f8f3ec] hover:bg-[#5f412f]"
      onClick={() => signOut({ callbackUrl: "/login" })}
      type="button"
    >
      {label}
    </button>
  );
}
