// Color Swatch and CSS Mapping Utility for Giriraj Catalog and Storefront

export interface ColorMeta {
  hex: string;
  isLight?: boolean;
  label: string;
}

export const COMMON_COLOR_MAP: Record<string, ColorMeta> = {
  red: { hex: '#dc2626', label: 'Red' },
  white: { hex: '#ffffff', isLight: true, label: 'White' },
  black: { hex: '#0f172a', label: 'Black' },
  green: { hex: '#16a34a', label: 'Green' },
  blue: { hex: '#2563eb', label: 'Blue' },
  yellow: { hex: '#eab308', isLight: true, label: 'Yellow' },
  grey: { hex: '#64748b', label: 'Grey' },
  gray: { hex: '#64748b', label: 'Gray' },
  brown: { hex: '#78350f', label: 'Brown' },
  orange: { hex: '#ea580c', label: 'Orange' },
  purple: { hex: '#9333ea', label: 'Purple' },
  pink: { hex: '#db2777', label: 'Pink' },
  gold: { hex: '#d97706', label: 'Gold' },
  silver: { hex: '#94a3b8', label: 'Silver' },
  ivory: { hex: '#fefce8', isLight: true, label: 'Ivory' },
  copper: { hex: '#b45309', label: 'Copper' },
};

/**
 * Returns the hex code and lighting properties for a color name.
 * Falls back to a refined neutral slate dot (#94a3b8) if color is not found.
 */
export function getColorInfo(colorName: string): { hex: string; isLight: boolean; label: string } {
  const normalized = colorName.trim().toLowerCase();
  const match = COMMON_COLOR_MAP[normalized];
  if (match) {
    return {
      hex: match.hex,
      isLight: Boolean(match.isLight),
      label: colorName.trim(),
    };
  }

  // Check if string itself is a valid hex code (e.g. #ff0000)
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalized)) {
    return {
      hex: normalized,
      isLight: normalized.toLowerCase() === '#fff' || normalized.toLowerCase() === '#ffffff',
      label: colorName.trim(),
    };
  }

  // Fallback to neutral gray swatch
  return {
    hex: '#94a3b8',
    isLight: false,
    label: colorName.trim(),
  };
}
