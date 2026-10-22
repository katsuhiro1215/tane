import Link from "next/link";

import { TopBar } from "@/components/app/top-bar";
import { LoginForm } from "@/components/account/login-form";

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 px-4 pt-4 pb-10">
      <TopBar title="ログイン" backHref="/" />
      <LoginForm />
      <p className="text-center text-sm font-bold">
        はじめての ひとは{" "}
        <Link href="/account/register" className="underline">
          とうろく
        </Link>
      </p>
    </main>
  );
}
