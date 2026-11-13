import React, { useState, useEffect } from 'react';
import { X, BookmarkCheck } from 'lucide-react';
import { formatNumber } from '../utils/format';

interface SaveListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setName('');
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
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <BookmarkCheck className="w-5 h-5 text-white" />
          <h3 className="text-sm font-bold text-white">Save Current List</h3>
        </div>

        {/* Summary preview */}
        <div className="bg-black border border-zinc-800 rounded-xl p-2.5 mb-3 text-xs font-mono">
          <div className="flex items-center justify-between font-bold">
            <span className="text-zinc-300">Total:</span>
            <span className="text-white text-sm">{formatNumber(calculatedTotal)}</span>
          </div>
          {multiplier > 1 && (
            <div className="text-[10px] text-zinc-400 text-right mt-0.5">
              ({formatNumber(totalWeight)} × {multiplier})
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">
              List Name:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tundan Good, Cardava RX..."
              autoFocus
              className="w-full bg-black border border-white/40 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white"
            />
          </div>

          {/* Quick Suggestions */}
          <div>
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
              Suggestions:
            </span>
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
          </div>

          <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-black hover:bg-zinc-200 disabled:opacity-50 transition-colors cursor-pointer"
            >
              Save & Start New
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
