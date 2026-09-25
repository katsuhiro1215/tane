export function LandscapeGuard() {
  return (
    <div className="fixed inset-0 z-50 hidden flex-col items-center justify-center gap-4 bg-background p-6 text-center [@media(orientation:portrait)]:flex">
      <p className="text-4xl">📱↔️</p>
      <p className="text-lg font-bold">スマホを横向きにしてください</p>
      <p className="text-sm text-muted-foreground">Taneは横画面でプレイするアプリです</p>
    </div>
  );
}
