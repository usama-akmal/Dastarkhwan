import React from 'react';

/**
 * Icon set.
 *
 * The app previously used emoji for navigation and controls (🏠 📅 🍲 👨‍👩‍👧‍👦 ⚙️,
 * ❤️ 👍 🚫). Emoji render differently on every platform — Samsung, Xiaomi and iOS
 * each draw their own glyph — so the UI could not have a consistent look, and they
 * announce poorly to screen readers. These are stroke icons drawn on a 24px grid
 * with `currentColor` and non-scaling strokes, so they inherit text colour and stay
 * crisp at any size.
 *
 * Kept deliberately small: only the icons this app actually uses, to avoid pulling
 * in an icon library for a handful of glyphs.
 */

const PATHS = {
  // Navigation
  home: 'M3 10.5 12 3l9 7.5M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5',
  calendar: 'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM4 10h16M9 3v4M15 3v4',
  recipes: 'M5 3v8a3 3 0 0 0 3 3v7M5 3v5M8 3v5M9 14h6a4 4 0 0 0 4-4V3',
  family: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6M3 20a6 6 0 0 1 12 0M17 11a3 3 0 1 0 0-6M18 20a6 6 0 0 0-3-5.2',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-3-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-3l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 3 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',

  // Preference states
  heart: 'M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1l1.7 1.7L12 21.5l7.1-7.1 1.7-1.7a5 5 0 0 0 0-7.1z',
  thumbUp: 'M7 22H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1h3m0 10 4.3 1.4a3 3 0 0 0 3.8-1.8l3-8A3 3 0 0 0 16.3 8H13V5a3 3 0 0 0-6 0v7',
  ban: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M5.6 5.6l12.8 12.8',

  // Actions
  check: 'm4.5 12.5 5 5 10-11',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  close: 'M18 6 6 18M6 6l12 12',
  arrowLeft: 'M19 12H5m7-7-7 7 7 7',
  arrowRight: 'M5 12h14m-7-7 7 7-7 7',
  chevronLeft: 'm15 6-6 6 6 6',
  chevronRight: 'm9 6 6 6-6 6',
  chevronDown: 'm6 9 6 6 6-6',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16M21 21l-4.3-4.3',
  refresh: 'M21 12a9 9 0 1 1-3.2-6.9M21 4v5h-5',
  utensils: 'M5 3v8a3 3 0 0 0 3 3v7M5 3v5M8 3v5M9 14h6a4 4 0 0 0 4-4V3',
  pot: 'M5 10h14v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4zM3 10h18M9 6c0-1 1-1.5 1-2.5M13 6c0-1 1-1.5 1-2.5',

  // Status
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 11v5M12 8h.01',
  warning: 'M10.3 4.3 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0M12 9v4M12 17h.01',
  sparkle: 'M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.4 2.4M15.3 15.3l2.4 2.4M17.7 6.3l-2.4 2.4M8.7 15.3l-2.4 2.4',

  // Theme
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8',
  monitor: 'M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM8 21h8M12 17v4',

  // Data
  download: 'M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2',
  upload: 'M12 15V3m0 0-4 4m4-4 4 4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2',
  database: 'M12 8c4.4 0 8-1.1 8-2.5S16.4 3 12 3 4 4.1 4 5.5 7.6 8 12 8M4 5.5v13C4 19.9 7.6 21 12 21s8-1.1 8-2.5v-13M4 12c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5',
  trash: 'M4 7h16M10 11v6M14 11v6M5 7l1 13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  filter: 'M4 5h16l-6 7v6l-4 2v-8z',
  bag: 'M6 8h12l1 12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1zM9 8V6a3 3 0 0 1 6 0v2',
};

export const Icon = ({ name, size = 20, strokeWidth = 2, className, style, ...rest }) => {
  const path = PATHS[name];
  if (!path) return null;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      // Icons here are always decorative: the accessible name lives on the
      // surrounding control, so exposing the artwork would only duplicate it.
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={path} />
    </svg>
  );
};

/** The heart icon is the one glyph that reads better filled than outlined. */
export const HeartIcon = ({ size = 18, filled = false, ...rest }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    {...rest}
  >
    <path d={PATHS.heart} />
  </svg>
);

export default Icon;
