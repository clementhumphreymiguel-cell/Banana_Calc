import React, { useState } from 'react';
import { X, Trash2, FolderOpen, Copy, Check } from 'lucide-react';
import { SavedTallyList } from '../types/calculator';
import { formatNumber } from '../utils/format';

interface SavedListsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedLists: SavedTallyList[];
  onLoadList: (list: SavedTallyList) => void;
  onDeleteList: (id: string) => void;
  onClearAllLists: () => void;
}

export const SavedListsModal: React.FC<SavedListsModalProps> = ({
  isOpen,
  onClose,
  savedLists,
  onLoadList,
  onDeleteList,
  onClearAllLists,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  if (!isOpen) return null;

  const totalEntries = savedLists.reduce((sum, l) => sum + l.totalEntries, 0);

  const handleCopySlip = async (list: SavedTallyList) => {
    const lines = [
      `=== ${list.name.toUpperCase()} ===`,
      `Date: ${list.dateString}`,
      `Total Weight: ${formatNumber(list.totalWeight)}`,
      `Multiplier: ×${list.multiplier}`,
      `Calculated Total: ${formatNumber(list.calculatedTotal)}`,
      `----------------------------------------`,
      `Entries (10 Columns × 5 Rows):`,
    ];

    list.grid.forEach((col, idx) => {
      const nums = col.filter((n): n is number => n !== null);
      if (nums.length > 0) {
        lines.push(`Col ${idx + 1}: ${nums.join(', ')}`);
      }
    });

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopiedId(list.id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/95 backdrop-blur-sm animate-in fade-in duration-100">
      <div
        className="w-full max-w-[430px] bg-black border border-white/40 rounded-2xl p-3.5 shadow-2xl relative text-white flex flex-col h-[92vh] max-h-[92vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800 shrink-0">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              All Saved Lists & Weights
            </h3>
            <p className="text-[11px] text-zinc-400">
              {savedLists.length} saved list{savedLists.length === 1 ? '' : 's'} · {totalEntries} total weights
            </p>
          </div>

          <div className="flex items-center gap-2">
            {savedLists.length > 0 && (
              confirmClearAll ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      onClearAllLists();
                      setConfirmClearAll(false);
                    }}
                    className="text-[11px] bg-rose-600 text-white font-bold px-2 py-1 rounded cursor-pointer"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(false)}
                    className="text-[11px] text-zinc-400 hover:text-white px-1.5 py-1 rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(true)}
                  className="text-[11px] text-rose-400 hover:text-rose-300 px-2 py-1 rounded hover:bg-rose-950/30 transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              )
            )}
            <button
              type="button"
              onClick={() => {
                setConfirmClearAll(false);
                onClose();
              }}
              className="p-1 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable list of saved lists - WITH ALL WEIGHTS FULLY VISIBLE! */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {savedLists.length === 0 ? (
            <div className="py-16 text-center text-xs text-zinc-500">
              No saved lists yet.
              <div className="mt-1 text-zinc-400">
                Type numbers on the sheet and press <strong className="text-white">SAVE</strong>.
              </div>
            </div>
          ) : (
            savedLists.map((list, index) => {
              const isCopied = copiedId === list.id;

              return (
                <div
                  key={list.id}
                  className="bg-zinc-950 border border-white/30 rounded-xl p-3 transition-colors"
                >
                  {/* List Header: Name, Date, Multiplier, Result */}
                  <div className="flex items-start justify-between gap-2 pb-2 border-b border-zinc-800">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-mono text-zinc-400 font-bold">
                          #{index + 1}
                        </span>
                        <h4 className="text-sm font-bold text-white truncate">
                          {list.name}
                        </h4>
                      </div>

                      <div className="flex items-baseline gap-2 text-xs font-mono mt-0.5 text-zinc-300">
                        <span>
                          Total: <strong className="text-white text-sm">{formatNumber(list.calculatedTotal)}</strong>
                        </span>
                        {list.multiplier > 1 && (
                          <span className="text-[11px] text-zinc-400">
                            ({formatNumber(list.totalWeight)} × {list.multiplier})
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        {list.dateString} · {list.totalEntries} weights
                      </div>
                    </div>

                    {/* Actions: Copy, Load to active sheet, Delete */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopySlip(list)}
                        className="p-1.5 rounded-lg border border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white cursor-pointer"
                        title="Copy text summary"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onLoadList(list);
                          onClose();
                        }}
                        className="px-2 py-1 rounded-lg border border-white/60 bg-white text-black font-bold text-[11px] hover:bg-zinc-200 cursor-pointer flex items-center gap-1"
                        title="Load onto sheet"
                      >
                        <FolderOpen className="w-3 h-3" />
                        <span>Load</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteList(list.id)}
                        className="p-1.5 rounded-lg border border-zinc-800 hover:border-rose-700 text-zinc-400 hover:text-rose-400 cursor-pointer"
                        title="Delete list"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* ALL 20 COLUMNS & ALL WEIGHTS DISPLAYED DIRECTLY (IN 2 TIERS OF 10 COLUMNS) */}
                  <div className="pt-2 space-y-3">
                    {/* Tier 1: Columns 1–10 */}
                    <div className="border border-zinc-900 rounded-lg p-1.5 bg-black">
                      <div className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider mb-1">
                        Cols 1–10:
                      </div>
                      <div className="grid grid-cols-10 text-center text-[10px] font-mono border-b border-white/40 pb-1 text-white font-bold">
                        {list.grid.slice(0, 10).map((col, cIdx) => {
                          const filled = col ? col.filter((n): n is number => n !== null) : [];
                          return (
                            <div key={cIdx} className="truncate">
                              {filled.length === 5 ? formatNumber(filled.reduce((a, b) => a + b, 0)) : '---'}
                            </div>
                          );
                        })}
                      </div>
                      <div className="grid grid-cols-10 divide-x divide-zinc-900 text-center text-[11px] font-mono pt-1">
                        {list.grid.slice(0, 10).map((col, colIdx) => (
                          <div key={colIdx} className="space-y-0.5">
                            {(col || []).map((val, rowIdx) => (
                              <div
                                key={rowIdx}
                                className={`h-4 flex items-center justify-center ${
                                  val !== null ? 'text-white font-semibold' : 'text-zinc-800'
                                }`}
                              >
                                {val !== null ? formatNumber(val) : '·'}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tier 2: Columns 11–20 (if present) */}
                    {list.grid.length > 10 && (
                      <div className="border border-zinc-900 rounded-lg p-1.5 bg-black">
                        <div className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider mb-1">
                          Cols 11–20:
                        </div>
                        <div className="grid grid-cols-10 text-center text-[10px] font-mono border-b border-white/40 pb-1 text-white font-bold">
                          {list.grid.slice(10, 20).map((col, cIdx) => {
                            const filled = col ? col.filter((n): n is number => n !== null) : [];
                            return (
                              <div key={cIdx} className="truncate">
                                {filled.length === 5 ? formatNumber(filled.reduce((a, b) => a + b, 0)) : '---'}
                              </div>
                            );
                          })}
                        </div>
                        <div className="grid grid-cols-10 divide-x divide-zinc-900 text-center text-[11px] font-mono pt-1">
                          {list.grid.slice(10, 20).map((col, colIdx) => (
                            <div key={colIdx} className="space-y-0.5">
                              {(col || []).map((val, rowIdx) => (
                                <div
                                  key={rowIdx}
                                  className={`h-4 flex items-center justify-center ${
                                    val !== null ? 'text-white font-semibold' : 'text-zinc-800'
                                  }`}
                                >
                                  {val !== null ? formatNumber(val) : '·'}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-2.5 border-t border-zinc-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 bg-white text-black font-bold text-xs rounded-xl hover:bg-zinc-200 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
