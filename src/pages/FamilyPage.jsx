import React, { useState } from 'react';
import { useFamilyMembers, useDishes } from '../hooks/useDatabase';
import { updateFamilyMember, addFamilyMember, deleteFamilyMember } from '../data/db';

export const FamilyPage = () => {
  const { members, loading: membersLoading } = useFamilyMembers();
  const { dishes, loading: dishesLoading } = useDishes();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', role: 'other' });
  const [editingMember, setEditingMember] = useState(null);
  
  const [isBulkManageOpen, setIsBulkManageOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [editingDish, setEditingDish] = useState(null);

  const roles = ['husband', 'wife', 'son', 'daughter', 'father', 'mother', 'brother', 'sister', 'other'];
  const roleColors = {
    husband: 'var(--color-primary)', wife: 'var(--color-accent)', 
    son: 'var(--color-success)', daughter: 'var(--color-warning)', 
    father: 'var(--color-primary)', mother: 'var(--color-accent)',
    default: 'var(--color-border)'
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newMember.name) return;
    await addFamilyMember({ ...newMember, preferences: {} });
    setIsAddOpen(false);
    setNewMember({ name: '', role: 'other' });
  };

  const handleDelete = async (memberId) => {
    if (window.confirm('Are you sure you want to delete this family member?')) {
      await deleteFamilyMember(memberId);
    }
  };

  const updatePreference = async (memberId, currentPrefs, dishId, pref) => {
    const newPrefs = { ...currentPrefs };
    if (newPrefs[dishId] === pref) {
      delete newPrefs[dishId]; // Toggle off
    } else {
      newPrefs[dishId] = pref;
    }
    
    // Update local state if editing a specific member
    if (editingMember && editingMember.id === memberId) {
      setEditingMember({ ...editingMember, preferences: newPrefs });
    }
    await updateFamilyMember(memberId, { preferences: newPrefs });
  };

  if (membersLoading || dishesLoading) {
    return (
      <div className="animate-fade-in-up" style={{ padding: '16px 0' }}>
        <h1 className="section-title" style={{ fontFamily: 'var(--font-heading)' }}>Family Profiles 👨‍👩‍👧‍👦</h1>
        <p>Loading...</p>
      </div>
    );
  }

  const groupedDishes = (dishes || []).reduce((acc, dish) => {
    const pt = dish.proteinType || 'other';
    if (!acc[pt]) acc[pt] = [];
    acc[pt].push(dish);
    return acc;
  }, {});

  return (
    <>
      <div style={{ padding: '16px 0', paddingBottom: '100px' }} className="animate-fade-in-up">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h1 className="section-title" style={{ fontFamily: 'var(--font-heading)', margin: 0 }}>Family Profiles 👨‍👩‍👧‍👦</h1>
        </div>

      {!isBulkManageOpen ? (
        <>
          <button id="btn-open-bulk" className="btn-secondary" style={{ width: '100%', marginBottom: '24px' }} onClick={() => setIsBulkManageOpen(true)}>
            🍱 Bulk Manage Preferences
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            {members?.length === 0 ? (
              <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center' }}>No members found. Add someone!</p>
            ) : (
              members?.map((member, idx) => {
                const prefs = member.preferences || {};
                let loves = 0, eats = 0, wont = 0;
                Object.values(prefs).forEach(p => {
                  if (p === 'loves') loves++;
                  if (p === 'eats') eats++;
                  if (p === 'wont_touch') wont++;
                });

                return (
                  <div key={member.id} id={`member-card-${member.id}`} className={`card-elevated animate-fade-in-up animate-stagger-${idx+1}`} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div className="avatar" style={{ backgroundColor: roleColors[member.role] || roleColors.default, color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', width: '48px', height: '48px', borderRadius: '24px', fontWeight: 'bold' }}>
                      {member.name[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontFamily: 'var(--font-heading)', color: 'var(--color-text)' }}>{member.name} ({member.role})</h3>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
                        {loves} ❤️ | {eats} 👍 | {wont} 🚫
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button id={`btn-edit-prefs-${member.id}`} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setEditingMember(member)}>Preferences</button>
                      <button id={`btn-delete-member-${member.id}`} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--color-error)', borderColor: 'var(--color-error)' }} onClick={() => handleDelete(member.id)}>Delete</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {!isAddOpen ? (
            <button id="btn-add-member" className="btn-primary" style={{ width: '100%' }} onClick={() => setIsAddOpen(true)}>
              + Add Member
            </button>
          ) : (
            <div className="card-elevated animate-fade-in" style={{ padding: '16px' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: '12px', color: 'var(--color-primary)' }}>New Family Member</h3>
              <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label htmlFor="new-member-name" style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Name</label>
                  <input id="new-member-name" type="text" className="input" style={{ width: '100%' }} required 
                    value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} />
                </div>
                <div>
                  <label htmlFor="new-member-role" style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Role</label>
                  <select id="new-member-role" className="input" style={{ width: '100%' }}
                    value={newMember.role} onChange={e => setNewMember({...newMember, role: e.target.value})}>
                    {roles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button type="button" id="btn-cancel-add-member" className="btn-secondary" style={{ flex: 1 }} onClick={() => setIsAddOpen(false)}>Cancel</button>
                  <button type="submit" id="btn-save-member" className="btn-primary" style={{ flex: 1 }}>Save</button>
                </div>
              </form>
            </div>
          )}
        </>
      ) : (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', color: 'var(--color-primary)', margin: 0 }}>Bulk Preferences</h2>
            <button className="btn-ghost" onClick={() => setIsBulkManageOpen(false)}>Back</button>
          </div>
          <input 
            type="text" 
            className="input" 
            placeholder="Search dish to edit..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', marginBottom: '16px' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(dishes || []).filter(d => (d.nameEn || '').toLowerCase().includes(search.toLowerCase()) || (d.nameUr || '').includes(search)).map(dish => (
              <div key={dish.id} className="card" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setEditingDish(dish)}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>{dish.nameEn}</h3>
                  <span className="tag-pill" style={{ fontSize: '10px' }}>{dish.proteinType}</span>
                </div>
                <div style={{ color: 'var(--color-primary)' }}>Edit ➔</div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>

      {editingMember && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="card-elevated animate-fade-in-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-primary)' }}>{editingMember.name}'s Preferences</h2>
              <button id="btn-close-prefs" onClick={() => setEditingMember(null)} style={{ background: 'none', border: 'none', color: 'var(--color-text)', fontSize: '20px' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {Object.keys(groupedDishes).map(protein => (
                <div key={protein}>
                  <h4 style={{ textTransform: 'capitalize', color: 'var(--color-accent)', marginBottom: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>{protein}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {groupedDishes[protein].map(dish => {
                      const pref = editingMember.preferences?.[dish.id];
                      return (
                        <div key={dish.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '14px', flex: 1 }}>{dish.nameEn}</span>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button id={`pref-love-${dish.id}`} style={{ ...styles.prefBtn, background: pref === 'loves' ? 'rgba(255,0,0,0.2)' : 'transparent', border: pref === 'loves' ? '1px solid var(--color-primary)' : '1px solid var(--color-border)' }} onClick={() => updatePreference(editingMember.id, editingMember.preferences || {}, dish.id, 'loves')}>❤️</button>
                            <button id={`pref-eat-${dish.id}`} style={{ ...styles.prefBtn, background: pref === 'eats' ? 'rgba(0,255,0,0.2)' : 'transparent', border: pref === 'eats' ? '1px solid var(--color-success)' : '1px solid var(--color-border)' }} onClick={() => updatePreference(editingMember.id, editingMember.preferences || {}, dish.id, 'eats')}>👍</button>
                            <button id={`pref-wont-${dish.id}`} style={{ ...styles.prefBtn, background: pref === 'wont_touch' ? 'rgba(100,100,100,0.4)' : 'transparent', border: pref === 'wont_touch' ? '1px solid var(--color-text-secondary)' : '1px solid var(--color-border)' }} onClick={() => updatePreference(editingMember.id, editingMember.preferences || {}, dish.id, 'wont_touch')}>🚫</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {editingDish && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="card-elevated animate-fade-in-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-primary)', margin: '0 0 4px 0' }}>{editingDish.nameEn}</h2>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Tap to assign preference</span>
              </div>
              <button onClick={() => setEditingDish(null)} style={{ background: 'none', border: 'none', color: 'var(--color-text)', fontSize: '24px', cursor: 'pointer' }}>✕</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {members?.map(member => {
                const pref = (member.preferences || {})[editingDish.id];
                return (
                  <div key={member.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="avatar" style={{ backgroundColor: roleColors[member.role] || roleColors.default, color: '#fff', width: '32px', height: '32px', fontSize: '14px' }}>
                        {member.name[0]?.toUpperCase()}
                      </div>
                      <span style={{ fontWeight: '500' }}>{member.name}</span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button style={{ ...styles.prefBtn, background: pref === 'loves' ? 'rgba(255,0,0,0.2)' : 'transparent', border: pref === 'loves' ? '1px solid var(--color-primary)' : '1px solid var(--color-border)' }} onClick={() => updatePreference(member.id, member.preferences || {}, editingDish.id, 'loves')}>❤️</button>
                      <button style={{ ...styles.prefBtn, background: pref === 'eats' ? 'rgba(0,255,0,0.2)' : 'transparent', border: pref === 'eats' ? '1px solid var(--color-success)' : '1px solid var(--color-border)' }} onClick={() => updatePreference(member.id, member.preferences || {}, editingDish.id, 'eats')}>👍</button>
                      <button style={{ ...styles.prefBtn, background: pref === 'wont_touch' ? 'rgba(100,100,100,0.4)' : 'transparent', border: pref === 'wont_touch' ? '1px solid var(--color-text-secondary)' : '1px solid var(--color-border)' }} onClick={() => updatePreference(member.id, member.preferences || {}, editingDish.id, 'wont_touch')}>🚫</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const styles = {
  modalOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '16px'
  },
  modalContent: {
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column'
  },
  prefBtn: {
    padding: '4px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  }
};
