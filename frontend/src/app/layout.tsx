import type { Metadata, Viewport } from "next";
import { Geist_Mono, Hachi_Maru_Pop, Zen_Maru_Gothic } from "next/font/google";

import "./globals.css";

import { BgmRouter } from "@/components/app/bgm-router";
import { SoundProvider } from "@/components/app/sound-provider";
import { PwaRegister } from "@/components/pwa-register";

// Zen Maru Gothicをアプリ全体の基本フォント(--font-sans)として採用する。
// 「ひよこ暗算」を参考にした温かみのあるテーマ(company/spra/tane/assets/sample.png)
// をトップ画面だけでなくアプリ全体に展開する方針のため。
const zenMaruGothic = Zen_Maru_Gothic({
  variable: "--font-sans",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const hachiMaruPop = Hachi_Maru_Pop({
  variable: "--font-hachi",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tane",
  description: "計算のタネをまき、少しずつ育てていく計算学習アプリ",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#2f6b4f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${zenMaruGothic.variable} ${geistMono.variable} ${hachiMaruPop.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <SoundProvider>
          {children}
          <BgmRouter />
        </SoundProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
