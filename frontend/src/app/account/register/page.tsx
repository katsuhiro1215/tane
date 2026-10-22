import Link from "next/link";

import { TopBar } from "@/components/app/top-bar";
import { RegisterForm } from "@/components/account/register-form";

export default function RegisterPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 px-4 pt-4 pb-10">
      <TopBar title="とうろく" backHref="/" />
      <RegisterForm />
      <p className="text-center text-sm font-bold">
        アカウントが ある ひとは{" "}
        <Link href="/account/login" className="underline">
          ログイン
        </Link>
      </p>
    </main>
  );
}
