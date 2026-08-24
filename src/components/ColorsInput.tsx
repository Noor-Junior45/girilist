import React, { useState } from 'react';
import { Palette, X, Plus } from 'lucide-react';
import { getColorInfo } from '../lib/colorUtils';

interface ColorsInputProps {
  colors: string[];
  onChange: (colors: string[]) => void;
}

const QUICK_COLORS = ['Red', 'Black', 'Green', 'Blue', 'Yellow', 'White', 'Grey'];

export function ColorsInput({ colors, onChange }: ColorsInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addColor = (rawName: string) => {
    const trimmed = rawName.trim();
    if (!trimmed) return;

    // Capitalize first letter cleanly (e.g., 'red' -> 'Red')
    const formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);

    // Prevent duplicates (case-insensitive)
    const exists = colors.some((c) => c.toLowerCase() === formatted.toLowerCase());
    if (!exists) {
      onChange([...colors, formatted]);
    }
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addColor(inputValue);
    } else if (e.key === 'Backspace' && inputValue === '' && colors.length > 0) {
      onChange(colors.slice(0, -1));
    }
  };

  const removeColor = (colorToRemove: string) => {
    onChange(colors.filter((c) => c.toLowerCase() !== colorToRemove.toLowerCase()));
  };

  const availableQuickColors = QUICK_COLORS.filter(
    (qc) => !colors.some((c) => c.toLowerCase() === qc.toLowerCase())
  );

  return (
    <div className="space-y-2" id="product-colors-input-section">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-slate-800 flex items-center gap-1.5">
          <Palette className="w-4 h-4 text-amber-500" />
          Color Variants <span className="text-xs font-normal text-slate-400">(Optional)</span>
        </label>
        {colors.length > 0 && (
          <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {colors.length} {colors.length === 1 ? 'color' : 'colors'}
          </span>
        )}
      </div>

      <p className="text-xs text-slate-500">
        Add color options for items with variants (e.g. wires, switches, faceplates). Leave empty for standard products (cement, TMT bars, pipes).
      </p>

      {/* Main Colors Input Container */}
      <div className="min-h-[44px] p-2 bg-white border border-slate-200 rounded-xl flex flex-wrap items-center gap-1.5 focus-within:ring-2 focus-within:ring-amber-500 focus-within:border-amber-500 transition">
        {colors.map((colorName) => {
          const colorMeta = getColorInfo(colorName);
          return (
            <span
              key={colorName}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 text-xs font-medium animate-in fade-in zoom-in-95 duration-150 shadow-2xs"
            >
              {/* Color Dot Swatch */}
              <span
                className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                  colorMeta.isLight ? 'border border-slate-300 shadow-2xs' : 'shadow-2xs'
                }`}
                style={{ backgroundColor: colorMeta.hex }}
                aria-hidden="true"
              />
              <span>{colorName}</span>
              <button
                type="button"
                onClick={() => removeColor(colorName)}
                className="p-0.5 text-slate-400 hover:text-rose-600 rounded-full hover:bg-slate-200 transition ml-0.5"
                title={`Remove ${colorName}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}

        <div className="flex-1 flex items-center min-w-[140px]">
          <input
            id="input-product-color-field"
            type="text"
            placeholder={colors.length === 0 ? "Type color (e.g. Red, Black)..." : "Add more..."}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full text-xs px-2 py-1 bg-transparent focus:outline-none placeholder:text-slate-400 text-slate-800"
          />
          {inputValue.trim() && (
            <button
              type="button"
              onClick={() => addColor(inputValue)}
              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] rounded-lg transition shrink-0 mr-1"
            >
              Add
            </button>
          )}
        </div>
      </div>

      {/* Quick Color Suggestions */}
      {availableQuickColors.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-[11px] text-slate-500 font-medium">Quick add:</span>
          {availableQuickColors.map((quickColor) => {
            const meta = getColorInfo(quickColor);
            return (
              <button
                key={quickColor}
                type="button"
                onClick={() => addColor(quickColor)}
                className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-medium transition flex items-center gap-1.5 border border-slate-200/60"
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    meta.isLight ? 'border border-slate-300' : ''
                  }`}
                  style={{ backgroundColor: meta.hex }}
                />
                <Plus className="w-2.5 h-2.5 text-slate-400" />
                {quickColor}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
