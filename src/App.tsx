/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Settings, Delete, CornerDownLeft, ListFilter, BookmarkPlus } from 'lucide-react';
import { SettingsModal } from './components/SettingsModal';
import { ListsModal } from './components/ListsModal';
import { SaveListModal } from './components/SaveListModal';
import { TallySheet } from './types/calculator';
import {
  NUM_ROWS,
  createEmptyGrid,
  getRequiredColumnCount,
  normalizeGrid,
  formatNumber,
  applyHalfShortcut,
  preciseSum,
  preciseProduct,
} from './utils/format';

const STORAGE_SHEETS_KEY = 'tally_sheets_v1';
const STORAGE_ACTIVE_SHEET_KEY = 'tally_active_sheet_v1';
const LEGACY_SESSIONS_KEY = 'tally_sessions_v1';

const formatDateString = (ts: number = Date.now()): string => {
  const d = new Date(ts);
  return `${d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })} · ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
};

const createNewSheet = (name: string): TallySheet => {
  const now = Date.now();
  return {
    id: `sheet_${now}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    timestamp: now,
    dateString: formatDateString(now),
    grid: createEmptyGrid(),
    multiplier: 1,
  };
};

const findFirstEmptyCell = (grid: (number | null)[][]): [number, number] => {
  for (let c = 0; c < grid.length; c++) {
    for (let r = 0; r < NUM_ROWS; r++) {
      if (grid[c][r] === null) {
        return [c, r];
      }
    }
  }
  return [grid.length, 0];
};

function sanitizeSheets(rawSheets: unknown): TallySheet[] {
  if (!Array.isArray(rawSheets) || rawSheets.length === 0) return [];
  return rawSheets.map((item, idx) => {
    const sheet = item as Partial<TallySheet>;
    return {
      id: sheet?.id || `sheet_${Date.now()}_${idx}`,
      name: sheet?.name || `Sheet ${idx + 1}`,
      timestamp: typeof sheet?.timestamp === 'number' ? sheet.timestamp : Date.now(),
      dateString: sheet?.dateString || formatDateString(),
      grid: normalizeGrid(sheet?.grid),
      multiplier:
        typeof sheet?.multiplier === 'number' &&
        Number.isFinite(sheet.multiplier) &&
        sheet.multiplier >= 0
          ? sheet.multiplier
          : 1,
    };
  });
}

function loadInitialSheets(): TallySheet[] {
  try {
    const saved = localStorage.getItem(STORAGE_SHEETS_KEY);
    if (saved) {
      const sanitized = sanitizeSheets(JSON.parse(saved));
      if (sanitized.length > 0) return sanitized;
    }

    // Migrate sheets if upgrading from session storage
    const legacySessions = localStorage.getItem(LEGACY_SESSIONS_KEY);
    if (legacySessions) {
      const parsedSessions = JSON.parse(legacySessions);
      if (Array.isArray(parsedSessions)) {
        const collected: unknown[] = [];
        parsedSessions.forEach((s) => {
          if (s && Array.isArray(s.sheets)) {
            collected.push(...s.sheets);
          }
        });
        const sanitized = sanitizeSheets(collected);
        if (sanitized.length > 0) return sanitized;
      }
    }
  } catch {}

  return [createNewSheet('Sheet 1')];
}

export default function App() {
  const [sheets, setSheets] = useState<TallySheet[]>(loadInitialSheets);

  const [activeSheetId, setActiveSheetId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ACTIVE_SHEET_KEY);
      if (saved) return saved;
    } catch {}
    return '';
  });

  const activeSheet = useMemo(
    () => sheets.find((sh) => sh.id === activeSheetId) || sheets[0],
    [sheets, activeSheetId]
  );

  // Active cell coordinate [colIndex, rowIndex]
  const [activeCell, setActiveCell] = useState<[number, number]>(() =>
    findFirstEmptyCell(normalizeGrid(activeSheet.grid))
  );

  const requiredCols = useMemo(
    () => getRequiredColumnCount(activeSheet.grid, activeCell[0]),
    [activeSheet.grid, activeCell]
  );

  const grid = useMemo(
    () => normalizeGrid(activeSheet.grid, requiredCols),
    [activeSheet.grid, requiredCols]
  );
  const multiplier = activeSheet.multiplier;

  const activeCellRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    activeCellRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeCell]);

  // Current buffer being typed on the keypad
  const [currentBuffer, setCurrentBuffer] = useState<string>('');

  // History stack for Undo (per active sheet editing session)
  const [historyStack, setHistoryStack] = useState<(number | null)[][][]>([]);

  // Modals
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [listsModalOpen, setListsModalOpen] = useState<boolean>(false);
  const [saveListModalOpen, setSaveListModalOpen] = useState<boolean>(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SHEETS_KEY, JSON.stringify(sheets));
    } catch {}
  }, [sheets]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ACTIVE_SHEET_KEY, activeSheet.id);
    } catch {}
  }, [activeSheet.id]);

  // Helper to update the active sheet
  const updateActiveSheet = useCallback(
    (updater: (sheet: TallySheet) => TallySheet) => {
      const now = Date.now();
      const dateString = formatDateString(now);
      setSheets((prev) =>
        prev.map((sheet) => {
          if (sheet.id !== activeSheet.id) return sheet;
          const updated = updater(sheet);
          return {
            ...updated,
            timestamp: now,
            dateString,
          };
        })
      );
    },
    [activeSheet.id]
  );

  // Calculate sum for each of the 20 columns
  // Rule: If a column has all 5 numbers, show the sum of all 5 numbers!
  // If fewer than 5 numbers, show '---'
  const columnSums = useMemo(() => {
    return grid.map((col) => {
      const filled = col.filter((n): n is number => n !== null);
      if (filled.length === NUM_ROWS) {
        return preciseSum(filled);
      }
      return null; // indicates '---'
    });
  }, [grid]);

  // Overall Total Weight: sum of all numbers currently on this 20-column sheet
  const overallTotal = useMemo(() => {
    const allNumbers: number[] = [];
    grid.forEach((col) => {
      col.forEach((val) => {
        if (val !== null) {
          allNumbers.push(val);
        }
      });
    });
    return preciseSum(allNumbers);
  }, [grid]);

  // Final calculated result for this sheet using its own multiplier
  const calculatedResult = useMemo(() => {
    return preciseProduct(overallTotal, multiplier);
  }, [overallTotal, multiplier]);

  // Auto-advance: Move down the column (row 0 to 4), then move to the next column (expanding by 10 as needed)
  const getNextCell = (col: number, row: number): [number, number] => {
    if (row + 1 < NUM_ROWS) {
      return [col, row + 1];
    }
    return [col + 1, 0];
  };

  const getPrevCell = (col: number, row: number): [number, number] => {
    if (row - 1 >= 0) {
      return [col, row - 1];
    }
    if (col - 1 >= 0) {
      return [col - 1, NUM_ROWS - 1];
    }
    return [0, 0];
  };

  const pushHistory = useCallback(
    (newGrid: (number | null)[][]) => {
      setHistoryStack((prev) => [...prev.slice(-30), grid]);
      updateActiveSheet((sheet) => ({ ...sheet, grid: newGrid }));
    },
    [grid, updateActiveSheet]
  );

  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const previous = historyStack[historyStack.length - 1];
    setHistoryStack((prev) => prev.slice(0, -1));
    updateActiveSheet((sheet) => ({ ...sheet, grid: previous }));
    setCurrentBuffer('');
  };

  // Commit currentBuffer into activeCell
  const commitBuffer = useCallback(() => {
    if (!currentBuffer) {
      const [c, r] = activeCell;
      setActiveCell(getNextCell(c, r));
      return;
    }

    const val = parseFloat(currentBuffer);
    if (!Number.isFinite(val) || val <= 0) {
      setCurrentBuffer('');
      return;
    }

    const [c, r] = activeCell;
    const newGrid = grid.map((col, colIdx) =>
      col.map((cell, rowIdx) => (colIdx === c && rowIdx === r ? val : cell))
    );

    pushHistory(newGrid);
    setCurrentBuffer('');
    setActiveCell(getNextCell(c, r));
  }, [activeCell, currentBuffer, grid, pushHistory]);

  // Keypad click handlers
  const handleDigit = useCallback((digit: string) => {
    setCurrentBuffer((prev) => {
      if (prev === '0') return digit;
      if (prev.length >= 6) return prev;
      return prev + digit;
    });
  }, []);

  const handleHalf = useCallback(() => {
    setCurrentBuffer((prev) => applyHalfShortcut(prev));
  }, []);

  const handleBackspace = useCallback(() => {
    if (currentBuffer.length > 0) {
      setCurrentBuffer((prev) => (prev.length <= 1 ? '' : prev.slice(0, -1)));
    } else {
      const [c, r] = activeCell;
      if (grid[c][r] !== null) {
        const newGrid = grid.map((col, cIdx) =>
          col.map((cell, rIdx) => (cIdx === c && rIdx === r ? null : cell))
        );
        pushHistory(newGrid);
      } else {
        const [prevC, prevR] = getPrevCell(c, r);
        setActiveCell([prevC, prevR]);
        const newGrid = grid.map((col, cIdx) =>
          col.map((cell, rIdx) => (cIdx === prevC && rIdx === prevR ? null : cell))
        );
        pushHistory(newGrid);
      }
    }
  }, [currentBuffer, activeCell, grid, pushHistory]);

  const handleClear = useCallback(() => {
    setCurrentBuffer('');
  }, []);

  // Multiplier change for current sheet only
  const handleMultiplierChange = (newMult: number) => {
    updateActiveSheet((sheet) => ({ ...sheet, multiplier: newMult }));
  };

  // Clear current sheet numbers completely (keeps sheet name & multiplier)
  const handleClearSheet = () => {
    pushHistory(createEmptyGrid());
    setActiveCell([0, 0]);
    setCurrentBuffer('');
  };

  // Reset current sheet numbers and multiplier back to default (1)
  const handleResetAll = () => {
    setHistoryStack((prev) => [...prev.slice(-30), grid]);
    updateActiveSheet((sheet) => ({
      ...sheet,
      grid: createEmptyGrid(),
      multiplier: 1,
    }));
    setActiveCell([0, 0]);
    setCurrentBuffer('');
  };

  // Save current sheet name & optionally create/open a new blank sheet
  const handleSaveSheet = (name: string, startNewSheet: boolean) => {
    const now = Date.now();
    const dateString = formatDateString(now);

    if (startNewSheet) {
      const nextSheet = createNewSheet(`Sheet ${sheets.length + 1}`);
      setSheets((prev) => [
        ...prev.map((sheet) =>
          sheet.id === activeSheet.id
            ? { ...sheet, name, timestamp: now, dateString }
            : sheet
        ),
        nextSheet,
      ]);
      setActiveSheetId(nextSheet.id);
      setActiveCell([0, 0]);
      setCurrentBuffer('');
      setHistoryStack([]);
    } else {
      updateActiveSheet((sheet) => ({ ...sheet, name }));
    }
  };

  // Sheet CRUD handlers
  const handleOpenSheet = (sheetId: string) => {
    const target = sheets.find((sh) => sh.id === sheetId);
    if (!target) return;
    setActiveSheetId(target.id);
    setActiveCell(findFirstEmptyCell(normalizeGrid(target.grid)));
    setCurrentBuffer('');
    setHistoryStack([]);
  };

  const handleCreateSheet = (name: string) => {
    const newSheet = createNewSheet(name);
    setSheets((prev) => [...prev, newSheet]);
    setActiveSheetId(newSheet.id);
    setActiveCell([0, 0]);
    setCurrentBuffer('');
    setHistoryStack([]);
  };

  const handleRenameSheet = (sheetId: string, newName: string) => {
    setSheets((prev) =>
      prev.map((sheet) =>
        sheet.id === sheetId ? { ...sheet, name: newName } : sheet
      )
    );
  };

  const handleDeleteSheet = (sheetId: string) => {
    const remaining = sheets.filter((sh) => sh.id !== sheetId);
    const nextSheets = remaining.length > 0 ? remaining : [createNewSheet('Sheet 1')];
    setSheets(nextSheets);

    if (activeSheet.id === sheetId) {
      const fallback = nextSheets[0];
      setActiveSheetId(fallback.id);
      setActiveCell(findFirstEmptyCell(normalizeGrid(fallback.grid)));
      setCurrentBuffer('');
      setHistoryStack([]);
    }
  };

  // Physical keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (settingsOpen || listsModalOpen || saveListModalOpen) return;

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === '.') {
        e.preventDefault();
        setCurrentBuffer((prev) => {
          if (!prev) return '0.';
          if (prev.includes('.')) return prev;
          return prev + '.';
        });
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        commitBuffer();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClear();
      } else if (e.key.toLowerCase() === 'h') {
        e.preventDefault();
        handleHalf();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    settingsOpen,
    listsModalOpen,
    saveListModalOpen,
    handleDigit,
    handleBackspace,
    commitBuffer,
    handleClear,
    handleHalf,
  ]);

  const tierSize = grid.length <= 5 ? 5 : 10;
  const tierCount = Math.ceil(grid.length / tierSize);
  const isSingleTier = tierCount === 1;

  // Helper to render a column tier (5 columns initially, then 10-column tiers for 10, 20, 30, 40, 50...)
  const renderColumnTier = (startCol: number, endCol: number) => {
    const colCount = endCol - startCol;
    const gridColsClass = colCount === 5 ? 'grid-cols-5' : 'grid-cols-10';

    const headerTextClass =
      colCount === 5
        ? 'text-sm sm:text-base px-1'
        : isSingleTier
        ? 'text-xs sm:text-sm px-0.5'
        : 'text-[10px] sm:text-[11px] px-0.5';

    const cellSizeClass =
      colCount === 5
        ? 'h-8 sm:h-9 text-base sm:text-lg px-1'
        : isSingleTier
        ? 'h-7 sm:h-8 text-xs sm:text-sm px-0.5'
        : 'h-5 sm:h-6 text-[11px] sm:text-xs px-0.5';

    return (
      <div className="w-full flex flex-col">
        {/* Row of Column Totals */}
        <div className={`grid ${gridColsClass} text-center items-center py-0.5`}>
          {columnSums.slice(startCol, endCol).map((sum, i) => {
            const colIdx = startCol + i;
            return (
              <div
                key={colIdx}
                className={`font-bold font-mono tabular-nums text-white truncate ${headerTextClass}`}
                title={`Column ${colIdx + 1} Total: ${sum !== null ? sum : 'incomplete'}`}
              >
                {sum !== null ? formatNumber(sum) : '---'}
              </div>
            );
          })}
        </div>

        {/* Horizontal Line separating Totals from Grid Numbers */}
        <div className="w-full h-[1.5px] bg-white my-0.5" />

        {/* Vertical Columns with Dividing Lines */}
        <div className={`grid ${gridColsClass} divide-x divide-white/80`}>
          {Array.from({ length: colCount }).map((_, i) => {
            const colIdx = startCol + i;
            return (
              <div key={colIdx} className="flex flex-col justify-start">
                {Array.from({ length: NUM_ROWS }).map((_, rowIdx) => {
                  const val = grid[colIdx][rowIdx];
                  const isActive =
                    activeCell[0] === colIdx && activeCell[1] === rowIdx;

                  return (
                    <button
                      key={rowIdx}
                      ref={isActive ? activeCellRef : undefined}
                      type="button"
                      onClick={() => {
                        if (currentBuffer) {
                          commitBuffer();
                        }
                        setActiveCell([colIdx, rowIdx]);
                        setCurrentBuffer('');
                      }}
                      className={`flex items-center justify-center font-mono font-semibold transition-colors cursor-pointer relative ${cellSizeClass} ${
                        isActive
                          ? 'text-white'
                          : val !== null
                          ? 'text-white'
                          : 'text-transparent'
                      }`}
                    >
                      {/* Show current buffer if this is the active cell being typed */}
                      {isActive && currentBuffer ? (
                        <span className="text-white underline decoration-white decoration-2 underline-offset-2">
                          {currentBuffer}
                        </span>
                      ) : val !== null ? (
                        formatNumber(val)
                      ) : (
                        ''
                      )}

                      {/* Active Cell Box Highlight */}
                      {isActive && !currentBuffer && (
                        <span className="absolute inset-0.5 border border-dashed border-white/70 rounded pointer-events-none" />
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="h-dvh max-h-screen w-full max-w-[430px] mx-auto bg-black text-white flex flex-col justify-between overflow-hidden select-none px-3 pt-1.5 pb-3 font-sans">
      {/* TOP BAR: Upper-Left Sheets Button, Center Sheet Name, Upper-Right Save & Settings */}
      <div className="flex items-center justify-between gap-2 h-9 shrink-0 px-0.5">
        {/* Upper-Left: Sheets / Lists Button */}
        <button
          type="button"
          onClick={() => setListsModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/70 bg-black text-white hover:bg-white hover:text-black transition-colors cursor-pointer text-xs font-bold shrink-0"
          title="Sheets & Overall Total"
        >
          <ListFilter className="w-3.5 h-3.5" />
          <span>Sheets</span>
          <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-white text-black font-mono font-bold">
            {sheets.length}
          </span>
        </button>

        {/* Center: Active Sheet Name (Tap to switch) */}
        <button
          type="button"
          onClick={() => setListsModalOpen(true)}
          className="flex-1 min-w-0 text-center cursor-pointer hover:opacity-80 transition-opacity"
          title={activeSheet.name}
        >
          <span className="block text-xs sm:text-sm font-bold text-white truncate">
            {activeSheet.name}
          </span>
        </button>

        {/* Upper-Right: Save Sheet Button & Settings Gear */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setSaveListModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold border border-white bg-white text-black hover:bg-zinc-200 transition-colors cursor-pointer"
            title="Save sheet"
          >
            <BookmarkPlus className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>SAVE</span>
          </button>

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="p-1 text-white hover:text-zinc-300 transition-colors cursor-pointer"
            aria-label="Settings"
            title="Settings"
          >
            <Settings className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>
      </div>

      {/* UPPER HALF: DYNAMIC COLUMNS (5 cols -> 10 cols -> 20 -> 30 -> 40 -> 50...) */}
      <div className="flex-1 min-h-0 overflow-y-auto py-1">
        <div
          className={
            tierCount <= 2
              ? 'min-h-full flex flex-col justify-around gap-2'
              : 'flex flex-col gap-3 pb-2'
          }
        >
          {Array.from({ length: tierCount }).map((_, tierIdx) => {
            const startCol = tierIdx * tierSize;
            const endCol = Math.min(startCol + tierSize, grid.length);
            return (
              <div
                key={tierIdx}
                className={tierIdx > 0 ? 'pt-2 border-t border-zinc-800' : ''}
              >
                {renderColumnTier(startCol, endCol)}
              </div>
            );
          })}
        </div>
      </div>

      {/* MIDDLE DIVIDER & TOTAL BAR (TOP OF THE KEYBOARD) */}
      <div className="shrink-0 flex flex-col justify-center">
        {/* Horizontal Divider Line */}
        <div className="w-full h-[1px] bg-white mb-1.5" />

        {/* Total Readout & Delete Button */}
        <div className="flex items-center justify-between gap-2 px-1 min-h-8">
          <div className="flex-1 text-center font-bold text-xl sm:text-2xl font-mono tracking-tight text-white tabular-nums flex flex-wrap items-baseline justify-center gap-x-2">
            <span>Total: {formatNumber(overallTotal)}</span>
            {multiplier !== 1 && (
              <span className="text-xs sm:text-sm text-zinc-400 font-normal">
                ({formatNumber(overallTotal)} × {formatNumber(multiplier)} ={' '}
                {formatNumber(calculatedResult)})
              </span>
            )}
          </div>

          {/* Delete / Backspace button (works for typing buffer AND committed cells) */}
          <button
            type="button"
            onClick={handleBackspace}
            disabled={
              !currentBuffer &&
              overallTotal === 0 &&
              activeCell[0] === 0 &&
              activeCell[1] === 0
            }
            className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 hover:border-white disabled:opacity-30 disabled:hover:border-zinc-700 rounded-lg text-xs text-white flex items-center justify-center cursor-pointer disabled:cursor-not-allowed shrink-0 transition-colors"
            aria-label="Delete"
            title="Delete"
          >
            <Delete className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* BOTTOM HALF: THE KEYPAD (3 COLUMNS x 4 ROWS) */}
      <div className="shrink-0 pt-1.5 pb-0.5">
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          {/* Row 1 */}
          <button
            type="button"
            onClick={() => handleDigit('1')}
            className="h-12 sm:h-13 rounded-2xl border-2 border-white bg-black text-white text-3xl font-semibold flex items-center justify-center active:bg-white active:text-black transition-colors cursor-pointer"
          >
            1
          </button>
          <button
            type="button"
            onClick={() => handleDigit('2')}
            className="h-12 sm:h-13 rounded-2xl border-2 border-white bg-black text-white text-3xl font-semibold flex items-center justify-center active:bg-white active:text-black transition-colors cursor-pointer"
          >
            2
          </button>
          <button
            type="button"
            onClick={() => handleDigit('3')}
            className="h-12 sm:h-13 rounded-2xl border-2 border-white bg-black text-white text-3xl font-semibold flex items-center justify-center active:bg-white active:text-black transition-colors cursor-pointer"
          >
            3
          </button>

          {/* Row 2 */}
          <button
            type="button"
            onClick={() => handleDigit('4')}
            className="h-12 sm:h-13 rounded-2xl border-2 border-white bg-black text-white text-3xl font-semibold flex items-center justify-center active:bg-white active:text-black transition-colors cursor-pointer"
          >
            4
          </button>
          <button
            type="button"
            onClick={() => handleDigit('5')}
            className="h-12 sm:h-13 rounded-2xl border-2 border-white bg-black text-white text-3xl font-semibold flex items-center justify-center active:bg-white active:text-black transition-colors cursor-pointer"
          >
            5
          </button>
          <button
            type="button"
            onClick={() => handleDigit('6')}
            className="h-12 sm:h-13 rounded-2xl border-2 border-white bg-black text-white text-3xl font-semibold flex items-center justify-center active:bg-white active:text-black transition-colors cursor-pointer"
          >
            6
          </button>

          {/* Row 3 */}
          <button
            type="button"
            onClick={() => handleDigit('7')}
            className="h-12 sm:h-13 rounded-2xl border-2 border-white bg-black text-white text-3xl font-semibold flex items-center justify-center active:bg-white active:text-black transition-colors cursor-pointer"
          >
            7
          </button>
          <button
            type="button"
            onClick={() => handleDigit('8')}
            className="h-12 sm:h-13 rounded-2xl border-2 border-white bg-black text-white text-3xl font-semibold flex items-center justify-center active:bg-white active:text-black transition-colors cursor-pointer"
          >
            8
          </button>
          <button
            type="button"
            onClick={() => handleDigit('9')}
            className="h-12 sm:h-13 rounded-2xl border-2 border-white bg-black text-white text-3xl font-semibold flex items-center justify-center active:bg-white active:text-black transition-colors cursor-pointer"
          >
            9
          </button>

          {/* Row 4: 0, .5, and Enter / Commit */}
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-12 sm:h-13 rounded-2xl border-2 border-white bg-black text-white text-3xl font-semibold flex items-center justify-center active:bg-white active:text-black transition-colors cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleHalf}
            title="Adds .5 (e.g. 10 -> 10.5, 0 -> 0.5)"
            className="h-12 sm:h-13 rounded-2xl border-2 border-white bg-black text-white text-3xl font-semibold flex items-center justify-center active:bg-white active:text-black transition-colors cursor-pointer"
          >
            .5
          </button>
          <button
            type="button"
            onClick={commitBuffer}
            title="Commit & Next Cell"
            className="h-12 sm:h-13 rounded-2xl border-2 border-white bg-zinc-900 text-white text-xl font-bold flex items-center justify-center active:bg-white active:text-black transition-colors cursor-pointer"
          >
            <CornerDownLeft className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* --- Modals --- */}

      {/* Upper-Left: Sheets & Overall Total Modal */}
      <ListsModal
        isOpen={listsModalOpen}
        onClose={() => setListsModalOpen(false)}
        sheets={sheets}
        activeSheetId={activeSheet.id}
        onOpenSheet={handleOpenSheet}
        onCreateSheet={handleCreateSheet}
        onRenameSheet={handleRenameSheet}
        onDeleteSheet={handleDeleteSheet}
      />

      {/* Upper-Right: Save Sheet Modal */}
      <SaveListModal
        isOpen={saveListModalOpen}
        onClose={() => setSaveListModalOpen(false)}
        onSave={handleSaveSheet}
        totalWeight={overallTotal}
        multiplier={multiplier}
        calculatedTotal={calculatedResult}
        initialName={activeSheet.name}
      />

      {/* Settings Modal (Gear icon) - Per-Sheet Multiplier & Actions */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        sheetName={activeSheet.name}
        multiplier={multiplier}
        onMultiplierChange={handleMultiplierChange}
        onClearSheet={handleClearSheet}
        onResetAll={handleResetAll}
        onUndo={handleUndo}
        canUndo={historyStack.length > 0}
        columnsData={grid}
        overallTotal={overallTotal}
      />
    </div>
  );
}
