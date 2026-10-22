// 日本時間の日付（YYYY-MM-DD）。システムのタイムゾーンに関係なく、JSTとして扱う
const JST_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function todayJst(now: Date = new Date()): string {
  // en-CA は YYYY-MM-DD 形式
  return JST_FORMATTER.format(now);
}
