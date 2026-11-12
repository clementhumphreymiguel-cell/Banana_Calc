import React, { useState } from 'react';
import { X, RotateCcw, Copy, Check, Hash, Scale, Undo2 } from 'lucide-react';
import { formatNumber } from '../utils/format';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  multiplier: number;
  onMultiplierChange: (mult: number) => void;
  onClearSheet: () => void;
  onUndo: () => void;
  canUndo: boolean;
  columnsData: (number | null)[][];
  overallTotal: number;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  multiplier,
  onMultiplierChange,
  onClearSheet,
  onUndo,
  canUndo,
  columnsData,
  overallTotal,
}) => {
  const [multInput, setMultInput] = useState(multiplier.toString());
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSaveMultiplier = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(multInput);
    if (Number.isFinite(val) && val >= 0) {
      onMultiplierChange(val);
    }
  };

  const handleCopySummary = async () => {
    // Generate text summary
    const lines = [
      '=== WEIGHING TALLY SHEET ===',
      `Columns:`,
    ];

    columnsData.forEach((col, idx) => {
      const nums = col.filter((n): n is number => n !== null);
      const colSum = nums.length === 5 ? nums.reduce((a, b) => a + b, 0) : '---';
      lines.push(`Col ${idx + 1} (Sum: ${colSum}): ${nums.join(', ') || 'empty'}`);
    });

    lines.push(`---------------------------`);
    lines.push(`OVERALL TOTAL WEIGHT: ${formatNumber(overallTotal)}`);
    if (multiplier > 1) {
      lines.push(`MULTIPLIER: ×${multiplier}`);
      lines.push(`FINAL RESULT: ${formatNumber(overallTotal * multiplier)}`);
    }

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-100">
      <div
        className="w-full max-w-xs bg-zinc-950 border border-white/20 rounded-2xl p-4 shadow-2xl relative text-white"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <span className="text-sm font-bold tracking-tight">Settings</span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Multiplier setting */}
        <form onSubmit={handleSaveMultiplier} className="py-3 border-b border-zinc-800">
          <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
            Multiplier (Price / Factor):
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 font-mono text-sm">
                ×
              </span>
              <input
                type="number"
                step="any"
                value={multInput}
                onChange={(e) => setMultInput(e.target.value)}
                placeholder="1"
                className="w-full bg-black border border-white/30 rounded-xl pl-7 pr-3 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-white"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-white text-black font-bold text-xs rounded-xl hover:bg-zinc-200 cursor-pointer"
            >
              Set
            </button>
          </div>
          {multiplier > 1 && (
            <div className="text-[11px] text-zinc-400 mt-1.5 font-mono">
              Calculated: {formatNumber(overallTotal)} × {multiplier} ={' '}
              <strong className="text-white">{formatNumber(overallTotal * multiplier)}</strong>
            </div>
          )}
        </form>

        {/* Actions list */}
        <div className="py-2.5 space-y-1.5">
          <button
            type="button"
            onClick={handleCopySummary}
            className="w-full py-2 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-semibold flex items-center justify-between text-left cursor-pointer transition-colors"
          >
            <span className="flex items-center gap-2">
              <Copy className="w-3.5 h-3.5 text-zinc-400" />
              <span>Copy Sheet Summary</span>
            </span>
            {copied && <span className="text-[10px] text-emerald-400 font-bold">Copied!</span>}
          </button>

          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="w-full py-2 px-3 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 border border-zinc-800 rounded-xl text-xs font-semibold flex items-center gap-2 text-left cursor-pointer transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5 text-zinc-400" />
            <span>Undo Last Number</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (window.confirm('Clear all numbers on this sheet?')) {
                onClearSheet();
                onClose();
              }
            }}
            className="w-full py-2 px-3 bg-zinc-900 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 border border-zinc-800 rounded-xl text-xs font-semibold flex items-center gap-2 text-left cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear All Numbers</span>
          </button>
        </div>

        {/* Done */}
        <div className="pt-2 border-t border-zinc-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 bg-white text-black font-bold text-xs rounded-xl hover:bg-zinc-200 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
