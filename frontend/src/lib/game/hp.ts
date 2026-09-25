export const INITIAL_HP = 5;

export function applyDamage(hp: number, amount: number = 1): number {
  return Math.max(0, hp - amount);
}

export function isDefeated(hp: number): boolean {
  return hp <= 0;
}
