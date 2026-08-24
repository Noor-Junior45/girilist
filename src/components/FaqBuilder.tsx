import React from 'react';
import { FaqItem } from '../types';
import { Plus, Trash2, HelpCircle, MessageSquarePlus } from 'lucide-react';

interface FaqBuilderProps {
  items: FaqItem[];
  onChange: (items: FaqItem[]) => void;
}

const FAQ_SUGGESTIONS = [
  'Is this product genuine and ISI certified?',
  'What is the standard warranty and return policy?',
  'Is this suitable for residential or commercial wiring?',
  'What is the maximum current/load capacity?',
  'How quickly can this item be delivered on-site?',
];

export function FaqBuilder({ items, onChange }: FaqBuilderProps) {
  const handleAdd = (defaultQ: string = '') => {
    const newItem: FaqItem = {
      id: Math.random().toString(36).substring(2, 9),
      q: defaultQ,
      a: '',
    };
    onChange([...items, newItem]);
  };

  const handleUpdate = (id: string, field: 'q' | 'a', value: string) => {
    const updated = items.map((item) => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });
    onChange(updated);
  };

  const handleRemove = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-3" id="faq-builder-section">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <label className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-amber-600" />
            Frequently Asked Questions (FAQs)
          </label>
          <p className="text-xs text-slate-500">
            Provide common buyer questions & answers. Displayed in an accordion on the storefront app.
          </p>
        </div>

        <button
          type="button"
          id="btn-add-faq-row"
          onClick={() => handleAdd()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 rounded-lg text-xs font-semibold transition shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Add FAQ
        </button>
      </div>

      {/* Suggested FAQ Questions */}
      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 flex-wrap text-xs">
        <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
          <MessageSquarePlus className="w-3 h-3 text-amber-500" /> Sample Questions:
        </span>
        {FAQ_SUGGESTIONS.slice(0, 3).map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => handleAdd(suggestion)}
            className="px-2 py-0.5 rounded-md bg-white border border-slate-300 text-slate-700 hover:border-amber-400 hover:text-amber-700 text-[11px] font-medium transition truncate max-w-[260px]"
            title={suggestion}
          >
            + {suggestion}
          </button>
        ))}
      </div>

      {/* FAQ Rows */}
      {items.length === 0 ? (
        <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-500 bg-slate-50/40">
          No FAQs created for this product yet. Click <strong>"Add FAQ"</strong> to create common customer Q&As.
        </div>
      ) : (
        <div className="space-y-3" id="faq-list-rows">
          {items.map((item, index) => (
            <div
              key={item.id}
              id={`faq-row-${index}`}
              className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2 relative group hover:border-slate-300 transition"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  FAQ #{index + 1}
                </span>
                <button
                  type="button"
                  id={`btn-remove-faq-${index}`}
                  onClick={() => handleRemove(item.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                  title="Remove this FAQ"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <input
                  id={`faq-question-input-${index}`}
                  type="text"
                  placeholder="Question (e.g. Is this wire 100% pure electrolytic copper?)"
                  value={item.q}
                  onChange={(e) => handleUpdate(item.id, 'q', e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder:font-normal placeholder:text-slate-400"
                />
              </div>

              <div>
                <textarea
                  id={`faq-answer-input-${index}`}
                  rows={2}
                  placeholder="Answer (e.g. Yes, Havells Life Line Plus wires use 99.97% pure oxygen-free copper...)"
                  value={item.a}
                  onChange={(e) => handleUpdate(item.id, 'a', e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-slate-400"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
