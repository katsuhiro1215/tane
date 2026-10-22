"use client";

import Link from "next/link";
import { User } from "lucide-react";

import { loginEnabled } from "@/lib/account/flags";
import { useAuth } from "@/lib/account/auth-store";

/** ホームの上の、ログイン／プロフィール名のチップ。NEXT_PUBLIC_TANE_LOGIN が off のときは何も出さない */
export function AccountChip() {
  const auth = useAuth();
  if (!loginEnabled()) return null;

  if (!auth) {
    return (
      <div className="flex justify-end px-3 pt-2">
        <Link
          href="/account/login"
          className="flex items-center gap-1 rounded-full border-b-[3px] border-cream-edge bg-card px-3 py-1 font-display text-xs font-black"
        >
          <User className="h-3.5 w-3.5" /> ログイン
        </Link>
      </div>
    );
  }

  return (
    <div className="flex justify-end px-3 pt-2">
      <Link
        href="/account/profiles"
        className="flex items-center gap-1 rounded-full border-b-[3px] border-cream-edge bg-card px-3 py-1 font-display text-xs font-black"
      >
        <User className="h-3.5 w-3.5" /> {auth.profileName ?? "だれが あそぶ？"}
      </Link>
    </div>
  );
}
