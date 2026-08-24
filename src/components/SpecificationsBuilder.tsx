import React from 'react';
import { SpecificationItem, ProductCategory } from '../types';
import { Plus, Trash2, Sliders, Sparkles } from 'lucide-react';

interface SpecificationsBuilderProps {
  items: SpecificationItem[];
  onChange: (items: SpecificationItem[]) => void;
  category?: ProductCategory;
}

const ELECTRICAL_PRESETS = [
  'Conductor Size',
  'Core Type',
  'Voltage Rating',
  'Current Rating (A)',
  'Conductor Material',
  'Insulation Material',
  'Flame Retardant',
  'Standard / ISI Mark',
  'Warranty',
];

const CONSTRUCTION_PRESETS = [
  'Grade / Standard',
  'Diameter / Thickness',
  'Material',
  'Length / Dimensions',
  'Weight / Pack Size',
  'Yield Strength (MPa)',
  'Corrosion Resistance',
  'Application Area',
  'Certification',
];

export function SpecificationsBuilder({ items, onChange, category = 'electrical' }: SpecificationsBuilderProps) {
  const handleAdd = (defaultKey: string = '') => {
    const newItem: SpecificationItem = {
      id: `spec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      key: defaultKey,
      value: '',
    };
    onChange([...items, newItem]);
  };

  const handleUpdate = (targetId: string, index: number, field: 'key' | 'value', value: string) => {
    const updated = items.map((item, idx) => {
      if ((item.id && item.id === targetId) || idx === index) {
        return { 
          ...item, 
          id: item.id || targetId || `spec-${idx}`,
          [field]: value 
        };
      }
      return item;
    });
    onChange(updated);
  };

  const handleRemove = (targetId: string, index: number) => {
    onChange(
      items.filter((item, idx) => {
        if (item.id && targetId) {
          return item.id !== targetId;
        }
        return idx !== index;
      })
    );
  };

  const presets = category === 'electrical' ? ELECTRICAL_PRESETS : CONSTRUCTION_PRESETS;
  const existingKeys = new Set(items.map((i) => (i.key || '').trim().toLowerCase()));
  const availablePresets = presets.filter((p) => !existingKeys.has(p.toLowerCase()));

  return (
    <div className="space-y-3" id="specifications-builder-section">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <label className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-amber-600" />
            Technical Specifications
          </label>
          <p className="text-xs text-slate-500">
            Define key-value pairs (e.g. "Wire Gauge": "1.5 Sqmm"). Saved as structured JSON for product filtering.
          </p>
        </div>

        <button
          type="button"
          id="btn-add-spec-row"
          onClick={() => handleAdd()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 rounded-lg text-xs font-semibold transition shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Specification
        </button>
      </div>

      {/* Suggested Quick Presets */}
      {availablePresets.length > 0 && (
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 flex-wrap text-xs">
          <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" /> Quick Add:
          </span>
          {availablePresets.slice(0, 5).map((preset) => (
            <button
              key={preset}
              type="button"
              id={`btn-preset-spec-${preset.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => handleAdd(preset)}
              className="px-2 py-0.5 rounded-md bg-white border border-slate-300 text-slate-700 hover:border-amber-400 hover:text-amber-700 text-[11px] font-medium transition"
            >
              + {preset}
            </button>
          ))}
        </div>
      )}

      {/* Specification Rows */}
      {items.length === 0 ? (
        <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-500 bg-slate-50/40">
          No technical specifications added yet. Click <strong>"Add Specification"</strong> or choose a quick template above.
        </div>
      ) : (
        <div className="space-y-2" id="specs-list-rows">
          {items.map((item, index) => {
            const itemId = item.id || `spec-row-item-${index}`;
            const keyVal = item.key ?? '';
            const valueVal = item.value ?? '';

            return (
              <div
                key={itemId}
                id={`spec-row-${index}`}
                className="flex items-center gap-2 p-2 bg-slate-50/80 rounded-xl border border-slate-200/80 hover:border-slate-300 transition"
              >
                <div className="flex-1 min-w-0">
                  <input
                    id={`spec-key-input-${index}`}
                    type="text"
                    placeholder="Specification Label (e.g. Conductor Size)"
                    value={keyVal}
                    onChange={(e) => handleUpdate(itemId, index, 'key', e.target.value)}
                    className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 placeholder:text-slate-400"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <input
                    id={`spec-value-input-${index}`}
                    type="text"
                    placeholder="Value (e.g. 1.5 Sqmm Copper, 90m Coil)"
                    value={valueVal}
                    onChange={(e) => handleUpdate(itemId, index, 'value', e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 placeholder:text-slate-400"
                  />
                </div>
                <button
                  type="button"
                  id={`btn-remove-spec-${index}`}
                  onClick={() => handleRemove(itemId, index)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0"
                  title="Delete this specification"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
