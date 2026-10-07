import { DEFAULT_SYMBOL_MAP } from '../../utils/punctuation';
import type { SymbolMap } from '../../types/dictation';

interface SymbolSettingsProps {
  symbolMap: SymbolMap;
  onChange: (map: SymbolMap) => void;
}

export function SymbolSettings({ symbolMap, onChange }: SymbolSettingsProps) {
  const symbols = Object.keys(DEFAULT_SYMBOL_MAP);

  const updateSymbol = (symbol: string, word: string) => {
    onChange({ ...symbolMap, [symbol]: word });
  };

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
        Symbol pronunciation
      </p>
      <div className="grid max-h-64 grid-cols-1 gap-1.5 overflow-y-auto pr-1">
        {symbols.map((symbol) => (
          <div key={symbol} className="flex items-center gap-2">
            <span className="w-8 shrink-0 rounded bg-slate-100 py-1 text-center font-mono text-sm dark:bg-slate-800">
              {symbol}
            </span>
            <input
              type="text"
              value={symbolMap[symbol] ?? DEFAULT_SYMBOL_MAP[symbol]}
              onChange={(e) => updateSymbol(symbol, e.target.value)}
              aria-label={`Pronunciation for ${symbol}`}
              className="flex-1 rounded border border-slate-300 bg-transparent px-2 py-1 text-sm dark:border-slate-700"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
