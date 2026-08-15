export function money(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

export function pct(n: number, dp = 1): string {
  return `${n.toFixed(dp)}%`;
}

export function num(n: number): string {
  return n.toLocaleString('en-US');
}
