/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Settings, Delete, CornerDownLeft, ListFilter, BookmarkPlus } from 'lucide-react';
import { SettingsModal } from './components/SettingsModal';
import { SavedListsModal } from './components/SavedListsModal';
import { SaveListModal } from './components/SaveListModal';
import { SavedTallyList } from './types/calculator';
import { formatNumber, applyHalfShortcut, preciseSum, preciseProduct } from './utils/format';

const STORAGE_GRID_KEY = 'monochrome_20col_grid_v4';
const STORAGE_MULT_KEY = 'monochrome_20col_mult_v4';
const STORAGE_LISTS_KEY = 'monochrome_saved_lists_v4';

// 20 columns total (2 tiers of 10 columns each), each with 5 rows
const NUM_COLS = 20;
const NUM_ROWS = 5;

// Pure empty 20-column by 5-row sheet with zero pre-filled template numbers
const createEmptyGrid = (): (number | null)[][] => {
  return Array(NUM_COLS)
    .fill(null)
    .map(() => Array(NUM_ROWS).fill(null));
};

export default function App() {
  // 20 columns, each with 5 rows - Starts completely blank
  const [grid, setGrid] = useState<(number | null)[][]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_GRID_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === NUM_COLS) {
          return parsed;
        }
      }
    } catch {}
    return createEmptyGrid();
  });

  // Multiplier (default 1)
  const [multiplier, setMultiplier] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_MULT_KEY);
      if (saved !== null) {
        const val = parseFloat(saved);
        if (Number.isFinite(val) && val >= 0) return val;
      }
    } catch {}
    return 1;
  });

  // Saved lists history
  const [savedLists, setSavedLists] = useState<SavedTallyList[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LISTS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Active cell coordinate [colIndex, rowIndex]
  const [activeCell, setActiveCell] = useState<[number, number]>([0, 0]);

  // Current buffer being typed on the keypad
  const [currentBuffer, setCurrentBuffer] = useState<string>('');

  // History stack for Undo
  const [historyStack, setHistoryStack] = useState<(number | null)[][][]>([]);

  // Modals
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [savedListsOpen, setSavedListsOpen] = useState<boolean>(false);
  const [saveListModalOpen, setSaveListModalOpen] = useState<boolean>(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_GRID_KEY, JSON.stringify(grid));
    } catch {}
  }, [grid]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_MULT_KEY, multiplier.toString());
    } catch {}
  }, [multiplier]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_LISTS_KEY, JSON.stringify(savedLists));
    } catch {}
  }, [savedLists]);

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

  // Overall Total Weight: sum of all numbers currently on the 20-column sheet
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

  // Total entries count on sheet
  const currentEntriesCount = useMemo(() => {
    let count = 0;
    grid.forEach((col) => {
      col.forEach((val) => {
        if (val !== null) count++;
      });
    });
    return count;
  }, [grid]);

  // Final calculated total with multiplier
  const calculatedResult = useMemo(() => {
    return preciseProduct(overallTotal, multiplier);
  }, [overallTotal, multiplier]);

  // Auto-advance: Move down the column (row 0 to 4), then move to the next column
  const getNextCell = (col: number, row: number): [number, number] => {
    if (row + 1 < NUM_ROWS) {
      return [col, row + 1];
    }
    if (col + 1 < NUM_COLS) {
      return [col + 1, 0];
    }
    return [col, row]; // last cell (col 19, row 4)
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

  const pushHistory = (newGrid: (number | null)[][]) => {
    setHistoryStack((prev) => [...prev.slice(-30), grid]);
    setGrid(newGrid);
  };

  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const previous = historyStack[historyStack.length - 1];
    setHistoryStack((prev) => prev.slice(0, -1));
    setGrid(previous);
    setCurrentBuffer('');
  };

  // Commit currentBuffer into activeCell
  const commitBuffer = useCallback(() => {
    if (!currentBuffer) {
      // Advance to next cell
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
  }, [activeCell, currentBuffer, grid]);

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
      // Erase activeCell or go to previous cell
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
  }, [currentBuffer, activeCell, grid]);

  const handleClear = useCallback(() => {
    setCurrentBuffer('');
  }, []);

  // Clear sheet completely
  const handleClearSheet = () => {
    pushHistory(createEmptyGrid());
    setActiveCell([0, 0]);
    setCurrentBuffer('');
  };

  // Reset sheet and multiplier back to default (1)
  const handleResetAll = () => {
    pushHistory(createEmptyGrid());
    setMultiplier(1);
    setActiveCell([0, 0]);
    setCurrentBuffer('');
  };

  // Save current list
  const handleSaveList = (name: string) => {
    const now = new Date();
    const dateString = `${now.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })} · ${now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;

    const newList: SavedTallyList = {
      id: `list_${Date.now()}`,
      name,
      timestamp: Date.now(),
      dateString,
      grid: grid.map((col) => [...col]),
      totalWeight: overallTotal,
      multiplier,
      calculatedTotal: calculatedResult,
      totalEntries: currentEntriesCount,
    };

    setSavedLists((prev) => [newList, ...prev]);

    // Clear current sheet to immediately start next list
    handleClearSheet();
  };

  // Load a saved list onto the sheet
  const handleLoadList = (list: SavedTallyList) => {
    // If list has fewer columns, pad to 20
    const loadedGrid = Array(NUM_COLS)
      .fill(null)
      .map((_, colIdx) => {
        if (list.grid[colIdx]) {
          return [...list.grid[colIdx]];
        }
        return Array(NUM_ROWS).fill(null);
      });

    pushHistory(loadedGrid);
    setMultiplier(list.multiplier);
    setActiveCell([0, 0]);
    setCurrentBuffer('');
  };

  // Physical keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (settingsOpen || savedListsOpen || saveListModalOpen) return;

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
    savedListsOpen,
    saveListModalOpen,
    handleDigit,
    handleBackspace,
    commitBuffer,
    handleClear,
    handleHalf,
  ]);

  // Helper to render a 10-column block (Tier 1: cols 0-9; Tier 2: cols 10-19)
  const renderColumnTier = (startCol: number, endCol: number) => {
    return (
      <div className="w-full flex flex-col">
        {/* Row of Column Totals */}
        <div className="grid grid-cols-10 text-center items-center py-0.5">
          {columnSums.slice(startCol, endCol).map((sum, i) => {
            const colIdx = startCol + i;
            return (
              <div
                key={colIdx}
                className="font-bold text-[10px] sm:text-[11px] font-mono tabular-nums text-white truncate px-0.5"
                title={`Column ${colIdx + 1} Total: ${sum !== null ? sum : 'incomplete'}`}
              >
                {sum !== null ? formatNumber(sum) : '---'}
              </div>
            );
          })}
        </div>

        {/* Horizontal Line separating Totals from Grid Numbers */}
        <div className="w-full h-[1px] bg-white my-0.5" />

        {/* 10 Vertical Columns with Dividing Lines */}
        <div className="grid grid-cols-10 divide-x divide-white">
          {Array.from({ length: endCol - startCol }).map((_, i) => {
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
                      type="button"
                      onClick={() => {
                        if (currentBuffer) {
                          commitBuffer();
                        }
                        setActiveCell([colIdx, rowIdx]);
                        setCurrentBuffer('');
                      }}
                      className={`h-5 sm:h-6 flex items-center justify-center font-mono text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer relative px-0.5 ${
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
                        <span className="absolute inset-0.5 border border-dashed border-white/60 rounded pointer-events-none" />
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
      {/* TOP BAR: Upper-Left Lists Button, Upper-Right Save & Settings */}
      <div className="flex items-center justify-between h-8 shrink-0 px-0.5">
        {/* Upper-Left: Saved Lists Button */}
        <button
          type="button"
          onClick={() => setSavedListsOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/70 bg-black text-white hover:bg-white hover:text-black transition-colors cursor-pointer text-xs font-bold"
          title="View Saved Lists & Weights"
        >
          <ListFilter className="w-3.5 h-3.5" />
          <span>Lists</span>
          {savedLists.length > 0 && (
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-white text-black font-mono font-bold">
              {savedLists.length}
            </span>
          )}
        </button>

        {/* Upper-Right: Save Button & Settings Gear */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSaveListModalOpen(true)}
            disabled={overallTotal === 0}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
              overallTotal > 0
                ? 'border-white bg-white text-black hover:bg-zinc-200'
                : 'border-zinc-800 text-zinc-600 cursor-not-allowed bg-black'
            }`}
            title="Save this 20-column list"
          >
            <BookmarkPlus className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>SAVE</span>
          </button>

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="p-1 text-white hover:text-zinc-300 transition-colors cursor-pointer"
            aria-label="Settings"
            title="Settings (Multiplier, Clear, Summary)"
          >
            <Settings className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>
      </div>

      {/* UPPER HALF: 20 COLUMNS SPLIT INTO 2 TIERS OF 10 COLUMNS */}
      <div className="flex-1 flex flex-col justify-around min-h-0 py-1">
        {/* TIER 1: COLUMNS 1–10 (UPPER SCREEN) */}
        {renderColumnTier(0, 10)}

        {/* TIER 2: COLUMNS 11–20 (BETWEEN UPPER SCREEN AND HALF SCREEN/KEYPAD) */}
        <div className="pt-1.5 border-t border-zinc-900">
          {renderColumnTier(10, 20)}
        </div>
      </div>

      {/* MIDDLE DIVIDER & TOTAL BAR (TOP OF THE KEYBOARD) */}
      <div className="shrink-0 flex flex-col justify-center">
        {/* Horizontal Divider Line */}
        <div className="w-full h-[1px] bg-white mb-1.5" />

        {/* Total Readout */}
        <div className="flex items-center justify-between px-1 min-h-8">
          <div className="flex-1 text-center font-bold text-xl sm:text-2xl font-mono tracking-tight text-white tabular-nums flex flex-wrap items-baseline justify-center gap-x-2">
            <span>Total: {formatNumber(overallTotal)}</span>
            {multiplier !== 1 && (
              <span className="text-xs sm:text-sm text-zinc-400 font-normal">
                ({formatNumber(overallTotal)} × {formatNumber(multiplier)} = {formatNumber(calculatedResult)})
              </span>
            )}
          </div>

          {/* Quick Backspace if typing buffer is active */}
          {currentBuffer && (
            <button
              type="button"
              onClick={handleBackspace}
              className="px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-300 hover:text-white flex items-center gap-1 cursor-pointer shrink-0"
              title="Backspace"
            >
              <Delete className="w-3.5 h-3.5" />
            </button>
          )}
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

      {/* Upper-Left: Saved Lists Modal */}
      <SavedListsModal
        isOpen={savedListsOpen}
        onClose={() => setSavedListsOpen(false)}
        savedLists={savedLists}
        onLoadList={handleLoadList}
        onDeleteList={(id) => setSavedLists((prev) => prev.filter((l) => l.id !== id))}
        onClearAllLists={() => setSavedLists([])}
      />

      {/* Upper-Right: Save List Modal (Asks for Name) */}
      <SaveListModal
        isOpen={saveListModalOpen}
        onClose={() => setSaveListModalOpen(false)}
        onSave={handleSaveList}
        totalWeight={overallTotal}
        multiplier={multiplier}
        calculatedTotal={calculatedResult}
      />

      {/* Settings Modal (Gear icon) */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        multiplier={multiplier}
        onMultiplierChange={setMultiplier}
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
