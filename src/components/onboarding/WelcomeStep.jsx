import React from 'react';

const WelcomeStep = ({ onNext }) => {
  return (
    <div className="animate-fade-in" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100%',
      padding: '2rem',
      textAlign: 'center',
      color: 'var(--color-text-primary)'
    }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h1 className="animate-fade-in-up" style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '3.5rem',
          fontWeight: 700,
          margin: 0,
          background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-primary))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1.1
        }}>
          Dastarkhwan
        </h1>
        <p className="animate-fade-in-up animate-stagger-1" style={{
          fontFamily: "'Noto Nastaliq Urdu', serif",
          fontSize: '2.5rem',
          color: 'var(--color-accent)',
          margin: '0.5rem 0'
        }}>
          دسترخوان
        </p>
        <p className="animate-fade-in-up animate-stagger-2" style={{
          fontSize: '1.2rem',
          color: 'var(--color-text-secondary)',
          marginTop: '1rem',
          marginBottom: '2rem'
        }}>
          Your daily meal planning companion
        </p>
      </div>

      <div className="card animate-fade-in-up animate-stagger-3" style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '2rem',
        marginBottom: '3rem',
        maxWidth: '400px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        textAlign: 'left'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '1.1rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🍲</span>
          <span>Plan Meals Effortlessly</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '1.1rem' }}>
          <span style={{ fontSize: '1.5rem' }}>👨‍👩‍👧‍👦</span>
          <span>Track Family Preferences</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '1.1rem' }}>
          <span style={{ fontSize: '1.5rem' }}>⚖️</span>
          <span>Balance Your Diet</span>
        </div>
      </div>

      <button 
        className="btn btn-primary animate-fade-in-up animate-stagger-4"
        onClick={onNext}
        style={{
          fontSize: '1.2rem',
          padding: '1rem 3rem',
          borderRadius: 'var(--radius-xl)'
        }}
      >
        Let's get started
      </button>
    </div>
  );
};

export default WelcomeStep;
