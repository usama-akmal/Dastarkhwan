import React, { useState, useMemo } from 'react';
import { useCookingHistory, useDishes } from '../hooks/useDatabase';
import { db } from '../data/db';
import { toLocalDateKey, todayKey, monthKeyRange } from '../utils/dates';
import { Icon } from '../components/ui/Icon';
import { Modal } from '../components/ui/Modal';
import { Segmented } from '../components/ui/Controls';

const PROTEIN_VARS = {
  chicken: 'var(--protein-chicken)',
  beef: 'var(--protein-beef)',
  mutton: 'var(--protein-mutton)',
  fish: 'var(--protein-fish)',
  eggs: 'var(--protein-eggs)',
  lentils: 'var(--protein-lentils)',
  vegetables: 'var(--protein-vegetables)',
};

const MEAL_OPTIONS = [
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
];

export const CalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [logDishId, setLogDishId] = useState('');
  const [logMealType, setLogMealType] = useState('dinner');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const { startDate, endDate, daysInMonth, firstDayOfWeek } = monthKeyRange(currentDate);

  const { history, loading } = useCookingHistory(startDate, endDate);
  const { dishes } = useDishes();

  const dishMap = useMemo(() => {
    const map = new Map();
    (dishes || []).forEach((dish) => map.set(dish.id, dish));
    return map;
  }, [dishes]);

  const historyByDate = useMemo(() => {
    const grouped = {};
    (history || []).forEach((entry) => {
      (grouped[entry.date] ||= []).push(entry);
    });
    return grouped;
  }, [history]);

  const monthStats = useMemo(() => {
    const counts = {};
    (history || []).forEach((entry) => {
      const protein = dishMap.get(entry.dishId)?.proteinType || 'unknown';
      counts[protein] = (counts[protein] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [history, dishMap]);

  const today = new Date();
  const isCurrentMonth = month === today.getMonth() && year === today.getFullYear();
  const selectedDateKey = selectedDay === null
    ? todayKey()
    : toLocalDateKey(new Date(year, month, selectedDay));
  const selectedDayHistory = historyByDate[selectedDateKey] || [];
  const totalMeals = (history || []).length;
  const maxStat = monthStats[0]?.[1] || 1;

  const openLogForm = () => {
    setLogDishId(dishes?.[0]?.id != null ? String(dishes[0].id) : '');
    setIsLogOpen(true);
  };

  const handleLogMeal = async (event) => {
    event.preventDefault();
    const dish = dishes.find((d) => String(d.id) === String(logDishId));
    if (!dish) return;
    // Manual entry: reality diverges from the suggestion, and a plan the app cannot
    // correct becomes fiction that poisons every later cooldown.
    await db.cookingHistory.add({ dishId: dish.id, date: selectedDateKey, mealType: logMealType });
    setIsLogOpen(false);
  };

  const renderCells = () => {
    const cells = [];
    const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    for (let i = 0; i < offset; i += 1) {
      cells.push(<div key={`empty-${i}`} aria-hidden="true" />);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = toLocalDateKey(new Date(year, month, day));
      const dayHistory = historyByDate[dateKey] || [];
      const isToday = isCurrentMonth && day === today.getDate();
      const isSelected = selectedDay === day;
      const label = new Date(year, month, day)
        .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

      cells.push(
        <button
          type="button"
          key={`day-${day}`}
          className="cal-cell"
          data-today={isToday || undefined}
          data-selected={isSelected || undefined}
          onClick={() => setSelectedDay(isSelected ? null : day)}
          aria-label={`${label}${dayHistory.length ? `, ${dayHistory.length} meal${dayHistory.length > 1 ? 's' : ''} logged` : ', no meals logged'}`}
          aria-pressed={isSelected}
        >
          <span className="cal-cell__num">{day}</span>
          <span className="cal-cell__dots" aria-hidden="true">
            {dayHistory.slice(0, 3).map((entry) => (
              <span
                key={entry.id}
                className="cal-cell__dot"
                style={{ background: PROTEIN_VARS[dishMap.get(entry.dishId)?.proteinType] || 'var(--text-muted)' }}
              />
            ))}
          </span>
        </button>,
      );
    }
    return cells;
  };

  return (
    <div>
      <p style={{ margin: '0 0 var(--space-5)', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
        Tap any day to review or correct what was cooked.
      </p>

      {/* ------------------------------------------------------- Month header */}
      <div className="card-elevated" style={{ marginBottom: 'var(--space-5)', padding: 'var(--space-5)' }}>
        <div className="row-between" style={{ marginBottom: 'var(--space-4)' }}>
          <button type="button" id="prev-month" className="btn btn-icon" aria-label="Previous month" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>
            <Icon name="chevronLeft" size={18} />
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)' }}>
              {currentDate.toLocaleDateString('en-US', { month: 'long' })}
            </div>
            <div className="tabular" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
              {year}
            </div>
          </div>
          <button type="button" id="next-month" className="btn btn-icon" aria-label="Next month" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>
            <Icon name="chevronRight" size={18} />
          </button>
        </div>

        <div className="cal-grid" role="grid" aria-label={`${currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} calendar`}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
            <div key={`header-${index}`} className="cal-weekday" aria-hidden="true">{day}</div>
          ))}
          {loading ? (
            <div className="skeleton" style={{ gridColumn: '1 / -1', height: 232, borderRadius: 'var(--radius-md)' }} />
          ) : renderCells()}
        </div>

        {/* Legend, since the dots are meaningless without it. */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border-subtle)' }}>
          {Object.entries(PROTEIN_VARS).map(([protein, color]) => (
            <span key={protein} className="icon-text" style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
              {protein}
            </span>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------ Selected day */}
      {selectedDay === null ? (
        <p className="form-hint" style={{ textAlign: 'center', marginBottom: 'var(--space-5)' }}>
          Select a day above to see or add its meals.
        </p>
      ) : (
        <section className="card" style={{ marginBottom: 'var(--space-5)' }}>
          <div className="row-between" style={{ marginBottom: 'var(--space-4)' }}>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: 'var(--text-md)', fontWeight: 'var(--weight-semibold)' }}>
              {new Date(year, month, selectedDay).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })}
            </h2>
            <button type="button" id="btn-log-meal" className="btn btn-secondary btn--sm" onClick={openLogForm}>
              <Icon name="plus" size={15} />
              Log a meal
            </button>
          </div>

          {selectedDayHistory.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
              Nothing recorded. If you cooked something the app didn&rsquo;t suggest, log it here.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 'var(--space-2)' }}>
              {selectedDayHistory.map((entry) => {
                const dish = dishMap.get(entry.dishId);
                return (
                  <li
                    key={entry.id}
                    className="row-between"
                    style={{
                      padding: 'var(--space-3)',
                      background: 'var(--fill-subtle)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0 }}>
                      <span
                        aria-hidden="true"
                        style={{
                          width: 4, height: 28, borderRadius: 'var(--radius-full)',
                          background: PROTEIN_VARS[dish?.proteinType] || 'var(--text-muted)',
                        }}
                      />
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 'var(--text-base)', fontWeight: 'var(--weight-medium)' }}>
                          {dish?.nameEn || 'Unknown dish'}
                        </span>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                          {entry.mealType}{dish?.proteinType ? ` · ${dish.proteinType}` : ''}
                        </span>
                      </span>
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      aria-label={`Remove ${dish?.nameEn || 'this meal'} from ${entry.mealType}`}
                      onClick={() => db.cookingHistory.delete(entry.id)}
                      style={{ color: 'var(--danger)', minWidth: 40, minHeight: 40, padding: 0 }}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* -------------------------------------------------------- Month stats */}
      <section className="card">
        <h3 style={{ margin: '0 0 var(--space-4)', fontFamily: 'var(--font-heading)', fontSize: 'var(--text-md)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-secondary)' }}>
          This month
        </h3>

        {monthStats.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            No meals recorded yet this month.
          </p>
        ) : (
          <>
            <p className="form-hint" style={{ marginTop: 0, marginBottom: 'var(--space-4)' }}>
              <span className="tabular" style={{ color: 'var(--accent)', fontWeight: 'var(--weight-semibold)' }}>{totalMeals}</span> meals across {monthStats.length} proteins
            </p>
            <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
              {monthStats.map(([protein, count]) => (
                <div key={protein}>
                  <div className="row-between" style={{ marginBottom: 'var(--space-1)' }}>
                    <span style={{ fontSize: 'var(--text-sm)', textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{protein}</span>
                    <span className="tabular" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{count}</span>
                  </div>
                  <div className="stat-bar">
                    <div
                      className="stat-bar__fill"
                      style={{
                        width: `${(count / maxStat) * 100}%`,
                        background: PROTEIN_VARS[protein] || 'var(--gradient-primary)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* ------------------------------------------------------- Log a meal */}
      {isLogOpen && (
        <Modal
          title="Log a meal"
          titleId="log-meal-title"
          onClose={() => setIsLogOpen(false)}
          footer={(
            <>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsLogOpen(false)}>
                Cancel
              </button>
              <button type="submit" form="log-meal-form" id="btn-save-logged-meal" className="btn btn-primary" style={{ flex: 1 }}>
                Save meal
              </button>
            </>
          )}
        >
          <form id="log-meal-form" onSubmit={handleLogMeal} style={{ display: 'grid', gap: 'var(--space-5)' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="log-dish">What did you cook?</label>
              <select
                id="log-dish"
                className="select"
                value={logDishId}
                onChange={(event) => setLogDishId(event.target.value)}
              >
                {(dishes || []).map((dish) => (
                  <option key={dish.id} value={String(dish.id)}>{dish.nameEn}</option>
                ))}
              </select>
            </div>

            <Segmented
              name="log-meal-type"
              legend="Which meal?"
              value={logMealType}
              options={MEAL_OPTIONS}
              onChange={setLogMealType}
            />

            <p className="form-hint" style={{ margin: 0 }}>
              Logging a meal resets the cooldowns for that dish, so it won&rsquo;t be suggested again soon.
            </p>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default CalendarPage;
