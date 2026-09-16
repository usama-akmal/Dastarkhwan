import React, { useState } from 'react';
import { useSuggestion } from '../hooks/useSuggestion';
import { useSettings } from '../hooks/useDatabase';

const SuggestionCard = ({ mealType, suggestionData, label }) => {
  const { suggestion, alternatives, isAlreadySelected, loading, refresh, acceptSuggestion, rejectSuggestion, cancelPlannedMeal } = suggestionData || {};
  const [accepted, setAccepted] = useState(false);

  if (loading) {
    return <div className="skeleton" style={{ height: '200px', borderRadius: 'var(--radius-lg)', marginBottom: '16px' }} />;
  }

  if (!suggestion) {
    return (
      <div className="card animate-fade-in" style={{ marginBottom: '16px', textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🍽️</div>
        <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
          No suitable dishes found. Try adjusting your dietary rules or adding more recipes.
        </p>
      </div>
    );
  }

  const handleAccept = async () => {
    if (acceptSuggestion) {
      await acceptSuggestion(suggestion.id);
      setAccepted(true);
    }
  };

  const handleReject = () => {
    if (rejectSuggestion) {
      rejectSuggestion();
    } else if (refresh) {
      refresh();
    }
  };

  const isLocked = isAlreadySelected || accepted;

  return (
    <div className="card-elevated animate-fade-in-up" style={{ marginBottom: '24px', border: isLocked ? '1px solid var(--color-primary)' : 'var(--border-glass-highlight)' }}>
      {isLocked && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{
            display: 'inline-block',
            background: 'var(--color-primary)',
            color: '#000',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            padding: '4px 12px',
            borderRadius: '12px'
          }}>
            ✅ Planned for Today
          </div>
          <button 
            className="btn-ghost" 
            style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', padding: '4px 8px' }}
            onClick={() => {
              if (window.confirm('Remove this planned meal and get a new suggestion?')) {
                cancelPlannedMeal();
                setAccepted(false);
              }
            }}
          >
            ✕ Remove
          </button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <h2 id={`suggestion-${mealType}-name`} style={{ 
            margin: '0 0 4px 0', 
            color: 'var(--color-primary)', 
            fontFamily: "var(--font-heading)",
            fontSize: '1.25rem'
          }}>
            {suggestion.nameEn}
          </h2>
          <p style={{ 
            margin: '0 0 8px 0', 
            color: 'var(--color-accent)', 
            fontFamily: "'Noto Nastaliq Urdu', serif", 
            direction: 'rtl',
            fontSize: '1rem'
          }}>
            {suggestion.nameUr}
          </p>
        </div>
        <span className={`tag-pill tag-pill--${(suggestion.proteinType || '').toLowerCase()}`}>
          {suggestion.proteinType}
        </span>
      </div>
      
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <span className="tag-pill">{suggestion.dishType}</span>
        {suggestion.dietaryTags?.map(tag => (
          <span key={tag} className="tag-pill">{tag}</span>
        ))}
        {suggestion.cuisineType && (
          <span className="tag-pill">{suggestion.cuisineType}</span>
        )}
      </div>

      {!isLocked && (
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            id={`accept-${mealType}`}
            className="btn btn-primary" 
            style={{ flex: 1 }} 
            onClick={handleAccept}
          >
            ✅ Cook This
          </button>
          <button 
            id={`reject-${mealType}`}
            className="btn btn-secondary" 
            style={{ flex: 1 }} 
            onClick={handleReject}
          >
            🔄 Something Else
          </button>
        </div>
      )}

      {!isLocked && alternatives?.length > 0 && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Other options
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {alternatives.slice(0, 3).map((alt, idx) => (
              <div 
                key={alt.id} 
                className={`card animate-fade-in animate-stagger-${idx + 1}`} 
                style={{ 
                  padding: '10px 14px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
              >
                <div>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>{alt.nameEn}</span>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    color: 'var(--color-accent-light)', 
                    marginLeft: '8px',
                    fontFamily: "'Noto Nastaliq Urdu', serif"
                  }}>
                    {alt.nameUr}
                  </span>
                </div>
                <span 
                  className={`tag-pill tag-pill--${(alt.proteinType || '').toLowerCase()}`} 
                  style={{ fontSize: '0.65rem', padding: '2px 8px' }}
                >
                  {alt.proteinType}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const HomePage = () => {
  const { settings, loading: settingsLoading } = useSettings();
  
  // We fetch both, but only display what's needed
  const lunchSuggestion = useSuggestion('lunch');
  const dinnerSuggestion = useSuggestion('dinner');
  
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  if (settingsLoading) {
    return <div className="skeleton" style={{ height: '400px', margin: '20px' }}></div>;
  }

  const mealsPerDay = settings?.mealsPerDay || 2;

  return (
    <div style={{ padding: '8px 0' }}>
      <div className="animate-fade-in" style={{ marginBottom: '20px' }}>
        <h1 className="section-title" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
          Good {greeting}! {hour < 12 ? '🌅' : hour < 18 ? '☀️' : '🌙'}
        </h1>
        <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '0.875rem' }}>{dateStr}</p>
      </div>

      {mealsPerDay === 1 ? (
        <section style={{ marginBottom: '20px' }}>
          <h2 style={{ 
            fontSize: '1.1rem', 
            marginBottom: '14px', 
            fontFamily: "var(--font-heading)",
            color: 'var(--color-text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            🍽️ Today's Meal
          </h2>
          <SuggestionCard mealType="dinner" suggestionData={dinnerSuggestion} label="Today's Meal" />
        </section>
      ) : (
        <>
          <section style={{ marginBottom: '20px' }}>
            <h2 style={{ 
              fontSize: '1.1rem', 
              marginBottom: '14px', 
              fontFamily: "var(--font-heading)",
              color: 'var(--color-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🍳 Lunch
            </h2>
            <SuggestionCard mealType="lunch" suggestionData={lunchSuggestion} label="Lunch" />
          </section>

          <section style={{ marginBottom: '20px' }}>
            <h2 style={{ 
              fontSize: '1.1rem', 
              marginBottom: '14px', 
              fontFamily: "var(--font-heading)",
              color: 'var(--color-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🍲 Dinner
            </h2>
            <SuggestionCard mealType="dinner" suggestionData={dinnerSuggestion} label="Dinner" />
          </section>
        </>
      )}
    </div>
  );
};
