import React, { useState } from 'react';
import { Tag as TagIcon, X, Plus } from 'lucide-react';

interface TagsInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

const COMMON_TAGS = [
  'copper',
  'flame-retardant',
  'heavy-duty',
  'isi-certified',
  'bestseller',
  'fast-moving',
  'tmt-550d',
  'waterproof',
  'high-tensile',
  'emergency-stock',
];

export function TagsInput({ tags, onChange }: TagsInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addTag = (text: string) => {
    const clean = text.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
    if (clean && !tags.includes(clean)) {
      onChange([...tags, clean]);
    }
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((t) => t !== tagToRemove));
  };

  const availableSuggestions = COMMON_TAGS.filter((t) => !tags.includes(t));

  return (
    <div className="space-y-2" id="product-tags-input-section">
      <label className="block text-sm font-semibold text-slate-800">
        Search & Filter Tags
      </label>
      <p className="text-xs text-slate-500">
        Type keywords and press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-[10px] font-mono">Enter</kbd> or comma to add. Used for in-app search matching.
      </p>

      {/* Main Tag Input Container */}
      <div className="min-h-[44px] p-2 bg-white border border-slate-200 rounded-xl flex flex-wrap items-center gap-1.5 focus-within:ring-2 focus-within:ring-amber-500 focus-within:border-amber-500 transition">
        <TagIcon className="w-4 h-4 text-slate-400 ml-1 shrink-0" />
        
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium animate-in fade-in zoom-in-95 duration-150"
          >
            #{tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="p-0.5 text-amber-700 hover:text-rose-600 rounded-full hover:bg-amber-200/50 transition"
              title={`Remove #${tag}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        <input
          id="input-product-tag-field"
          type="text"
          placeholder={tags.length === 0 ? "e.g. copper, flame-retardant, 90m..." : "Add tag..."}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => inputValue && addTag(inputValue)}
          className="flex-1 min-w-[120px] text-xs px-2 py-1 bg-transparent focus:outline-none placeholder:text-slate-400 text-slate-800"
        />
      </div>

      {/* Suggested Tag Chips */}
      {availableSuggestions.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-[11px] text-slate-500 font-medium">Quick suggestions:</span>
          {availableSuggestions.slice(0, 6).map((suggested) => (
            <button
              key={suggested}
              type="button"
              onClick={() => addTag(suggested)}
              className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 font-medium transition flex items-center gap-0.5"
            >
              <Plus className="w-2.5 h-2.5" />
              {suggested}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
