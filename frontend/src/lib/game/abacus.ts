/** 画面の中のそろばん（表示だけ。採点には使わない）。1本の軸＝ごだま1こ＋いちだま4こ */
export interface AbacusColumn {
  /** ごだま（5）が、はりに寄っているか */
  five: boolean;
  /** いちだま（1）のうち、はりに寄っている数（0〜4） */
  ones: number;
}

export const ABACUS_COLUMNS = 7;
export const ABACUS_ONE_BEADS = 4;

export function emptyColumn(): AbacusColumn {
  return { five: false, ones: 0 };
}

export function columnValue(column: AbacusColumn): number {
  return (column.five ? 5 : 0) + column.ones;
}

export function toggleFive(column: AbacusColumn): AbacusColumn {
  return { ...column, five: !column.five };
}

/**
 * いちだまを、はりに近いほうから rank 番目（1〜4）まで動かす。
 * すでに rank 番目まで動いていたら、rank 番目を含めて1つ戻す（タップで出し入れ）。
 */
export function tapOne(column: AbacusColumn, rank: number): AbacusColumn {
  const ones = column.ones >= rank ? rank - 1 : rank;
  return { ...column, ones };
}
