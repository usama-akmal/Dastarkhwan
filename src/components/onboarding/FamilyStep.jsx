import React, { useState } from 'react';
import { useFamilyMembers } from '../../hooks/useDatabase';
import { addFamilyMember, deleteFamilyMember } from '../../data/db';
import { Icon } from '../ui/Icon';
import { WizardStep, Callout } from './OnboardingProgress';

const ROLES = ['husband', 'wife', 'son', 'daughter', 'father', 'mother', 'brother', 'sister', 'other'];

const FamilyStep = ({ onNext }) => {
  // `members` is the real key; the alias is destructured too so neither spelling can
  // silently yield an empty list and make this step impossible to pass.
  const { members: familyMembers = [], loading } = useFamilyMembers();
  const [name, setName] = useState('');
  const [role, setRole] = useState('husband');
  const [justAdded, setJustAdded] = useState(null);

  const handleAdd = async (event) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    await addFamilyMember({ name: trimmed, role, preferences: {} });
    setJustAdded(trimmed);
    setName('');
  };

  return (
    <WizardStep
      title="Who is at your table?"
      description="Add the people you cook for. Each one gets their own preferences."
      actions={(
        <button
          type="button"
          className="btn btn-primary btn--lg btn--block"
          onClick={onNext}
          disabled={familyMembers.length === 0}
        >
          Continue
          <Icon name="arrowRight" size={18} />
        </button>
      )}
    >
      <form onSubmit={handleAdd} style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'stretch' }}>
          <input
            className="input"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name"
            aria-label="Family member name"
            style={{ flex: 1, minWidth: 0 }}
          />
          <select
            className="select"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            aria-label="Role"
            style={{ width: 130, flex: '0 0 auto' }}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
            ))}
          </select>
          <button
            type="submit"
            className="btn btn-secondary"
            aria-label="Add family member"
            disabled={!name.trim()}
            style={{ flex: '0 0 auto', padding: '0 var(--space-4)' }}
          >
            <Icon name="plus" size={20} />
          </button>
        </div>
      </form>

      {familyMembers.length === 0 ? (
        <div className="empty-state" style={{ padding: 'var(--space-6) var(--space-4)' }}>
          <span style={{
            display: 'grid', placeItems: 'center', width: 52, height: 52,
            borderRadius: 'var(--radius-full)', background: 'var(--fill-soft)', color: 'var(--text-muted)',
          }}>
            <Icon name="family" size={24} />
          </span>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            {loading ? 'Loading…' : 'Nobody added yet. Start with yourself.'}
          </p>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 'var(--space-2)' }}>
          {familyMembers.map((member) => (
            <li
              key={member.id}
              className="card animate-fade-in-up"
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)' }}
            >
              <span className="avatar avatar--sm" aria-hidden="true">{member.name[0]}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 'var(--weight-medium)' }}>{member.name}</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                  {member.role}
                </span>
              </span>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => deleteFamilyMember(member.id)}
                aria-label={`Remove ${member.name}`}
                style={{ color: 'var(--danger)', minWidth: 40, minHeight: 40, padding: 0 }}
              >
                <Icon name="close" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {justAdded && familyMembers.length > 0 && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Callout icon="check" tone="success">
            {justAdded} added. Add anyone else, or continue.
          </Callout>
        </div>
      )}

      {familyMembers.length > 0 && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Callout icon="info">
            You will rate dishes for everyone on the next step. Anyone can be given
            their own preferences later, under Family.
          </Callout>
        </div>
      )}
    </WizardStep>
  );
};

export default FamilyStep;
