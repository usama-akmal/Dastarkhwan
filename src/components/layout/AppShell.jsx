import React from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';

/**
 * App frame.
 *
 * The header is sticky rather than fixed and the main region is a normal document
 * flow, so the page scrolls the way a browser expects — the previous fixed header
 * plus fixed nav needed hardcoded `padding-top: 70px` offsets that drifted out of
 * sync with the header's real height. The content column is width-capped so the
 * layout keeps a comfortable measure on tablets and desktop.
 */
export const AppShell = ({ children }) => (
  <div className="app-shell">
    {/* Keyboard users land here first, and can jump the fixed chrome. */}
    <a className="skip-link" href="#main-content">Skip to content</a>

    <Header />

    <main id="main-content" className="app-main animate-fade-in" tabIndex={-1}>
      {children}
    </main>

    <BottomNav />
  </div>
);

export default AppShell;
