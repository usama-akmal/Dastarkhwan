import React, { useState } from 'react';
import { useDishes, useFamilyMembers } from '../../hooks/useDatabase';
import { updateFamilyMember } from '../../data/db';

const RatingStep = ({ onComplete }) => {
  const { dishes = [], loading: dishesLoading } = useDishes();
  const { familyMembers = [], loading: familyLoading } = useFamilyMembers();
  
  const [currentIndex, setCurrentIndex] = useState(0);

  const displayDishes = dishes.slice(0, 30);
  const total = displayDishes.length;

  const handleRate = async (preference) => {
    if (displayDishes.length === 0) return;
    
    const dish = displayDishes[currentIndex];
    
    for (const member of familyMembers) {
      const newPrefs = { ...member.preferences, [dish.id]: preference };
      await updateFamilyMember(member.id, { preferences: newPrefs });
    }

    nextDish();
  };

  const nextDish = () => {
    if (currentIndex < total - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  if (dishesLoading || familyLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--color-text-secondary)' }}>Loading...</div>;
  }

  if (total === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem' }}>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>No dishes found.</p>
        <button className="btn btn-primary" onClick={onComplete}>Continue</button>
      </div>
    );
  }

  const currentDish = displayDishes[currentIndex];
  const progressPercent = ((currentIndex) / total) * 100;

  return (
    <div className="animate-fade-in" style={{
      display: 'flex',
      flexDirection: 'column',
      padding: '2rem',
      maxWidth: '500px',
      margin: '0 auto',
      minHeight: '100vh',
      textAlign: 'center'
    }}>
      <h2 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: '1.75rem',
        color: 'var(--color-text-primary)',
        marginBottom: '1.5rem',
        lineHeight: 1.3
      }}>
        How does your family feel about these dishes?
      </h2>

      <div style={{ width: '100%', background: 'rgba(255, 255, 255, 0.1)', height: '8px', borderRadius: '4px', marginBottom: '0.5rem', overflow: 'hidden' }}>
        <div style={{ height: '100%', background: 'var(--color-primary)', width: `${progressPercent}%`, transition: 'width 0.3s ease' }}></div>
      </div>
      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
        {currentIndex + 1} / {total}
      </div>

      <div className="card-elevated animate-fade-in-up" key={currentDish.id} style={{
        background: 'var(--color-bg-elevated)',
        padding: '3rem 2rem',
        borderRadius: 'var(--radius-xl)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '2rem',
        border: '1px solid rgba(255,255,255,0.05)'
      }}>
        <h3 style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
          {currentDish.nameEn}
        </h3>
        {currentDish.nameUr && (
          <p style={{ 
            fontFamily: "'Noto Nastaliq Urdu', serif", 
            fontSize: '2rem', 
            color: 'var(--color-accent)',
            margin: '0.5rem 0'
          }}>
            {currentDish.nameUr}
          </p>
        )}
        
        {currentDish.proteinType && (
          <div className="tag-pill" style={{ 
            background: 'var(--color-primary-dark)', 
            color: 'var(--color-text-primary)',
            padding: '0.25rem 1rem',
            borderRadius: '999px',
            fontSize: '0.9rem',
            marginTop: '1rem'
          }}>
            {currentDish.proteinType}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <button 
          className="btn card"
          onClick={() => handleRate('loves')}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1rem 0.5rem', background: 'var(--color-bg-card)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <span style={{ fontSize: '2rem' }}>❤️</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-primary)' }}>Loves it</span>
        </button>
        <button 
          className="btn card"
          onClick={() => handleRate('eats')}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1rem 0.5rem', background: 'var(--color-bg-card)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <span style={{ fontSize: '2rem' }}>👍</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-primary)' }}>Eats it</span>
        </button>
        <button 
          className="btn card"
          onClick={() => handleRate('wont_eat')}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1rem 0.5rem', background: 'var(--color-bg-card)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <span style={{ fontSize: '2rem' }}>🚫</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-primary)' }}>Won't eat</span>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <button className="btn btn-ghost" onClick={() => handleRate('eats')} style={{ color: 'var(--color-text-secondary)' }}>
          Skip (Defaults to Eats)
        </button>
        <button className="btn btn-ghost" onClick={onComplete} style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
          Skip All Remaining
        </button>
      </div>
    </div>
  );
};

export default RatingStep;
