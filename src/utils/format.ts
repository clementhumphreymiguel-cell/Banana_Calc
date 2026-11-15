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
  let sum = 0;
  for (const n of numbers) {
    sum += n;
  }
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
 * Handle the special .5 shortcut button logic:
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

export const COLS_PER_TIER = 5;
export const DEFAULT_COLS = 5;
export const NUM_ROWS = 5;

export function createEmptyGrid(colCount: number = DEFAULT_COLS): (number | null)[][] {
  return Array(colCount)
    .fill(null)
    .map(() => Array(NUM_ROWS).fill(null));
}

export function getRequiredColumnCount(
  grid: (number | null)[][] | undefined,
  activeCol: number = 0
): number {
  let highestNonEmptyCol = -1;
  if (Array.isArray(grid)) {
    for (let c = 0; c < grid.length; c++) {
      const col = grid[c];
      if (
        Array.isArray(col) &&
        col.some((v) => typeof v === 'number' && Number.isFinite(v))
      ) {
        highestNonEmptyCol = c;
      }
    }
  }

  // Trigger expansion when entries reach col 5 (index 4), col 10 (index 9), col 20 (index 19), etc.
  // or when active cursor advances past col 5, 10, 20, 30...
  const effectiveCol = Math.max(0, highestNonEmptyCol + 1, activeCol);

  if (effectiveCol < 5) {
    return 5;
  }
  if (effectiveCol < 10) {
    return 10;
  }
  return (Math.floor(effectiveCol / 10) + 1) * 10;
}

export function normalizeGrid(
  grid: (number | null)[][] | undefined,
  minCols: number = DEFAULT_COLS
): (number | null)[][] {
  const targetCols = Math.max(minCols, getRequiredColumnCount(grid));
  return Array(targetCols)
    .fill(null)
    .map((_, colIdx) => {
      const col = grid?.[colIdx];
      if (!Array.isArray(col)) return Array(NUM_ROWS).fill(null);
      return Array(NUM_ROWS)
        .fill(null)
        .map((__, rowIdx) => {
          const val = col[rowIdx];
          return typeof val === 'number' && Number.isFinite(val) ? val : null;
        });
    });
}

export function getSheetTotalWeight(grid: (number | null)[][]): number {
  const allNumbers: number[] = [];
  grid.forEach((col) => {
    col.forEach((val) => {
      if (val !== null) {
        allNumbers.push(val);
      }
    });
  });
  return preciseSum(allNumbers);
}

export function getSheetEntryCount(grid: (number | null)[][]): number {
  let count = 0;
  grid.forEach((col) => {
    col.forEach((val) => {
      if (val !== null) count++;
    });
  });
  return count;
}

export function getSheetFinalResult(grid: (number | null)[][], multiplier: number): number {
  return preciseProduct(getSheetTotalWeight(grid), multiplier);
}
