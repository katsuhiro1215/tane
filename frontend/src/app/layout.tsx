import type { Metadata, Viewport } from "next";
import { Geist_Mono, M_PLUS_Rounded_1c, Zen_Maru_Gothic } from "next/font/google";

import "./globals.css";

import { BgmRouter } from "@/components/app/bgm-router";
import { SoundProvider } from "@/components/app/sound-provider";
import { PwaRegister } from "@/components/pwa-register";

// 本文は Zen Maru Gothic（設計書4.4）
const zenMaruGothic = Zen_Maru_Gothic({
  variable: "--font-sans",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 見出し・ロゴは Spra Go のロゴに近い太い丸文字（設計書4.4）
const mPlusRounded = M_PLUS_Rounded_1c({
  variable: "--font-rounded",
  weight: ["800", "900"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tane",
  description: "計算のタネをまき、少しずつ育てていく計算学習アプリ",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#bfe7f7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${zenMaruGothic.variable} ${geistMono.variable} ${mPlusRounded.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col text-foreground">
        <SoundProvider>
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col">{children}</div>
          <BgmRouter />
        </SoundProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
