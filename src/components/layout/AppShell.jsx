import React from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';

export const AppShell = ({ children }) => {
  return (
    <div style={styles.shell}>
      <Header />
      <main className="animate-fade-in" style={styles.main}>
        {children}
      </main>
      <BottomNav />
    </div>
  );
};

const styles = {
  shell: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: '#121212',
    color: '#e0e0e0',
  },
  main: {
    flex: 1,
    paddingTop: '70px',
    paddingBottom: '80px',
    overflowY: 'auto',
    paddingLeft: '16px',
    paddingRight: '16px',
  }
};
