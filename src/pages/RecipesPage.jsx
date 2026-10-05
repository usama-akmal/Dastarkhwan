import React, { useState } from 'react';
import { useDishes, useFamilyMembers } from '../hooks/useDatabase';
import { deleteDish, updateDish, setMemberPreference } from '../data/db';
import { PREF, RULE_CATEGORY_VALUES, RULE_CATEGORIES } from '../utils/preferences';
import { Icon } from '../components/ui/Icon';
import { Modal } from '../components/ui/Modal';
import { Checkbox } from '../components/ui/Controls';

const PROTEIN_VALUES = RULE_CATEGORY_VALUES[RULE_CATEGORIES.PROTEIN_TYPE];
const PROTEIN_FILTERS = ['All', ...PROTEIN_VALUES.map((p) => p.charAt(0).toUpperCase() + p.slice(1))];
const DISH_TYPES = RULE_CATEGORY_VALUES[RULE_CATEGORIES.DISH_TYPE];
const DIETARY_OPTIONS = RULE_CATEGORY_VALUES[RULE_CATEGORIES.DIETARY_TAGS];
const CUISINE_TYPES = ['punjabi', 'sindhi', 'pathan', 'mughlai', 'chinese-pakistani', 'fast-food', 'general'];

const emptyDish = () => ({
  nameEn: '',
  nameUr: '',
  proteinType: 'chicken',
  dishType: 'curry',
  dietaryTags: [],
  cuisineType: 'punjabi',
});

export const RecipesPage = () => {
  const { dishes, loading, addDish } = useDishes();
  const { members } = useFamilyMembers();

  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(emptyDish);
  const [justAdded, setJustAdded] = useState(null);

  const filteredDishes = (dishes || []).filter((dish) => {
    const needle = search.toLowerCase();
    const matchesSearch = dish.nameEn?.toLowerCase().includes(needle) || dish.nameUr?.includes(search);
    const matchesFilter = filter === 'All' || dish.proteinType?.toLowerCase() === filter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  const openAdd = () => {
    setEditingId(null);
    setDraft(emptyDish());
    setIsModalOpen(true);
  };

  const openEdit = (dish) => {
    setEditingId(dish.id);
    setDraft({
      nameEn: dish.nameEn || '',
      nameUr: dish.nameUr || '',
      proteinType: dish.proteinType || 'chicken',
      dishType: dish.dishType || 'curry',
      dietaryTags: dish.dietaryTags || [],
      cuisineType: dish.cuisineType || 'punjabi',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nameEn = draft.nameEn.trim();
    if (!nameEn) return;

    if (editingId != null) {
      await updateDish(editingId, { ...draft, nameEn });
      setIsModalOpen(false);
      setEditingId(null);
      return;
    }

    const id = await addDish({ ...draft, nameEn });
    setIsModalOpen(false);
    setDraft(emptyDish());
    // Offer to rate it now — otherwise a new dish silently sits at "no opinion"
    // and the user has to hunt for it among 80+ rows in Family.
    setJustAdded({ id, name: nameEn });
  };

  const handleDelete = async (dish) => {
    if (!window.confirm(`Delete "${dish.nameEn}"? Its cooking history and any family preferences for it will also be removed.`)) return;
    try {
      await deleteDish(dish.id);
    } catch (error) {
      window.alert(error.message);
    }
  };

  const rateForEveryone = async (preference) => {
    if (!justAdded) return;
    for (const member of members || []) {
      await setMemberPreference(member.id, justAdded.id, preference);
    }
    setJustAdded(null);
  };

  const toggleTag = (tag) => setDraft((prev) => ({
    ...prev,
    dietaryTags: prev.dietaryTags.includes(tag)
      ? prev.dietaryTags.filter((t) => t !== tag)
      : [...prev.dietaryTags, tag],
  }));

  if (loading) {
    return (
      <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
        <div className="skeleton" style={{ height: 48, borderRadius: 'var(--radius-md)' }} />
        <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  return (
    <>
      {/* ------------------------------------------------------------ Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        minHeight: 'var(--control-height-md)',
        padding: '0 var(--space-4)',
        marginBottom: 'var(--space-4)',
        background: 'var(--fill-subtle)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-full)',
        transition: 'border-color var(--duration-fast) var(--ease-out)',
      }}>
        <Icon name="search" size={17} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          id="recipe-search"
          type="search"
          placeholder="Search dishes"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search dishes"
          style={{
            flex: 1, minWidth: 0, border: 'none', background: 'transparent',
            color: 'var(--text-primary)', font: 'inherit', outline: 'none', padding: 0,
          }}
        />
        {search && (
          <button
            type="button"
            className="btn btn-ghost"
            aria-label="Clear search"
            onClick={() => setSearch('')}
            style={{ minWidth: 28, minHeight: 28, padding: 0 }}
          >
            <Icon name="close" size={14} />
          </button>
        )}
      </div>

      {/* ----------------------------------------------------------- Filters */}
      <div className="chip-row" role="group" aria-label="Filter by protein">
        {PROTEIN_FILTERS.map((protein) => {
          const isActive = filter === protein;
          return (
            <button
              type="button"
              id={`filter-${protein.toLowerCase()}`}
              key={protein}
              className={`tag-pill${isActive && protein !== 'All' ? ` tag-pill--${protein.toLowerCase()}` : ''}`}
              aria-pressed={isActive}
              onClick={() => setFilter(protein)}
            >
              {protein}
            </button>
          );
        })}
      </div>

      <p className="form-hint" style={{ marginBottom: 'var(--space-3)' }}>
        Showing <span className="tabular">{filteredDishes.length}</span> of {(dishes || []).length} dishes
      </p>

      {/* -------------------------------------------------- Post-add rating */}
      {justAdded && (
        <div className="card animate-fade-in-up" style={{
          marginBottom: 'var(--space-5)',
          borderColor: 'var(--accent-border)',
          background: 'var(--accent-softer)',
        }}>
          <p style={{ margin: '0 0 var(--space-3)', fontSize: 'var(--text-sm)' }}>
            <strong>{justAdded.name}</strong> added. How does your family feel about it?
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary btn--sm" onClick={() => rateForEveryone(PREF.LOVES)}>
              <Icon name="heart" size={15} /> Loves
            </button>
            <button type="button" className="btn btn-secondary btn--sm" onClick={() => rateForEveryone(PREF.EATS)}>
              <Icon name="thumbUp" size={15} /> Eats
            </button>
            <button type="button" className="btn btn-secondary btn--sm" onClick={() => rateForEveryone(PREF.WONT_TOUCH)}>
              <Icon name="ban" size={15} /> Won&rsquo;t
            </button>
            <button type="button" className="btn btn-ghost btn--sm" onClick={() => setJustAdded(null)}>
              Skip
            </button>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------- Dish grid */}
      {filteredDishes.length === 0 ? (
        <div className="empty-state">
          <Icon name="search" size={28} style={{ color: 'var(--text-muted)' }} />
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>No dishes match that search.</p>
          <button type="button" className="btn btn-primary" onClick={openAdd}>
            <Icon name="plus" size={17} /> Add a recipe
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 'var(--space-3)' }}>
          {filteredDishes.map((dish) => (
            <article
              key={dish.id}
              id={`dish-card-${dish.id}`}
              className="card"
              style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
            >
              <div>
                <h3 style={{
                  margin: '0 0 2px', fontFamily: 'var(--font-heading)',
                  fontSize: 'var(--text-md)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)',
                }}>
                  {dish.nameEn}
                </h3>
                {dish.nameUr && (
                  <p lang="ur" dir="rtl" style={{
                    margin: 0, fontFamily: 'var(--font-urdu)',
                    fontSize: 'var(--text-sm)', color: 'var(--accent)', lineHeight: 2,
                  }}>
                    {dish.nameUr}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 'auto' }}>
                <span className={`tag-pill tag-pill--${dish.proteinType?.toLowerCase()}`} style={{ fontSize: 'var(--text-2xs)' }}>
                  {dish.proteinType}
                </span>
                <span className="tag-pill" style={{ fontSize: 'var(--text-2xs)' }}>{dish.dishType}</span>
              </div>

              {dish.isCustom && (
                <div style={{ display: 'flex', gap: 'var(--space-1)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)' }}>
                  <button type="button" id={`btn-edit-dish-${dish.id}`} className="btn btn-ghost btn--sm" onClick={() => openEdit(dish)}>
                    <Icon name="edit" size={14} /> Edit
                  </button>
                  <button
                    type="button"
                    id={`btn-delete-dish-${dish.id}`}
                    className="btn btn-ghost btn--sm"
                    onClick={() => handleDelete(dish)}
                    style={{ color: 'var(--danger)' }}
                  >
                    <Icon name="trash" size={14} /> Delete
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <button type="button" id="fab-add-dish" className="fab" aria-label="Add a recipe" onClick={openAdd}>
        <Icon name="plus" size={26} strokeWidth={2.4} />
      </button>

      {isModalOpen && (
        <Modal
          title={editingId != null ? 'Edit dish' : 'Add a dish'}
          titleId="dish-modal-title"
          onClose={() => setIsModalOpen(false)}
          footer={(
            <>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" form="dish-form" id="btn-submit-add" className="btn btn-primary" style={{ flex: 1 }}>
                {editingId != null ? 'Save changes' : 'Add dish'}
              </button>
            </>
          )}
        >
          <form id="dish-form" onSubmit={handleSubmit} style={{ display: 'grid', gap: 'var(--space-4)' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="new-dish-name-en">Name (English)</label>
              <input
                id="new-dish-name-en"
                type="text"
                className="input"
                required
                placeholder="e.g. Aloo Gosht"
                value={draft.nameEn}
                onChange={(event) => setDraft({ ...draft, nameEn: event.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="new-dish-name-ur">Name (Urdu)</label>
              <input
                id="new-dish-name-ur"
                type="text"
                lang="ur"
                dir="rtl"
                className="input"
                placeholder="آلو گوشت"
                style={{ fontFamily: 'var(--font-urdu)' }}
                value={draft.nameUr}
                onChange={(event) => setDraft({ ...draft, nameUr: event.target.value })}
              />
              <span className="form-hint">Optional, but it is what most of the family will read.</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="new-dish-protein">Protein</label>
                <select
                  id="new-dish-protein"
                  className="select"
                  value={draft.proteinType}
                  onChange={(event) => setDraft({ ...draft, proteinType: event.target.value })}
                >
                  {PROTEIN_VALUES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="new-dish-type">Type</label>
                <select
                  id="new-dish-type"
                  className="select"
                  value={draft.dishType}
                  onChange={(event) => setDraft({ ...draft, dishType: event.target.value })}
                >
                  {DISH_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="new-dish-cuisine">Cuisine</label>
              <select
                id="new-dish-cuisine"
                className="select"
                value={draft.cuisineType}
                onChange={(event) => setDraft({ ...draft, cuisineType: event.target.value })}
              >
                {CUISINE_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
              <legend className="form-label" style={{ marginBottom: 'var(--space-2)', padding: 0 }}>
                Dietary tags
              </legend>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-1) var(--space-3)' }}>
                {DIETARY_OPTIONS.map((tag) => (
                  <Checkbox
                    key={tag}
                    id={`tag-${tag}`}
                    label={tag}
                    checked={draft.dietaryTags.includes(tag)}
                    onChange={() => toggleTag(tag)}
                  />
                ))}
              </div>
            </fieldset>
          </form>
        </Modal>
      )}
    </>
  );
};

export default RecipesPage;
