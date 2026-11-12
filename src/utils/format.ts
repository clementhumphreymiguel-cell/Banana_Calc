/**
 * Format numbers with thousands separators and clean decimal precision.
 */
export function formatNumber(value: number, maxDecimals = 3): string {
  if (!Number.isFinite(value)) return '0';
  
  // Clean floating point artifacts
  const factor = Math.pow(10, maxDecimals);
  const rounded = Math.round((value + Number.EPSILON) * factor) / factor;
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(rounded);
}

/**
 * Accurately calculate the sum of an array of numbers to avoid floating point drift.
 */
export function preciseSum(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  // Use scaling or epsilon rounding
  let sum = 0;
  for (const n of numbers) {
    sum += n;
  }
  // round to 4 decimal places to discard precision noise
  return Math.round((sum + Number.EPSILON) * 10000) / 10000;
}

/**
 * Accurately calculate product of two numbers.
 */
export function preciseProduct(a: number, b: number): number {
  const prod = a * b;
  return Math.round((prod + Number.EPSILON) * 10000) / 10000;
}

/**
 * Handle the special .5 shortcut button logic according to specs:
 * - Empty string -> "0.5"
 * - "0" -> "0.5"
 * - "10" -> "10.5"
 * - "20" -> "20.5"
 * - Already decimal (e.g. "12.3") -> replace decimal portion with .5 -> "12.5"
 */
export function applyHalfShortcut(currentValue: string): string {
  const trimmed = currentValue.trim();
  if (!trimmed || trimmed === '0') {
    return '0.5';
  }
  
  if (trimmed.includes('.')) {
    const [whole] = trimmed.split('.');
    return `${whole || '0'}.5`;
  }
  
  return `${trimmed}.5`;
}
