"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flower2, Gamepad2, Settings } from "lucide-react";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "あそぶ", Icon: Gamepad2 },
  { href: "/friends", label: "なかま", Icon: Flower2 },
  { href: "/settings", label: "せってい", Icon: Settings },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="メニュー"
      className="fixed inset-x-0 bottom-0 z-10 border-t-[3px] border-cream-edge bg-card pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-md justify-around">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 w-20 flex-col items-center justify-center gap-0.5 font-display text-[11px] font-black",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-6 w-6" strokeWidth={2.5} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
