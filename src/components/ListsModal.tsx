import React, { useState } from 'react';
import { X, Trash2, FolderOpen, Copy, Check, Plus, Edit2, ChevronRight, ArrowLeft } from 'lucide-react';
import { TallySheet } from '../types/calculator';
import {
  normalizeGrid,
  formatNumber,
  preciseSum,
  getSheetTotalWeight,
  getSheetEntryCount,
  getSheetFinalResult,
} from '../utils/format';

interface ListsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheets: TallySheet[];
  activeSheetId: string;
  onOpenSheet: (sheetId: string) => void;
  onCreateSheet: (name: string) => void;
  onRenameSheet: (sheetId: string, newName: string) => void;
  onDeleteSheet: (sheetId: string) => void;
}

export const ListsModal: React.FC<ListsModalProps> = ({
  isOpen,
  onClose,
  sheets,
  activeSheetId,
  onOpenSheet,
  onCreateSheet,
  onRenameSheet,
  onDeleteSheet,
}) => {
  const [creatingSheet, setCreatingSheet] = useState(false);
  const [newSheetName, setNewSheetName] = useState('');

  const [renamingSheetId, setRenamingSheetId] = useState<string | null>(null);
  const [renameSheetInput, setRenameSheetInput] = useState('');
  const [confirmDeleteSheetId, setConfirmDeleteSheetId] = useState<string | null>(null);

  const [copiedSheetId, setCopiedSheetId] = useState<string | null>(null);
  const [showOverallBreakdown, setShowOverallBreakdown] = useState(false);
  const [copiedOverall, setCopiedOverall] = useState(false);

  if (!isOpen) return null;

  // Overall Total = sum of final results of all sheets (never combines weights or multipliers)
  const sheetSummaries = sheets.map((sheet) => {
    const weight = getSheetTotalWeight(sheet.grid);
    const result = getSheetFinalResult(sheet.grid, sheet.multiplier);
    const count = getSheetEntryCount(sheet.grid);
    return { sheet, weight, result, count };
  });

  const overallResult = preciseSum(sheetSummaries.map((item) => item.result));

  const handleCopySheet = async (sheet: TallySheet, weight: number, result: number) => {
    const lines = [
      `SHEET: ${sheet.name}`,
      `Total Weight: ${formatNumber(weight)}`,
      ...(sheet.multiplier !== 1 ? [`Multiplier: ×${formatNumber(sheet.multiplier)}`] : []),
      `Final Result: ${formatNumber(result)}`,
      `----------------------------------------`,
    ];

    sheet.grid.forEach((col, idx) => {
      const nums = col.filter((n): n is number => n !== null);
      if (nums.length > 0) {
        lines.push(`Col ${idx + 1}: ${nums.join(', ')}`);
      }
    });

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopiedSheetId(sheet.id);
      setTimeout(() => setCopiedSheetId(null), 1800);
    } catch {}
  };

  const handleCopyOverallBreakdown = async () => {
    const blocks = sheetSummaries.map(({ sheet, weight, result }) => {
      const calcLine =
        sheet.multiplier !== 1
          ? `${formatNumber(weight)} × ${formatNumber(sheet.multiplier)} = ${formatNumber(result)}`
          : formatNumber(result);
      return `${sheet.name}\n${calcLine}`;
    });

    const sumLine =
      sheetSummaries.length > 0
        ? `${sheetSummaries.map((s) => formatNumber(s.result)).join(' + ')} = ${formatNumber(
            overallResult
          )}`
        : formatNumber(overallResult);

    const text = [...blocks, sumLine].join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedOverall(true);
      setTimeout(() => setCopiedOverall(false), 1800);
    } catch {}
  };

  const resetInlineForms = () => {
    setCreatingSheet(false);
    setRenamingSheetId(null);
    setConfirmDeleteSheetId(null);
    setShowOverallBreakdown(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/95 backdrop-blur-sm animate-in fade-in duration-100">
      <div
        className="w-full max-w-[430px] bg-black border border-white/40 rounded-2xl p-3.5 shadow-2xl relative text-white flex flex-col h-[92vh] max-h-[92vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800 shrink-0">
          {showOverallBreakdown ? (
            <button
              type="button"
              onClick={() => setShowOverallBreakdown(false)}
              className="flex items-center gap-1.5 text-sm font-bold text-white hover:text-zinc-300 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Overall Total</span>
            </button>
          ) : (
            <h3 className="text-base font-bold text-white tracking-tight">Sheets</h3>
          )}
          <div className="flex items-center gap-1.5">
            {showOverallBreakdown && (
              <button
                type="button"
                onClick={handleCopyOverallBreakdown}
                className="px-2.5 py-1 rounded-lg border border-zinc-700 hover:border-white text-xs font-bold text-white flex items-center gap-1 cursor-pointer"
              >
                {copiedOverall ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                resetInlineForms();
                onClose();
              }}
              className="p-1 text-zinc-400 hover:text-white cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {showOverallBreakdown ? (
          <>
            <div className="flex-1 overflow-y-auto py-4 px-1 space-y-5 font-mono">
              {sheetSummaries.map(({ sheet, weight, result }) => (
                <div key={sheet.id} className="space-y-1">
                  <div className="text-sm font-sans font-bold text-white">
                    {sheet.name}
                  </div>
                  <div className="text-base text-zinc-300 tabular-nums">
                    {sheet.multiplier !== 1 ? (
                      <>
                        {formatNumber(weight)} × {formatNumber(sheet.multiplier)} ={' '}
                        <strong className="text-white">{formatNumber(result)}</strong>
                      </>
                    ) : (
                      <strong className="text-white">{formatNumber(result)}</strong>
                    )}
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t border-zinc-800 text-base text-zinc-300 tabular-nums leading-relaxed">
                {sheetSummaries.map((item, idx) => (
                  <React.Fragment key={item.sheet.id}>
                    {idx > 0 && <span className="text-zinc-500"> + </span>}
                    <span>{formatNumber(item.result)}</span>
                  </React.Fragment>
                ))}
                <span className="text-zinc-500"> = </span>
                <strong className="text-white text-xl font-black">
                  {formatNumber(overallResult)}
                </strong>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800 flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowOverallBreakdown(false)}
                className="flex-1 py-2 bg-white text-black font-bold text-xs rounded-xl hover:bg-zinc-200 cursor-pointer"
              >
                Back
              </button>
            </div>
          </>
        ) : (
          <>
            {/* OVERALL RESULT BUTTON (Tap to view breakdown) */}
            <button
              type="button"
              onClick={() => setShowOverallBreakdown(true)}
              className="w-full text-left bg-zinc-950 border border-white/50 hover:border-white rounded-xl px-3 py-2.5 my-2.5 shrink-0 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-[10px] font-bold tracking-wider uppercase text-zinc-400">
                <span>Overall Total</span>
                <span className="flex items-center gap-0.5 group-hover:text-white transition-colors">
                  <span>
                    {sheets.length} sheet{sheets.length === 1 ? '' : 's'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>

              <div className="text-3xl font-black font-mono text-white tabular-nums mt-0.5">
                {formatNumber(overallResult)}
              </div>

              {sheetSummaries.length > 1 && (
                <div className="text-[11px] font-mono text-zinc-400 mt-1.5 pt-1.5 border-t border-zinc-900 flex flex-wrap gap-x-1.5 gap-y-0.5">
                  {sheetSummaries.map((item, idx) => (
                    <span key={item.sheet.id}>
                      {idx > 0 && <span className="text-zinc-600 mr-1.5">+</span>}
                      <span className="text-zinc-300">{item.sheet.name}:</span>{' '}
                      <strong className="text-white">{formatNumber(item.result)}</strong>
                    </span>
                  ))}
                </div>
              )}
            </button>

        {/* SHEETS HEADER + NEW SHEET BUTTON */}
        <div className="flex items-center justify-between pb-2 shrink-0">
          <span className="text-xs font-bold text-zinc-300">
            Sheets ({sheets.length})
          </span>
          <button
            type="button"
            onClick={() => {
              setCreatingSheet((v) => !v);
              setNewSheetName('');
              setRenamingSheetId(null);
            }}
            className="px-2.5 py-1 rounded-lg bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-colors cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Sheet</span>
          </button>
        </div>

        {/* Inline New Sheet Form */}
        {creatingSheet && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = newSheetName.trim();
              if (!trimmed) return;
              onCreateSheet(trimmed);
              setNewSheetName('');
              setCreatingSheet(false);
              onClose();
            }}
            className="mb-2 flex items-center gap-1.5 shrink-0"
          >
            <input
              type="text"
              value={newSheetName}
              onChange={(e) => setNewSheetName(e.target.value)}
              placeholder="Sheet name"
              autoFocus
              className="flex-1 bg-zinc-950 border border-white/50 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white"
            />
            <button
              type="submit"
              disabled={!newSheetName.trim()}
              className="px-3 py-1.5 bg-white text-black text-xs font-bold rounded-xl disabled:opacity-40 cursor-pointer"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setCreatingSheet(false)}
              className="p-1.5 text-zinc-400 hover:text-white cursor-pointer"
              aria-label="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Scrollable Sheets List (All 20-Column Weights Visible) */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {sheetSummaries.map(({ sheet, weight, result, count }, index) => {
            const isCurrent = sheet.id === activeSheetId;
            const isCopied = copiedSheetId === sheet.id;

            return (
              <div
                key={sheet.id}
                className={`bg-zinc-950 rounded-xl p-2.5 border transition-colors ${
                  isCurrent ? 'border-white' : 'border-zinc-800'
                }`}
              >
                {/* Sheet Header */}
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-zinc-800">
                  <div className="flex-1 min-w-0">
                    {renamingSheetId === sheet.id ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const trimmed = renameSheetInput.trim();
                          if (!trimmed) return;
                          onRenameSheet(sheet.id, trimmed);
                          setRenamingSheetId(null);
                        }}
                        className="flex items-center gap-1.5 mb-1"
                      >
                        <input
                          type="text"
                          value={renameSheetInput}
                          onChange={(e) => setRenameSheetInput(e.target.value)}
                          autoFocus
                          className="flex-1 bg-black border border-white/50 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-white"
                        />
                        <button
                          type="submit"
                          disabled={!renameSheetInput.trim()}
                          className="px-2 py-1 bg-white text-black text-[11px] font-bold rounded-lg cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setRenamingSheetId(null)}
                          className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                          aria-label="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-zinc-400 font-bold">
                          #{index + 1}
                        </span>
                        <h4 className="text-sm font-bold text-white truncate">
                          {sheet.name}
                        </h4>
                        {isCurrent && (
                          <span className="px-1.5 py-0.2 rounded bg-white text-black text-[9px] font-extrabold uppercase">
                            Open
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-baseline gap-x-1.5 text-xs font-mono mt-0.5 text-zinc-400">
                      <span>
                        Weight:{' '}
                        <strong className="text-white text-sm">{formatNumber(weight)}</strong>
                      </span>
                      {sheet.multiplier !== 1 && (
                        <span className="text-[11px] text-zinc-400">
                          ({formatNumber(weight)} × {formatNumber(sheet.multiplier)} ={' '}
                          {formatNumber(result)})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sheet Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopySheet(sheet, weight, result)}
                      className="p-1.5 rounded-lg border border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white cursor-pointer"
                      title="Copy"
                      aria-label="Copy"
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRenamingSheetId(sheet.id);
                        setRenameSheetInput(sheet.name);
                        setConfirmDeleteSheetId(null);
                      }}
                      className="p-1.5 rounded-lg border border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white cursor-pointer"
                      title="Rename"
                      aria-label="Rename"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenSheet(sheet.id);
                          onClose();
                        }}
                        className="px-2 py-1 rounded-lg border border-white/60 bg-white text-black font-bold text-[11px] hover:bg-zinc-200 cursor-pointer flex items-center gap-1"
                        title="Open"
                      >
                        <FolderOpen className="w-3 h-3" />
                        <span>Open</span>
                      </button>
                    )}

                    {confirmDeleteSheetId === sheet.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteSheet(sheet.id);
                            setConfirmDeleteSheetId(null);
                          }}
                          className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteSheetId(null)}
                          className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                          aria-label="Cancel delete"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (count === 0 && sheets.length > 1) {
                            onDeleteSheet(sheet.id);
                          } else {
                            setConfirmDeleteSheetId(sheet.id);
                          }
                        }}
                        className="p-1.5 rounded-lg border border-zinc-800 hover:border-rose-700 text-zinc-400 hover:text-rose-400 cursor-pointer"
                        title="Delete sheet"
                        aria-label="Delete sheet"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* DYNAMIC TIERS DISPLAYED DIRECTLY (5 -> 10 -> 20 -> 30...) */}
                <div className="pt-2 space-y-2">
                  {(() => {
                    const displayGrid = normalizeGrid(sheet.grid);
                    const tierSize = displayGrid.length <= 5 ? 5 : 10;
                    const tierCount = Math.ceil(displayGrid.length / tierSize);
                    const gridColsClass = tierSize === 5 ? 'grid-cols-5' : 'grid-cols-10';
                    return Array.from({ length: tierCount }).map((_, tierIdx) => {
                      const slice = displayGrid.slice(
                        tierIdx * tierSize,
                        (tierIdx + 1) * tierSize
                      );
                      return (
                        <div
                          key={tierIdx}
                          className="border border-zinc-900 rounded-lg p-1.5 bg-black"
                        >
                          <div
                            className={`grid ${gridColsClass} text-center font-mono border-b border-white/40 pb-1 text-white font-bold ${
                              tierSize === 5 ? 'text-xs' : 'text-[10px]'
                            }`}
                          >
                            {slice.map((col, cIdx) => {
                              const filled = col
                                ? col.filter((n): n is number => n !== null)
                                : [];
                              return (
                                <div key={cIdx} className="truncate px-0.5">
                                  {filled.length === 5
                                    ? formatNumber(preciseSum(filled))
                                    : '---'}
                                </div>
                              );
                            })}
                          </div>
                          <div
                            className={`grid ${gridColsClass} divide-x divide-zinc-900 text-center font-mono pt-1 ${
                              tierSize === 5 ? 'text-xs' : 'text-[11px]'
                            }`}
                          >
                            {slice.map((col, colIdx) => (
                              <div key={colIdx} className="space-y-0.5">
                                {(col || []).map((val, rowIdx) => (
                                  <div
                                    key={rowIdx}
                                    className={`flex items-center justify-center ${
                                      tierSize === 5 ? 'h-5' : 'h-4'
                                    } ${
                                      val !== null
                                        ? 'text-white font-semibold'
                                        : 'text-zinc-800'
                                    }`}
                                  >
                                    {val !== null ? formatNumber(val) : '·'}
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-zinc-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={() => {
              resetInlineForms();
              onClose();
            }}
            className="w-full py-2 bg-white text-black font-bold text-xs rounded-xl hover:bg-zinc-200 cursor-pointer"
          >
            Done
          </button>
        </div>
          </>
        )}
      </div>
    </div>
  );
};
