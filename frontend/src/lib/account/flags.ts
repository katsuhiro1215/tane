/** Tane からのログインの入口を出すかどうか。既定は出さない（設計書・引き継ぎ文書） */
export function loginEnabled(): boolean {
  return process.env.NEXT_PUBLIC_TANE_LOGIN === "on";
}
