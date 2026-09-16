import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/calendar', label: 'Calendar', icon: '📅' },
    { path: '/recipes', label: 'Recipes', icon: '🍲' },
    { path: '/family', label: 'Family', icon: '👨‍👩‍👧‍👦' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <nav style={styles.nav}>
      {tabs.map((tab) => (
        <button
          key={tab.path}
          onClick={() => navigate(tab.path)}
          style={{
            ...styles.tab,
            color: location.pathname === tab.path ? '#F4A261' : '#888',
          }}
          className={`btn-ghost ${location.pathname === tab.path ? 'active' : ''}`}
        >
          <span style={styles.icon}>{tab.icon}</span>
          <span style={{
            ...styles.label,
            fontWeight: location.pathname === tab.path ? '600' : '400',
            color: location.pathname === tab.path ? '#F4A261' : '#888',
          }}>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};

const styles = {
  nav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '65px',
    backgroundColor: 'rgba(25, 25, 25, 0.85)',
    backdropFilter: 'blur(12px)',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 100,
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
  },
  tab: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    padding: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  icon: {
    fontSize: '20px',
    marginBottom: '4px',
  },
  label: {
    fontSize: '10px',
    fontFamily: "'Outfit', sans-serif",
  }
};
