export const MAX_ANSWER_LENGTH = 4;

export function appendDigit(current: string, digit: string, maxLength: number = MAX_ANSWER_LENGTH): string {
  if (!/^[0-9]$/.test(digit)) {
    return current;
  }
  if (current.length >= maxLength) {
    return current;
  }
  return current + digit;
}

export function removeLastDigit(current: string): string {
  return current.slice(0, -1);
}

export function canSubmit(current: string): boolean {
  return current.length > 0;
}
