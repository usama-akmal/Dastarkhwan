import React, { useState, useEffect } from 'react';
import { useSettings, useDietaryRules } from '../hooks/useDatabase';
import { db, forceReseedDatabase } from '../data/db';

export const SettingsPage = () => {
  const { settings, loading: settingsLoading, updateSettings } = useSettings();
  const { rules, loading: rulesLoading, addRule, deleteRule } = useDietaryRules();
  
  const [localSettings, setLocalSettings] = useState(null);
  const [isRuleFormOpen, setIsRuleFormOpen] = useState(false);
  const [newRule, setNewRule] = useState({ type: 'max_per_week', category: 'proteinType', value: 'chicken', limit: 2 });

  useEffect(() => {
    if (settings) setLocalSettings(settings);
  }, [settings]);

  if (settingsLoading || rulesLoading || !localSettings) {
    return (
      <div className="animate-fade-in-up" style={{ padding: '16px 0' }}>
        <h1 className="section-title" style={{ fontFamily: 'var(--font-heading)' }}>Settings ⚙️</h1>
        <p>Loading settings...</p>
      </div>
    );
  }

  const handleSettingChange = async (key, value, isCooldown = false) => {
    let updated;
    if (isCooldown) {
      updated = { ...localSettings, cooldowns: { ...localSettings.cooldowns, [key]: Number(value) } };
    } else {
      updated = { ...localSettings, [key]: value };
    }
    setLocalSettings(updated);
  };

  const saveSetting = async () => {
    await updateSettings(localSettings);
  };

  const handleResetHistory = async () => {
    if (window.confirm('Are you sure you want to clear all cooking history? This cannot be undone.')) {
      await db.cookingHistory.clear();
      alert('History cleared.');
    }
  };

  const handleResetAll = async () => {
    if (window.confirm('WARNING: This will delete ALL data including recipes, family members, and history. Are you completely sure?')) {
      await db.delete();
      window.location.reload();
    }
  };

  const handleAddRule = async (e) => {
    e.preventDefault();
    await addRule(newRule);
    setIsRuleFormOpen(false);
    setNewRule({ type: 'max_per_week', category: 'proteinType', value: 'chicken', limit: 2 });
  };

  const ruleCategories = {
    proteinType: ['chicken', 'beef', 'mutton', 'fish', 'eggs', 'lentils', 'vegetables'],
    dishType: ['curry', 'rice', 'roti-based', 'soup', 'fried', 'grilled', 'one-pot'],
    dietaryTags: ['high-fat', 'low-fat', 'spicy', 'mild', 'quick', 'heavy', 'light']
  };

  return (
    <div style={{ padding: '16px 0' }} className="animate-fade-in-up">
      <h1 className="section-title" style={{ marginBottom: '24px', fontFamily: 'var(--font-heading)' }}>Settings ⚙️</h1>

      <div className="card-elevated" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', marginBottom: '16px', color: 'var(--color-primary)', fontFamily: 'var(--font-heading)' }}>Family Name</h2>
        <div className="form-group">
          <input 
            id="setting-family-name"
            type="text" 
            className="input" 
            value={localSettings.familyName || ''} 
            onChange={e => handleSettingChange('familyName', e.target.value)}
            onBlur={saveSetting}
            style={{ width: '100%', fontFamily: 'var(--font-body)' }} 
          />
        </div>
      </div>

      <div className="card-elevated" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', marginBottom: '16px', color: 'var(--color-primary)', fontFamily: 'var(--font-heading)' }}>Meal Planning</h2>
        
        <div className="form-group">
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>Meals Suggested Per Day</label>
          <div style={{ display: 'flex', gap: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input 
                type="radio" 
                name="mealsPerDay" 
                value="1" 
                checked={localSettings.mealsPerDay === 1}
                onChange={() => {
                  handleSettingChange('mealsPerDay', 1);
                  updateSettings({ ...localSettings, mealsPerDay: 1 });
                }} 
              />
              1 Meal (Dinner only)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input 
                type="radio" 
                name="mealsPerDay" 
                value="2" 
                checked={localSettings.mealsPerDay === 2}
                onChange={() => {
                  handleSettingChange('mealsPerDay', 2);
                  updateSettings({ ...localSettings, mealsPerDay: 2 });
                }} 
              />
              2 Meals (Lunch & Dinner)
            </label>
          </div>
        </div>
      </div>

      <div className="card-elevated" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', marginBottom: '16px', color: 'var(--color-primary)', fontFamily: 'var(--font-heading)' }}>Repetition Cooldowns</h2>

        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label htmlFor="setting-cooldown-samedish" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>Same dish cooldown (days)</label>
          <input 
            id="setting-cooldown-samedish"
            type="number" 
            className="input" 
            value={localSettings.cooldowns?.sameDish || 0} 
            onChange={e => handleSettingChange('sameDish', e.target.value, true)}
            onBlur={saveSetting}
            style={{ width: '100%' }} 
          />
        </div>

        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label htmlFor="setting-cooldown-sameprotein" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>Same protein cooldown (days)</label>
          <input 
            id="setting-cooldown-sameprotein"
            type="number" 
            className="input" 
            value={localSettings.cooldowns?.sameProtein || 0} 
            onChange={e => handleSettingChange('sameProtein', e.target.value, true)}
            onBlur={saveSetting}
            style={{ width: '100%' }} 
          />
        </div>

        <div className="form-group">
          <label htmlFor="setting-cooldown-samedishtype" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>Same dish type cooldown (days)</label>
          <input 
            id="setting-cooldown-samedishtype"
            type="number" 
            className="input" 
            value={localSettings.cooldowns?.sameDishType || 0} 
            onChange={e => handleSettingChange('sameDishType', e.target.value, true)}
            onBlur={saveSetting}
            style={{ width: '100%' }} 
          />
        </div>
      </div>

      <div className="card-elevated" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', margin: 0, color: 'var(--color-primary)', fontFamily: 'var(--font-heading)' }}>Dietary Rules</h2>
          <button id="btn-add-rule-start" className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => setIsRuleFormOpen(!isRuleFormOpen)}>
            {isRuleFormOpen ? 'Cancel' : '+ Add'}
          </button>
        </div>

        {isRuleFormOpen && (
          <form onSubmit={handleAddRule} className="animate-fade-in" style={{ padding: '16px', background: 'var(--color-bg)', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Rule Type</label>
                <select id="rule-type" className="input" style={{ width: '100%' }} value={newRule.type} onChange={e => setNewRule({...newRule, type: e.target.value})}>
                  <option value="max_per_week">Max per week</option>
                  <option value="min_per_week">Min per week</option>
                  <option value="no_consecutive">No consecutive</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Category</label>
                <select id="rule-category" className="input" style={{ width: '100%' }} value={newRule.category} onChange={e => {
                  const cat = e.target.value;
                  setNewRule({...newRule, category: cat, value: ruleCategories[cat][0]});
                }}>
                  <option value="proteinType">Protein Type</option>
                  <option value="dishType">Dish Type</option>
                  <option value="dietaryTags">Dietary Tags</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Value</label>
                <select id="rule-value" className="input" style={{ width: '100%' }} value={newRule.value} onChange={e => setNewRule({...newRule, value: e.target.value})}>
                  {ruleCategories[newRule.category].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              {newRule.type !== 'no_consecutive' && (
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Limit</label>
                  <input id="rule-limit" type="number" className="input" style={{ width: '100%' }} value={newRule.limit} min="1" max="14" onChange={e => setNewRule({...newRule, limit: Number(e.target.value)})} />
                </div>
              )}
              <button type="submit" id="btn-save-rule" className="btn-primary">Save Rule</button>
            </div>
          </form>
        )}

        {rules?.length === 0 ? (
          <div className="empty-state">
            <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>No custom rules set.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {rules?.map(rule => (
              <div key={rule.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--color-bg)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '14px' }}>
                  {rule.type === 'no_consecutive' ? `No consecutive ${rule.value}` : `${rule.type === 'max_per_week' ? 'Max' : 'Min'} ${rule.limit} ${rule.value} per week`}
                </span>
                <button id={`btn-delete-rule-${rule.id}`} onClick={() => deleteRule(rule.id)} style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer' }}>Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card-elevated" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', marginBottom: '16px', color: 'var(--color-accent)', fontFamily: 'var(--font-heading)' }}>Data Management</h2>
        
        <button id="btn-reseed-db" className="btn-secondary" style={{ width: '100%', marginBottom: '12px' }} onClick={async () => {
          if (window.confirm('This will restore all default recipes. Your custom recipes will remain.')) {
            await forceReseedDatabase();
            alert('Default recipes restored!');
          }
        }}>
          Re-seed Default Recipes
        </button>

        <button id="btn-reset-history" className="btn-secondary" style={{ width: '100%', marginBottom: '12px', borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }} onClick={handleResetHistory}>
          Reset Cooking History
        </button>
        <button id="btn-erase-all" className="btn-primary" style={{ width: '100%', backgroundColor: 'var(--color-error)', borderColor: 'var(--color-error)' }} onClick={handleResetAll}>
          Erase All Data
        </button>
      </div>
    </div>
  );
};
