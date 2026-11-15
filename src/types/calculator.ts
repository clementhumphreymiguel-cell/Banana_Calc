export interface TallySheet {
  id: string;
  name: string;
  timestamp: number;
  dateString: string;
  grid: (number | null)[][];
  multiplier: number;
}
