// Theme catalog — Engine Room locked. Single palette, dark + light modes,
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
    id: 'engine-room',
    name: 'Engine Room',
    swatch: ['#15171c', '#5fb8e0', '#7a5a28'],
    accent: '#5fb8e0',        // canonical brand cyan (used for swatches etc)
    accentBright: '#a3dcf5',
    metal: '#7a5a28',
    metalBright: '#b8893d',
    danger: '#e87560',
    dark: {
      bg:'#15171c', bgSoft:'#1e2128', surface:'#1a1d22',
      text:'#dde2ea', textDim:'rgba(221,226,234,0.62)', textMuted:'rgba(221,226,234,0.42)',
      border:'rgba(95,184,224,0.18)',
      shadow:'rgba(0,0,0,0.7)',
      // Per-mode accents: dark mode uses the bright cyan since it sits on
      // near-black surfaces.
      accent:       '#5fb8e0',
      accentBright: '#a3dcf5',
      danger:       '#e87560',
    },
    light: {
      bg:'#dde0e6', bgSoft:'#c8cdd6', surface:'#d2d6df',
      text:'#15171c', textDim:'rgba(21,23,28,0.7)', textMuted:'rgba(21,23,28,0.55)',
      border:'rgba(21,23,28,0.18)',
      shadow:'rgba(21,23,28,0.22)',
      // Per-mode accents: light mode uses a deeper, more saturated cyan so
      // it carries enough contrast on cool-gray surfaces. accentBright is
      // even darker (used for emphasized text), opposite of dark mode.
      accent:       '#1d6f9a',
      accentBright: '#0f5277',
      danger:       '#a13325',
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
    metal:        p.metal,
    metalBright:  p.metalBright,
    paletteName: p.name,
    paletteId: p.id,
    mode,
  };
}

Object.assign(window, { THEME_PALETTES, SYSTEM_CHROME, getTheme });
