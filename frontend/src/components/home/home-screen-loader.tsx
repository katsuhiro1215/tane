"use client";

import dynamic from "next/dynamic";

// タイトルを出すかどうかが localStorage で決まるため、サーバーでは描かない（ちらつき防止）
const HomeScreen = dynamic(() => import("@/components/home/home-screen").then((mod) => mod.HomeScreen), {
  ssr: false,
  loading: () => <div className="flex-1" />,
});

export function HomeScreenLoader() {
  return <HomeScreen />;
}
