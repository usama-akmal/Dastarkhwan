import React, { useState } from 'react';
import { useDishes } from '../hooks/useDatabase';

export const RecipesPage = () => {
  const { dishes, loading, addDish } = useDishes();
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [newDish, setNewDish] = useState({
    nameEn: '',
    nameUr: '',
    proteinType: 'chicken',
    dishType: 'curry',
    dietaryTags: [],
    cuisineType: 'punjabi'
  });

  const proteins = ['All', 'Chicken', 'Beef', 'Mutton', 'Fish', 'Eggs', 'Lentils', 'Vegetables'];
  const dishTypes = ['curry', 'rice', 'roti-based', 'soup', 'fried', 'grilled', 'one-pot'];
  const dietaryOptions = ['high-fat', 'low-fat', 'spicy', 'mild', 'quick', 'heavy', 'light'];
  const cuisineTypes = ['punjabi', 'sindhi', 'pathan', 'mughlai', 'chinese-pakistani', 'fast-food'];

  const filteredDishes = (dishes || []).filter(dish => {
    const matchesSearch = (dish.nameEn?.toLowerCase().includes(search.toLowerCase())) || 
                          (dish.nameUr?.includes(search));
    const matchesFilter = filter === 'All' || dish.proteinType?.toLowerCase() === filter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newDish.nameEn) return;
    await addDish(newDish);
    setIsModalOpen(false);
    setNewDish({
      nameEn: '', nameUr: '', proteinType: 'chicken', 
      dishType: 'curry', dietaryTags: [], cuisineType: 'punjabi'
    });
  };

  const handleTagChange = (tag) => {
    setNewDish(prev => {
      const tags = prev.dietaryTags.includes(tag) 
        ? prev.dietaryTags.filter(t => t !== tag)
        : [...prev.dietaryTags, tag];
      return { ...prev, dietaryTags: tags };
    });
  };

  if (loading) {
    return (
      <div className="animate-fade-in-up" style={{ padding: '16px 0' }}>
        <h1 className="section-title" style={{ fontFamily: 'var(--font-heading)' }}>Recipes 🍲</h1>
        <p>Loading dishes...</p>
      </div>
    );
  }

  return (
    <>
      <div style={{ padding: '16px 0', position: 'relative' }} className="animate-fade-in-up">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h1 className="section-title" style={{ fontFamily: 'var(--font-heading)' }}>Recipes 🍲</h1>
          <span style={{ color: 'var(--color-text-secondary)' }}>{filteredDishes.length} dishes</span>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <input 
            id="recipe-search"
            type="text" 
            className="input" 
            placeholder="Search recipes..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', fontFamily: 'var(--font-body)' }} 
          />
        </div>

        <div style={styles.filterContainer}>
          {proteins.map(f => {
            const isActive = filter === f;
            const proteinClass = isActive && f !== 'All' ? `tag-pill--${f.toLowerCase()}` : '';
            return (
              <button
                id={`filter-${f.toLowerCase()}`}
                key={f}
                className={`tag-pill ${proteinClass}`}
                onClick={() => setFilter(f)}
                style={{
                  opacity: isActive ? 1 : 0.7,
                  border: isActive ? 'none' : '1px solid var(--color-border)',
                  backgroundColor: isActive ? '' : 'transparent',
                  fontFamily: 'var(--font-body)'
                }}
              >
                {f}
              </button>
            );
          })}
        </div>

        <div style={{ ...styles.grid, paddingBottom: '120px' }}>
          {filteredDishes.map((dish, i) => (
            <div key={dish.id || i} id={`dish-card-${dish.id}`} className="card-elevated animate-fade-in-up animate-stagger-1" style={styles.recipeCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: 'var(--color-primary)', fontFamily: 'var(--font-heading)' }}>{dish.nameEn}</h3>
                <span className={`tag-pill tag-pill--${dish.proteinType?.toLowerCase()}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                  {dish.proteinType}
                </span>
              </div>
              {dish.nameUr && (
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--color-accent)', fontFamily: "'Noto Nastaliq Urdu', serif", direction: 'rtl' }}>
                  {dish.nameUr}
                </h4>
              )}
              <div style={{ marginTop: 'auto' }}>
                <span className="tag-pill" style={{ fontSize: '10px' }}>{dish.dishType}</span>
              </div>
            </div>
          ))}
          {filteredDishes.length === 0 && (
            <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '32px 16px', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '2rem' }}>🥣</div>
              <p style={{ margin: 0 }}>No recipes found.</p>
              <button 
                className="btn-primary" 
                onClick={() => setIsModalOpen(true)}
              >
                + Add a Recipe
              </button>
            </div>
          )}
        </div>
      </div>

      <button 
        id="fab-add-dish"
        className="btn-primary hover-lift" 
        style={styles.fab}
        onClick={() => setIsModalOpen(true)}
      >
        +
      </button>

      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="card-elevated animate-fade-in-up">
            <h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-primary)', marginBottom: '16px' }}>Add New Dish</h2>
            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              <div>
                <label htmlFor="new-dish-name-en" style={styles.label}>Name (English)</label>
                <input id="new-dish-name-en" type="text" className="input" required style={{ width: '100%' }}
                  value={newDish.nameEn} onChange={e => setNewDish({...newDish, nameEn: e.target.value})} />
              </div>

              <div>
                <label htmlFor="new-dish-name-ur" style={styles.label}>Name (Urdu)</label>
                <input id="new-dish-name-ur" type="text" className="input" style={{ width: '100%', fontFamily: "'Noto Nastaliq Urdu', serif", direction: 'rtl' }}
                  value={newDish.nameUr} onChange={e => setNewDish({...newDish, nameUr: e.target.value})} />
              </div>

              <div>
                <label htmlFor="new-dish-protein" style={styles.label}>Protein Type</label>
                <select id="new-dish-protein" className="input" style={{ width: '100%' }}
                  value={newDish.proteinType} onChange={e => setNewDish({...newDish, proteinType: e.target.value})}>
                  {proteins.filter(p => p !== 'All').map(p => <option key={p} value={p.toLowerCase()}>{p}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="new-dish-type" style={styles.label}>Dish Type</label>
                <select id="new-dish-type" className="input" style={{ width: '100%' }}
                  value={newDish.dishType} onChange={e => setNewDish({...newDish, dishType: e.target.value})}>
                  {dishTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="new-dish-cuisine" style={styles.label}>Cuisine Type</label>
                <select id="new-dish-cuisine" className="input" style={{ width: '100%' }}
                  value={newDish.cuisineType} onChange={e => setNewDish({...newDish, cuisineType: e.target.value})}>
                  {cuisineTypes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label style={styles.label}>Dietary Tags</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {dietaryOptions.map(tag => (
                    <label key={tag} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', color: 'var(--color-text)' }}>
                      <input id={`tag-${tag}`} type="checkbox" checked={newDish.dietaryTags.includes(tag)}
                        onChange={() => handleTagChange(tag)} />
                      {tag}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="button" id="btn-cancel-add" className="btn-secondary" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" id="btn-submit-add" className="btn-primary" style={{ flex: 1 }}>Save Dish</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

const styles = {
  filterContainer: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    paddingBottom: '12px',
    marginBottom: '12px',
    scrollbarWidth: 'none',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  recipeCard: {
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100px'
  },
  fab: {
    position: 'fixed',
    bottom: '100px',
    right: '24px',
    width: '64px',
    height: '64px',
    borderRadius: '28px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '24px',
    boxShadow: '0 4px 12px var(--shadow-color, rgba(231, 111, 81, 0.4))',
    zIndex: 100,
  },
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
    maxWidth: '400px',
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: '24px'
  },
  label: {
    display: 'block',
    marginBottom: '4px',
    fontSize: '14px',
    color: 'var(--color-text-secondary)',
    fontFamily: 'var(--font-body)'
  }
};
