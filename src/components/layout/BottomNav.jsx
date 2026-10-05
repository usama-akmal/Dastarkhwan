import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../ui/Icon';

const TABS = [
  { path: '/', label: 'Home', icon: 'home' },
  { path: '/calendar', label: 'Calendar', icon: 'calendar' },
  { path: '/recipes', label: 'Recipes', icon: 'recipes' },
  { path: '/family', label: 'Family', icon: 'family' },
  { path: '/settings', label: 'Settings', icon: 'settings' },
];

/**
 * Primary navigation.
 *
 * Emoji icons were replaced with drawn SVG icons so the bar looks the same on every
 * platform, and the active tab is now signalled by an indicator bar plus
 * `aria-current` rather than by colour alone.
 */
export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="bottom-nav" aria-label="Primary">
      {TABS.map((tab) => {
        const isActive = location.pathname === tab.path;
        return (
          <button
            key={tab.path}
            type="button"
            className="bottom-nav__tab"
            onClick={() => navigate(tab.path)}
            aria-current={isActive ? 'page' : undefined}
            aria-label={tab.label}
          >
            <Icon name={tab.icon} size={22} className="bottom-nav__icon" />
            <span className="bottom-nav__label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
