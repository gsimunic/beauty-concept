"use client";

import { signIn } from "next-auth/react";

export function GoogleButton() {
  return (
    <button
      onClick={() => signIn("google")}
      className="w-full rounded-lg border border-[#ddccba] bg-[#f7ecdf] px-4 py-3 text-sm font-semibold text-[#4b3a2d] transition hover:bg-[#eedfcd]"
    >
      Sign in with Google
    </button>
  );
}
