export interface SavedTallyList {
  id: string;
  name: string;
  timestamp: number;
  dateString: string;
  grid: (number | null)[][];
  totalWeight: number;
  multiplier: number;
  calculatedTotal: number;
  totalEntries: number;
}
