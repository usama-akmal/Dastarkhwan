import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const getPageTitle = () => {
    switch(location.pathname) {
      case '/': return 'Dastarkhwan';
      case '/calendar': return 'Calendar';
      case '/recipes': return 'Recipes';
      case '/family': return 'Family Profiles';
      case '/settings': return 'Settings';
      default: return 'Dastarkhwan';
    }
  };

  return (
    <header className="header" style={styles.header}>
      {location.pathname !== '/' && (
        <button className="btn-icon" onClick={() => navigate(-1)} style={styles.backButton}>
          ←
        </button>
      )}
      <div style={styles.titleContainer}>
        <h1 style={styles.titleEn}>{getPageTitle()}</h1>
        {getPageTitle() === 'Dastarkhwan' && (
          <span style={styles.titleUr}>دسترخوان</span>
        )}
      </div>
    </header>
  );
};

const styles = {
  header: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '60px',
    backgroundColor: 'rgba(25, 25, 25, 0.8)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    zIndex: 100,
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    marginRight: '12px',
    color: '#F4A261',
  },
  titleContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  titleEn: {
    fontFamily: "'Outfit', sans-serif",
    color: '#F4A261',
    fontSize: '20px',
    margin: 0,
  },
  titleUr: {
    fontFamily: "'Noto Nastaliq Urdu', serif",
    color: '#E76F51',
    fontSize: '14px',
    margin: 0,
    direction: 'rtl',
  }
};
