// Theme catalog — Harborline product palette. Single palette, dark + light modes,
// paired with neutral Windows system chrome (palette-agnostic wallpaper +
// taskbar) so the menu is the only thing carrying palette colors.

const SYSTEM_CHROME = {
  dark: {
    // macOS Sonoma-style dark desktop. Subtle gradient, no chromatic tilt
    // toward the menu's palette so the brand reads cleanly.
    wallpaper:
      'linear-gradient(160deg, #2c2f36 0%, #1d2026 45%, #14171c 100%)',
    // Translucent dark menu bar with blur — characteristic of macOS Big
    // Sur+ system chrome.
    menuBar:        'rgba(30,30,32,0.65)',
    menuBarBorder:  'rgba(255,255,255,0.07)',
    menuBarText:    'rgba(255,255,255,0.85)',
    menuBarDim:     'rgba(255,255,255,0.55)',
    menuBarAccent:  'rgba(255,255,255,0.95)',
    // Aliases keep the older "taskbar*" token names working; mac menubar
    // uses the same role.
    taskbar:        'rgba(30,30,32,0.65)',
    taskbarBorder:  'rgba(255,255,255,0.07)',
    taskbarText:    'rgba(255,255,255,0.85)',
    taskbarDim:     'rgba(255,255,255,0.55)',
    taskbarAccent:  'rgba(255,255,255,0.95)',
  },
  light: {
    wallpaper:
      'linear-gradient(160deg, #d0d8e2 0%, #b8c4d2 45%, #98a7b8 100%)',
    menuBar:        'rgba(244,244,244,0.78)',
    menuBarBorder:  'rgba(0,0,0,0.08)',
    menuBarText:    'rgba(0,0,0,0.85)',
    menuBarDim:     'rgba(0,0,0,0.5)',
    menuBarAccent:  'rgba(0,0,0,0.95)',
    taskbar:        'rgba(244,244,244,0.78)',
    taskbarBorder:  'rgba(0,0,0,0.08)',
    taskbarText:    'rgba(0,0,0,0.85)',
    taskbarDim:     'rgba(0,0,0,0.5)',
    taskbarAccent:  'rgba(0,0,0,0.95)',
  },
};

const THEME_PALETTES = [
  {
    id: 'harborline',
    name: 'Harborline',
    swatch: ['#15171c', '#0f62fe', '#e97c48'],
    accent: '#0f62fe',        // product interactive blue (used for swatches etc)
    accentBright: '#7ab8ff',
    // Beacon-amber live/signal accent; `metal*` names kept as aliases for
    // older canvas files.
    signal: '#e97c48',
    metal: '#e97c48',
    metalBright: '#e97c48',
    danger: '#b42318',
    dark: {
      bg:'#15171c', bgSoft:'#1e2128', surface:'#1a1d22',
      text:'#dde2ea', textDim:'rgba(221,226,234,0.62)', textMuted:'rgba(221,226,234,0.42)',
      border:'rgba(122,184,255,0.18)',
      shadow:'rgba(0,0,0,0.7)',
      // Per-mode accents: dark mode uses the product's dark-surface blue.
      accent:       '#7ab8ff',
      accentBright: '#a8d0ff',
      signal:       '#e97c48',
      danger:       '#ff8a80',
    },
    light: {
      bg:'#dde0e6', bgSoft:'#c8cdd6', surface:'#d2d6df',
      text:'#15171c', textDim:'rgba(21,23,28,0.7)', textMuted:'rgba(21,23,28,0.55)',
      border:'rgba(21,23,28,0.18)',
      shadow:'rgba(21,23,28,0.22)',
      // Per-mode accents: light mode uses the product interactive blue;
      // accentBright is darker (text-grade AA), opposite of dark mode.
      accent:       '#0f62fe',
      accentBright: '#0043ce',
      signal:       '#9a4719',
      danger:       '#b42318',
    },
  },
];

function getTheme(paletteId, mode) {
  const p = THEME_PALETTES[0];
  const base = mode === 'light' ? p.light : p.dark;
  const chrome = SYSTEM_CHROME[mode] || SYSTEM_CHROME.dark;
  return {
    ...base,
    ...chrome,
    // Mode-specific accents take precedence so light mode can ship a darker
    // cyan that has enough contrast on the cool-gray surface.
    accent:       base.accent       || p.accent,
    accentBright: base.accentBright || p.accentBright,
    danger:       base.danger       || p.danger,
    signal:       base.signal       || p.signal,
    metal:        base.signal       || p.signal,
    metalBright:  base.signal       || p.signal,
    paletteName: p.name,
    paletteId: p.id,
    mode,
  };
}

Object.assign(window, { THEME_PALETTES, SYSTEM_CHROME, getTheme });
