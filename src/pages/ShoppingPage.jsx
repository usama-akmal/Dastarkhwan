import React, { useMemo, useState } from 'react';
import { useCookingHistory, useDishes, useSettings } from '../hooks/useDatabase';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  db,
  addShoppingItem,
  setShoppingItemChecked,
  toggleDerivedShoppingItem,
  deleteShoppingItem,
  clearShoppingList,
} from '../data/db';
import { buildShoppingList, futureEntries } from '../utils/ingredients';
import { todayKey } from '../utils/dates';
import { Icon } from '../components/ui/Icon';
import { Checkbox } from '../components/ui/Controls';

const GROUP_LABELS = {
  meat: 'Meat & fish',
  produce: 'Fruit & veg',
  staples: 'Rice, flour & pulses',
  dairy: 'Dairy & eggs',
  other: 'Other',
};

const GROUP_ICONS = {
  meat: 'pot',
  produce: 'recipes',
  staples: 'database',
  dairy: 'sparkle',
  other: 'filter',
};

const WINDOW_OPTIONS = [
  { days: 7, label: 'Next 7 days' },
  { days: 14, label: 'Next 14 days' },
];

/**
 * Shopping list.
 *
 * The derived part is recomputed from the planned meals on every render, so it can
 * never disagree with the plan: change a meal and the list follows. Only what the
 * household types themselves, and which lines are ticked, are stored.
 *
 * Scope: coarse ingredients, no quantities. The seed data has no recipe data, so
 * claiming amounts would be invented. It is explicitly editable to compensate.
 */
export const ShoppingPage = () => {
  const { history } = useCookingHistory();
  const { dishes } = useDishes();
  const { settings } = useSettings();
  const storedItems = useLiveQuery(() => db.shoppingItems.toArray());

  const [days, setDays] = useState(7);
  const [draft, setDraft] = useState('');
  const [showChecked, setShowChecked] = useState(true);

  const planned = useMemo(
    () => futureEntries(history, { days, todayKey: todayKey() }),
    [history, days],
  );

  const derived = useMemo(() => buildShoppingList(dishes, planned), [dishes, planned]);

  const items = storedItems || [];
  const checkedByName = new Map(items.map((i) => [i.name.toLowerCase(), i]));
  const manualItems = items.filter((i) => i.manual && !derived.some((d) => d.name.toLowerCase() === i.name.toLowerCase()));

  const isChecked = (name) => checkedByName.get(name.toLowerCase())?.checked ?? false;

  // Group derived ingredients, then append manual entries under Other.
  const grouped = useMemo(() => {
    const out = new Map();
    for (const item of derived) {
      if (!out.has(item.group)) out.set(item.group, []);
      out.get(item.group).push(item);
    }
    return out;
  }, [derived]);

  const totalCount = derived.length + manualItems.length;
  const doneCount = derived.filter((i) => isChecked(i.name)).length
    + manualItems.filter((i) => i.checked).length;

  const handleAdd = async (event) => {
    event.preventDefault();
    const name = draft.trim();
    if (!name) return;
    await addShoppingItem(name);
    setDraft('');
  };

  const visibleGroups = [...grouped.entries()].filter(([group]) => (
    showChecked || grouped.get(group).some((i) => !isChecked(i.name))
  ));

  return (
    <div>
      <p style={{ margin: '0 0 var(--space-5)', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
        Built from the meals planned in the window below. Add anything else you need —
        it stays on your list.
      </p>

      {/* --------------------------------------------------------- Progress */}
      <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="row-between" style={{ marginBottom: 'var(--space-2)' }}>
          <span className="form-label" style={{ marginBottom: 0 }}>{WINDOW_OPTIONS.find((o) => o.days === days)?.label}</span>
          <span className="tabular" style={{ fontSize: 'var(--text-sm)', color: 'var(--accent)', fontWeight: 'var(--weight-semibold)' }}>
            {doneCount}/{totalCount}
          </span>
        </div>
        <div className="stat-bar">
          <div className="stat-bar__fill" style={{ width: `${totalCount ? (doneCount / totalCount) * 100 : 0}%` }} />
        </div>
        <p className="form-hint" style={{ marginTop: 'var(--space-2)', marginBottom: 0 }}>
          {planned.length === 0
            ? 'No meals planned in this window yet — accept some suggestions and they will appear here.'
            : `${planned.length} meal${planned.length === 1 ? '' : 's'} planned, needing ${derived.length} ingredient${derived.length === 1 ? '' : 's'}.`}
        </p>

        <div className="segmented" role="group" aria-label="Planning window" style={{ marginTop: 'var(--space-4)' }}>
          {WINDOW_OPTIONS.map((option) => (
            <button
              key={option.days}
              type="button"
              className="segmented__option"
              aria-pressed={days === option.days}
              onClick={() => setDays(option.days)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* -------------------------------------------------------- Add an item */}
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
        <input
          type="text"
          className="input"
          placeholder="Add an item…"
          aria-label="Add a shopping item"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          style={{ flex: 1, minWidth: 0 }}
        />
        <button type="submit" className="btn btn-secondary" disabled={!draft.trim()} aria-label="Add item">
          <Icon name="plus" size={18} />
        </button>
      </form>

      {totalCount > 0 && (
        <div className="row-between" style={{ marginBottom: 'var(--space-3)' }}>
          <Checkbox
            id="show-ticked"
            label="Show ticked items"
            checked={showChecked}
            onChange={setShowChecked}
          />
          <button
            type="button"
            className="btn btn-ghost btn--sm"
            onClick={() => {
              if (window.confirm('Clear the whole shopping list, including items you added?')) clearShoppingList();
            }}
          >
            <Icon name="trash" size={14} /> Clear
          </button>
        </div>
      )}

      {/* ------------------------------------------------------ The list */}
      {totalCount === 0 ? (
        <div className="empty-state card">
          <span style={{
            display: 'grid', placeItems: 'center', width: 56, height: 56,
            borderRadius: 'var(--radius-full)', background: 'var(--fill-soft)', color: 'var(--text-muted)',
          }}>
            <Icon name="filter" size={26} />
          </span>
          <p style={{ margin: 0, fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)' }}>
            Nothing on the list yet
          </p>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
            Plan some meals, or add items by hand above.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
          {visibleGroups.map(([group, groupItems]) => {
            const visible = showChecked ? groupItems : groupItems.filter((i) => !isChecked(i.name));
            if (visible.length === 0) return null;
            return (
              <section key={group}>
                <h2 style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                  margin: '0 0 var(--space-3)', paddingBottom: 'var(--space-2)',
                  borderBottom: '1px solid var(--border-subtle)',
                  fontFamily: 'var(--font-heading)', fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--weight-semibold)', color: 'var(--accent)',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  <Icon name={GROUP_ICONS[group] || 'filter'} size={15} />
                  {GROUP_LABELS[group] || group}
                </h2>

                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 'var(--space-1)' }}>
                  {visible.map((item) => {
                    const checked = isChecked(item.name);
                    return (
                      <li key={item.name}>
                        <div style={{
                          display: 'flex', alignItems: 'center',
                          padding: 'var(--space-2) var(--space-3)',
                          borderRadius: 'var(--radius-md)',
                          background: checked ? 'transparent' : 'var(--fill-subtle)',
                        }}>
                          <Checkbox
                            id={`shop-${item.name.replace(/\s+/g, '-')}`}
                            label={item.name}
                            checked={checked}
                            onChange={(next) => toggleDerivedShoppingItem(item.name, next)}
                            /* Why this is on the list, so it can be judged rather than trusted. */
                            hint={`${item.sources.slice(0, 2).join(', ')}${item.sources.length > 2 ? ` +${item.sources.length - 2}` : ''}`}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}

          {manualItems.length > 0 && (
            <section>
              <h2 style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                margin: '0 0 var(--space-3)', paddingBottom: 'var(--space-2)',
                borderBottom: '1px solid var(--border-subtle)',
                fontFamily: 'var(--font-heading)', fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-semibold)', color: 'var(--accent)',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                <Icon name="edit" size={15} /> Added by you
              </h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 'var(--space-1)' }}>
                {manualItems.map((item) => (
                  <li key={item.id} className="row-between" style={{
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--fill-subtle)',
                    gap: 'var(--space-2)',
                  }}>
                    <Checkbox
                      id={`manual-${item.id}`}
                      label={item.name}
                      checked={item.checked}
                      onChange={(next) => setShoppingItemChecked(item.id, next)}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost"
                      aria-label={`Remove ${item.name}`}
                      onClick={() => deleteShoppingItem(item.id)}
                      style={{ minWidth: 34, minHeight: 34, padding: 0, color: 'var(--danger)' }}
                    >
                      <Icon name="close" size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <p className="form-hint" style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
        A coarse list of what to buy, not a recipe. Quantities are not included because
        your recipes do not record them{settings?.familyName ? `, ${settings.familyName}` : ''}.
      </p>
    </div>
  );
};

export default ShoppingPage;
