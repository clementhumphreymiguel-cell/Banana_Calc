import React, { useState, useEffect } from 'react';
import { X, BookmarkCheck } from 'lucide-react';
import { formatNumber } from '../utils/format';

interface SaveListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, startNewSheet: boolean) => void;
  totalWeight: number;
  multiplier: number;
  calculatedTotal: number;
  initialName?: string | null;
}

const SUGGESTIONS = [
  'Tundan Good',
  'Tundan RX',
  'Cardava Good',
  'Cardava RX',
  'Lakatan',
  'Saba',
  'Batch 1',
  'Batch 2',
];

export const SaveListModal: React.FC<SaveListModalProps> = ({
  isOpen,
  onClose,
  onSave,
  totalWeight,
  multiplier,
  calculatedTotal,
  initialName,
}) => {
  const [name, setName] = useState(initialName || '');

  useEffect(() => {
    if (isOpen) {
      setName(initialName || '');
    }
  }, [isOpen, initialName]);

  if (!isOpen) return null;

  const handleAction = (startNewSheet: boolean) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed, startNewSheet);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xs animate-in fade-in duration-100">
      <div
        className="w-full max-w-xs bg-zinc-950 border border-white/20 rounded-2xl p-4 shadow-2xl relative text-white"
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <BookmarkCheck className="w-5 h-5 text-white shrink-0" />
          <h3 className="text-sm font-bold text-white leading-tight">Save Sheet</h3>
        </div>

        {/* Summary preview (Weight highlighted) */}
        <div className="bg-black border border-zinc-800 rounded-xl p-2.5 mb-3 text-xs font-mono">
          <div className="flex items-center justify-between font-bold">
            <span className="text-zinc-300">Total:</span>
            <span className="text-white text-sm">{formatNumber(totalWeight)}</span>
          </div>
          {multiplier !== 1 && (
            <div className="text-[10px] text-zinc-400 text-right mt-0.5">
              ({formatNumber(totalWeight)} × {formatNumber(multiplier)} ={' '}
              {formatNumber(calculatedTotal)})
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAction(false);
          }}
          className="flex flex-col gap-3"
        >
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">
              Name:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sheet name"
              autoFocus
              className="w-full bg-black border border-white/40 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white"
            />
          </div>

          {/* Quick Suggestions */}
          <div className="flex flex-wrap gap-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setName(s)}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                  name === s
                    ? 'bg-white text-black font-bold'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1.5 mt-1 pt-2 border-t border-zinc-800">
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={!name.trim()}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-white text-black hover:bg-zinc-200 disabled:opacity-50 transition-colors cursor-pointer"
              >
                Save
              </button>
              <button
                type="button"
                disabled={!name.trim()}
                onClick={() => handleAction(true)}
                className="flex-1 py-2 rounded-xl text-xs font-bold border border-white/70 bg-black text-white hover:bg-zinc-900 disabled:opacity-50 transition-colors cursor-pointer"
              >
                Save & New
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-1.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
