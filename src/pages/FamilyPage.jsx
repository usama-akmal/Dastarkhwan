import React, { useState } from 'react';
import { useFamilyMembers, useDishes } from '../hooks/useDatabase';
import { addFamilyMember, deleteFamilyMember, setMemberPreference } from '../data/db';
import { Icon } from '../components/ui/Icon';
import { Modal } from '../components/ui/Modal';
import { PreferenceControl } from '../components/ui/Controls';

const ROLES = ['husband', 'wife', 'son', 'daughter', 'father', 'mother', 'brother', 'sister', 'other'];

export const FamilyPage = () => {
  const { members, loading: membersLoading } = useFamilyMembers();
  const { dishes, loading: dishesLoading } = useDishes();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', role: 'other' });
  const [editingMember, setEditingMember] = useState(null);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [editingDish, setEditingDish] = useState(null);

  const groupedDishes = (dishes || []).reduce((acc, dish) => {
    (acc[dish.proteinType || 'other'] ||= []).push(dish);
    return acc;
  }, {});

  const handleAddSubmit = async (event) => {
    event.preventDefault();
    const name = newMember.name.trim();
    if (!name) return;
    await addFamilyMember({ ...newMember, name, preferences: {} });
    setIsAddOpen(false);
    setNewMember({ name: '', role: 'other' });
  };

  const handleDelete = async (member) => {
    if (window.confirm(`Remove ${member.name}? Their preferences will be deleted.`)) {
      await deleteFamilyMember(member.id);
    }
  };

  /** Tapping the active state clears it, returning the dish to "no opinion". */
  const updatePreference = async (memberId, currentPrefs, dishId, pref) => {
    const nextValue = currentPrefs?.[dishId] === pref ? null : pref;

    if (editingMember && editingMember.id === memberId) {
      const next = { ...(editingMember.preferences || {}) };
      if (nextValue === null) delete next[dishId];
      else next[dishId] = nextValue;
      setEditingMember({ ...editingMember, preferences: next });
    }

    await setMemberPreference(memberId, dishId, nextValue);
  };

  if (membersLoading || dishesLoading) {
    return (
      <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
        <div className="skeleton" style={{ height: 90, borderRadius: 'var(--radius-lg)' }} />
        <div className="skeleton" style={{ height: 90, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  const filteredDishes = (dishes || []).filter(
    (dish) => dish.nameEn?.toLowerCase().includes(search.toLowerCase()) || dish.nameUr?.includes(search),
  );

  /* ==================================================================== LIST */
  if (!isBulkOpen) {
    return (
      <>
        {members.length === 0 ? (
          <div className="empty-state card">
            <span style={{
              display: 'grid', placeItems: 'center', width: 56, height: 56,
              borderRadius: 'var(--radius-full)', background: 'var(--fill-soft)', color: 'var(--text-muted)',
            }}>
              <Icon name="family" size={26} />
            </span>
            <p style={{ margin: 0, fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)' }}>
              No family members yet
            </p>
            <p style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
              Add each person so the planner knows what everyone will eat.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
            {members.map((member) => {
              const prefs = member.preferences || {};
              const values = Object.values(prefs);
              const loves = values.filter((v) => v === 'loves').length;
              const eats = values.filter((v) => v === 'eats').length;
              const wont = values.filter((v) => v === 'wont_touch').length;
              const total = loves + eats + wont || 1;

              return (
                <article key={member.id} id={`member-card-${member.id}`} className="card" style={{ padding: 'var(--space-4)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                    <span className="avatar" aria-hidden="true">{member.name[0]}</span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{
                        margin: '0 0 2px', fontFamily: 'var(--font-heading)',
                        fontSize: 'var(--text-md)', fontWeight: 'var(--weight-semibold)',
                      }}>
                        {member.name}
                      </h3>
                      <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                        {member.role}
                        {total > 1 && ` · ${loves + eats + wont} rated`}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn btn-ghost"
                      id={`btn-delete-member-${member.id}`}
                      onClick={() => handleDelete(member)}
                      aria-label={`Remove ${member.name}`}
                      style={{ color: 'var(--danger)', minWidth: 40, minHeight: 40, padding: 0 }}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>

                  {/* A stacked bar makes the preference mix scannable at a glance. */}
                  {loves + eats + wont > 0 && (
                    <div style={{ display: 'flex', gap: 2, height: 5, marginTop: 'var(--space-4)' }} aria-hidden="true">
                      {loves > 0 && <span style={{ flex: loves, background: 'var(--danger)', borderRadius: 'var(--radius-full)' }} />}
                      {eats > 0 && <span style={{ flex: eats, background: 'var(--success)', borderRadius: 'var(--radius-full)' }} />}
                      {wont > 0 && <span style={{ flex: wont, background: 'var(--text-muted)', borderRadius: 'var(--radius-full)' }} />}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    <span className="icon-text"><Icon name="heart" size={13} style={{ color: 'var(--danger)' }} /> {loves}</span>
                    <span className="icon-text"><Icon name="thumbUp" size={13} style={{ color: 'var(--success)' }} /> {eats}</span>
                    <span className="icon-text"><Icon name="ban" size={13} /> {wont}</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn--sm"
                      id={`btn-edit-prefs-${member.id}`}
                      style={{ marginLeft: 'auto' }}
                      onClick={() => setEditingMember(member)}
                    >
                      Edit preferences
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          <button type="button" className="btn btn-primary btn--block" id="btn-add-member" onClick={() => setIsAddOpen(true)}>
            <Icon name="plus" size={18} /> Add a family member
          </button>
          <button type="button" className="btn btn-secondary btn--block" id="btn-open-bulk" onClick={() => setIsBulkOpen(true)}>
            <Icon name="filter" size={17} /> Rate dishes one by one
          </button>
        </div>

        {/* -------------------------------------------------- Add member modal */}
        {isAddOpen && (
          <Modal
            title="Add a family member"
            titleId="add-member-title"
            onClose={() => setIsAddOpen(false)}
            footer={(
              <>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsAddOpen(false)}>
                  Cancel
                </button>
                <button type="submit" form="add-member-form" id="btn-save-member" className="btn btn-primary" style={{ flex: 1 }}>
                  Add
                </button>
              </>
            )}
          >
            <form id="add-member-form" onSubmit={handleAddSubmit} style={{ display: 'grid', gap: 'var(--space-5)' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="new-member-name">Name</label>
                <input
                  id="new-member-name"
                  type="text"
                  className="input"
                  required
                  placeholder="e.g. Ammi"
                  value={newMember.name}
                  onChange={(event) => setNewMember({ ...newMember, name: event.target.value })}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="new-member-role">Role</label>
                <select
                  id="new-member-role"
                  className="select"
                  value={newMember.role}
                  onChange={(event) => setNewMember({ ...newMember, role: event.target.value })}
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                  ))}
                </select>
              </div>
            </form>
          </Modal>
        )}

        {/* ------------------------------------- Per-member preference editor */}
        {editingMember && (
          <Modal
            title={`${editingMember.name}'s preferences`}
            titleId="prefs-modal-title"
            onClose={() => setEditingMember(null)}
          >
            <p style={{ marginTop: 0, marginBottom: 'var(--space-5)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              Tap a state again to clear it and return the dish to &ldquo;no opinion&rdquo;.
              Anyone marked <Icon name="ban" size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> never
              gets that dish suggested.
            </p>

            <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
              {Object.entries(groupedDishes).map(([protein, list]) => (
                <section key={protein}>
                  <h3 style={{
                    margin: '0 0 var(--space-2)', paddingBottom: 'var(--space-2)',
                    borderBottom: '1px solid var(--border-subtle)',
                    fontFamily: 'var(--font-heading)', fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--weight-semibold)', textTransform: 'capitalize', color: 'var(--accent)',
                  }}>
                    {protein}
                  </h3>
                  <div style={{ display: 'grid', gap: 'var(--space-1)' }}>
                    {list.map((dish) => (
                      <div key={dish.id} className="row-between" style={{ gap: 'var(--space-3)', padding: 'var(--space-1) 0' }}>
                        <span style={{ fontSize: 'var(--text-base)', minWidth: 0 }}>{dish.nameEn}</span>
                        <PreferenceControl
                          dishName={dish.nameEn}
                          value={(editingMember.preferences || {})[dish.id] || null}
                          onChange={(next) => updatePreference(
                            editingMember.id,
                            editingMember.preferences || {},
                            dish.id,
                            next,
                          )}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </Modal>
        )}
      </>
    );
  }

  /* ================================================================ BULK VIEW */
  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        minHeight: 'var(--control-height-md)',
        padding: '0 var(--space-4)',
        marginBottom: 'var(--space-4)',
        background: 'var(--fill-subtle)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-full)',
      }}>
        <Icon name="search" size={17} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          type="search"
          placeholder="Find a dish"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Find a dish"
          style={{
            flex: 1, minWidth: 0, border: 'none', background: 'transparent',
            color: 'var(--text-primary)', font: 'inherit', outline: 'none', padding: 0,
          }}
        />
      </div>

      <button type="button" className="btn btn-secondary btn--block" onClick={() => setIsBulkOpen(false)} style={{ marginBottom: 'var(--space-5)' }}>
        <Icon name="arrowLeft" size={16} /> Back to family
      </button>

      <p className="form-hint" style={{ marginBottom: 'var(--space-3)' }}>
        Pick a dish, then set what each person thinks of it.
      </p>

      <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
        {filteredDishes.map((dish) => {
          const rated = (members || []).reduce((count, member) => (
            count + ((member.preferences || {})[dish.id] ? 1 : 0)
          ), 0);

          return (
            <button
              type="button"
              key={dish.id}
              className="card card--interactive"
              onClick={() => setEditingDish(dish)}
              style={{
                padding: 'var(--space-3) var(--space-4)',
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', gap: 'var(--space-3)',
              }}
            >
              <span style={{ minWidth: 0, textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: 'var(--text-base)', fontWeight: 'var(--weight-medium)' }}>
                  {dish.nameEn}
                </span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  {dish.proteinType} · {rated === 0 ? 'not rated' : `${rated} of ${members.length} rated`}
                </span>
              </span>
              <Icon name="chevronRight" size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            </button>
          );
        })}
      </div>

      {/* --------------------------------------------------- Per-dish editor */}
      {editingDish && (
        <Modal
          title={editingDish.nameEn}
          titleId="dish-prefs-modal-title"
          onClose={() => setEditingDish(null)}
        >
          {editingDish.nameUr && (
            <p lang="ur" dir="rtl" style={{
              margin: '0 0 var(--space-5)', fontFamily: 'var(--font-urdu)',
              fontSize: 'var(--text-lg)', color: 'var(--accent)',
            }}>
              {editingDish.nameUr}
            </p>
          )}

          <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
            {(members || []).map((member) => {
              const pref = (member.preferences || {})[editingDish.id] || null;
              return (
                <div key={member.id} className="row-between" style={{
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3)',
                  background: 'var(--fill-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0 }}>
                    <span className="avatar avatar--sm" aria-hidden="true">{member.name[0]}</span>
                    <span style={{ fontWeight: 'var(--weight-medium)', fontSize: 'var(--text-base)' }}>{member.name}</span>
                  </span>
                  <PreferenceControl
                    dishName={`${editingDish.nameEn} for ${member.name}`}
                    value={pref}
                    onChange={(next) => updatePreference(member.id, member.preferences || {}, editingDish.id, next)}
                  />
                </div>
              );
            })}
          </div>
        </Modal>
      )}
    </>
  );
};

export default FamilyPage;
