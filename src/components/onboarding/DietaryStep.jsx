import React, { useState } from 'react';
import { addDietaryRule } from '../../data/db';

const DietaryStep = ({ onComplete }) => {
  const [beefRule, setBeefRule] = useState({ active: false, limit: 2 });
  const [friedRule, setFriedRule] = useState({ active: false, limit: 3 });
  const [veggieRule, setVeggieRule] = useState({ active: false, limit: 2 });
  const [fatRule, setFatRule] = useState({ active: false });

  const handleComplete = async () => {
    const activeRules = [];
    if (beefRule.active) {
      activeRules.push({ ruleType: 'max_per_week', category: 'proteinType', value: 'beef', limit: beefRule.limit, isActive: true });
    }
    if (friedRule.active) {
      activeRules.push({ ruleType: 'max_per_week', category: 'dishType', value: 'fried', limit: friedRule.limit, isActive: true });
    }
    if (veggieRule.active) {
      activeRules.push({ ruleType: 'min_per_week', category: 'proteinType', value: 'vegetables', limit: veggieRule.limit, isActive: true });
    }
    if (fatRule.active) {
      activeRules.push({ ruleType: 'no_consecutive', category: 'dietaryTags', value: 'high-fat', limit: 1, isActive: true });
    }

    for (const rule of activeRules) {
      await addDietaryRule(rule);
    }

    onComplete();
  };

  return (
    <div className="animate-fade-in" style={{
      display: 'flex',
      flexDirection: 'column',
      padding: '2rem',
      maxWidth: '600px',
      margin: '0 auto',
      minHeight: '100%'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '2rem',
          color: 'var(--color-primary)',
          marginBottom: '0.5rem'
        }}>
          Set your dietary preferences
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem' }}>
          Control what gets suggested
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '3rem' }}>
        
        {/* Beef Rule */}
        <div className="card" style={{ padding: '1.5rem', background: 'var(--color-bg-card)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--color-text-primary)', fontSize: '1.1rem', fontWeight: 500 }}>Limit beef to X times per week</span>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={beefRule.active} onChange={(e) => setBeefRule({ ...beefRule, active: e.target.checked })} style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--color-primary)' }} />
            </label>
          </div>
          {beefRule.active && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
              <input type="range" min="1" max="7" value={beefRule.limit} onChange={(e) => setBeefRule({ ...beefRule, limit: parseInt(e.target.value) })} style={{ flex: 1, accentColor: 'var(--color-primary)' }} />
              <span style={{ color: 'var(--color-text-secondary)', width: '60px', textAlign: 'right' }}>{beefRule.limit} times</span>
            </div>
          )}
        </div>

        {/* Fried Food Rule */}
        <div className="card" style={{ padding: '1.5rem', background: 'var(--color-bg-card)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--color-text-primary)', fontSize: '1.1rem', fontWeight: 500 }}>Limit fried food to X times per week</span>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={friedRule.active} onChange={(e) => setFriedRule({ ...friedRule, active: e.target.checked })} style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--color-primary)' }} />
            </label>
          </div>
          {friedRule.active && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
              <input type="range" min="1" max="7" value={friedRule.limit} onChange={(e) => setFriedRule({ ...friedRule, limit: parseInt(e.target.value) })} style={{ flex: 1, accentColor: 'var(--color-primary)' }} />
              <span style={{ color: 'var(--color-text-secondary)', width: '60px', textAlign: 'right' }}>{friedRule.limit} times</span>
            </div>
          )}
        </div>

        {/* Veggie Rule */}
        <div className="card" style={{ padding: '1.5rem', background: 'var(--color-bg-card)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--color-text-primary)', fontSize: '1.1rem', fontWeight: 500 }}>Include at least X vegetable/lentil days per week</span>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={veggieRule.active} onChange={(e) => setVeggieRule({ ...veggieRule, active: e.target.checked })} style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--color-primary)' }} />
            </label>
          </div>
          {veggieRule.active && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
              <input type="range" min="1" max="7" value={veggieRule.limit} onChange={(e) => setVeggieRule({ ...veggieRule, limit: parseInt(e.target.value) })} style={{ flex: 1, accentColor: 'var(--color-primary)' }} />
              <span style={{ color: 'var(--color-text-secondary)', width: '60px', textAlign: 'right' }}>{veggieRule.limit} times</span>
            </div>
          )}
        </div>

        {/* Fat Rule */}
        <div className="card" style={{ padding: '1.5rem', background: 'var(--color-bg-card)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--color-text-primary)', fontSize: '1.1rem', fontWeight: 500 }}>No high-fat meals on consecutive days</span>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={fatRule.active} onChange={(e) => setFatRule({ ...fatRule, active: e.target.checked })} style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--color-primary)' }} />
            </label>
          </div>
        </div>

      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: 'auto' }}>
        <button 
          className="btn btn-primary"
          onClick={handleComplete}
          style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', borderRadius: 'var(--radius-xl)' }}
        >
          Complete Setup
        </button>
        <button 
          className="btn btn-ghost"
          onClick={onComplete}
          style={{ color: 'var(--color-text-muted)', fontSize: '1rem' }}
        >
          Skip this step
        </button>
      </div>
    </div>
  );
};

export default DietaryStep;
