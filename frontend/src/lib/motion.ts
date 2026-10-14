/** 動きを減らす設定。描画中ではなく、effect・操作のとき・クライアント専用の初期値で呼ぶ */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
