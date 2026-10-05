import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../ui/Icon';

const TITLES = {
  '/': { title: 'Dastarkhwan', subtitle: 'دسترخوان' },
  '/calendar': { title: 'Calendar' },
  '/recipes': { title: 'Recipes' },
  '/family': { title: 'Family' },
  '/shopping': { title: 'Shopping' },
  '/settings': { title: 'Settings' },
};

export const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { title, subtitle } = TITLES[location.pathname] || TITLES['/'];
  const isHome = location.pathname === '/';

  return (
    <header className="app-header">
      {!isHome && (
        <button
          type="button"
          className="btn btn-icon"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <Icon name="arrowLeft" size={20} />
        </button>
      )}

      <div className="app-header__titles">
        <h1 className="app-header__title">{title}</h1>
        {subtitle && <span className="app-header__subtitle" lang="ur" dir="rtl">{subtitle}</span>}
      </div>

      <div className="app-header__spacer" />
    </header>
  );
};

export default Header;
