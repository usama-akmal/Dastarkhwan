import React, { useState } from 'react';
import { useFamilyMembers } from '../../hooks/useDatabase';
import { addFamilyMember, deleteFamilyMember } from '../../data/db';

const FamilyStep = ({ onNext }) => {
  const { familyMembers = [], loading } = useFamilyMembers();
  const [name, setName] = useState('');
  const [role, setRole] = useState('husband');

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await addFamilyMember({ name: name.trim(), role, preferences: {} });
    setName('');
  };

  const handleDelete = async (id) => {
    await deleteFamilyMember(id);
  };

  const roles = ['husband', 'wife', 'son', 'daughter', 'father', 'mother', 'brother', 'sister', 'other'];

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
          Who's in your family?
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem' }}>
          Add your family members so we can track their preferences
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        {!loading && familyMembers.map((member) => (
          <div key={member.id} className="card-elevated" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.5rem',
            background: 'var(--color-bg-elevated)',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="avatar" style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'var(--color-primary-dark)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-text-primary)',
                fontWeight: 'bold',
                textTransform: 'uppercase'
              }}>
                {member.name.charAt(0)}
              </div>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{member.name}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                  {member.role}
                </div>
              </div>
            </div>
            <button 
              className="btn btn-ghost" 
              onClick={() => handleDelete(member.id)}
              style={{ color: 'var(--color-error)', padding: '0.5rem' }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', background: 'var(--color-bg-card)' }}>
        <h3 style={{ marginBottom: '1rem', color: 'var(--color-text-primary)', fontSize: '1.1rem' }}>Add Member</h3>
        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Name</label>
            <input 
              className="input"
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ali"
              style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
            />
          </div>
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Role</label>
            <select 
              className="select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', border: '1px solid rgba(255, 255, 255, 0.1)', textTransform: 'capitalize' }}
            >
              {roles.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-secondary" style={{ marginTop: '0.5rem' }}>
            + Add Member
          </button>
        </form>
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'center' }}>
        <button 
          className="btn btn-primary"
          onClick={onNext}
          disabled={familyMembers.length === 0}
          style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', opacity: familyMembers.length === 0 ? 0.5 : 1, cursor: familyMembers.length === 0 ? 'not-allowed' : 'pointer' }}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default FamilyStep;
