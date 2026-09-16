import React, { useState, useMemo } from 'react';
import { useCookingHistory, useDishes } from '../hooks/useDatabase';

const proteinColors = {
  chicken: 'var(--color-chicken)',
  beef: 'var(--color-beef)',
  mutton: 'var(--color-mutton)',
  fish: 'var(--color-fish)',
  eggs: 'var(--color-eggs)',
  lentils: 'var(--color-lentils)',
  vegetables: 'var(--color-vegetables)',
};

export const CalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
  
  const { history, loading } = useCookingHistory(startDate, endDate);
  const { dishes } = useDishes();

  // Build dish lookup map
  const dishMap = useMemo(() => {
    const map = {};
    if (dishes) dishes.forEach(d => { map[d.id] = d; });
    return map;
  }, [dishes]);

  // Group history by date
  const historyByDate = useMemo(() => {
    const grouped = {};
    if (history) {
      history.forEach(h => {
        if (!grouped[h.date]) grouped[h.date] = [];
        grouped[h.date].push(h);
      });
    }
    return grouped;
  }, [history]);

  // Calculate monthly stats
  const monthStats = useMemo(() => {
    const counts = {};
    if (history) {
      history.forEach(h => {
        const dish = dishMap[h.dishId];
        const protein = dish?.proteinType || 'unknown';
        counts[protein] = (counts[protein] || 0) + 1;
      });
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [history, dishMap]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const today = new Date();
  const isCurrentMonth = month === today.getMonth() && year === today.getFullYear();

  const renderCells = () => {
    const cells = [];
    // Adjust for Monday start (0=Mon, 6=Sun)
    const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    
    for (let i = 0; i < offset; i++) {
      cells.push(<div key={`empty-${i}`} style={styles.cell}></div>);
    }
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayHistory = historyByDate[dateStr] || [];
      const isToday = isCurrentMonth && d === today.getDate();
      const isSelected = selectedDay === d;
      
      cells.push(
        <div 
          key={`day-${d}`} 
          onClick={() => setSelectedDay(selectedDay === d ? null : d)}
          style={{ 
            ...styles.cell, 
            ...(isToday ? styles.todayCell : {}),
            ...(isSelected ? styles.selectedCell : {}),
            cursor: 'pointer'
          }}
        >
          <span style={{ 
            fontSize: '0.8rem', 
            fontWeight: isToday ? '700' : '400', 
            color: isToday ? 'var(--color-primary)' : 'var(--color-text-primary)' 
          }}>
            {d}
          </span>
          <div style={styles.dotContainer}>
            {dayHistory.map((h, idx) => {
              const dish = dishMap[h.dishId];
              const color = proteinColors[dish?.proteinType] || 'var(--color-text-muted)';
              return <div key={idx} style={{ ...styles.dot, backgroundColor: color }} />;
            })}
          </div>
        </div>
      );
    }
    return cells;
  };

  // Render selected day detail
  const renderDayDetail = () => {
    if (selectedDay === null) return null;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    const dayHistory = historyByDate[dateStr] || [];
    
    if (dayHistory.length === 0) {
      return (
        <div className="card animate-fade-in" style={{ marginBottom: '16px', textAlign: 'center', padding: '1.5rem' }}>
          <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>No meals recorded for this day</p>
        </div>
      );
    }
    
    return (
      <div className="card animate-fade-in-up" style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
          {new Date(year, month, selectedDay).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </h3>
        {dayHistory.map((h, idx) => {
          const dish = dishMap[h.dishId];
          return (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: idx < dayHistory.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div>
                <span style={{ color: 'var(--color-text-primary)', fontSize: '0.9rem' }}>{dish?.nameEn || 'Unknown'}</span>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginLeft: '8px' }}>{h.mealType}</span>
              </div>
              <span className={`tag-pill tag-pill--${(dish?.proteinType || '').toLowerCase()}`} style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                {dish?.proteinType}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ padding: '8px 0' }} className="animate-fade-in">
      <h1 className="section-title" style={{ marginBottom: '20px', fontSize: '1.5rem' }}>Calendar 📅</h1>

      <div className="card-elevated" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <button id="prev-month" className="btn-icon" onClick={prevMonth} style={{ fontSize: '1.2rem' }}>◀</button>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontFamily: 'var(--font-heading)' }}>
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <button id="next-month" className="btn-icon" onClick={nextMonth} style={{ fontSize: '1.2rem' }}>▶</button>
        </div>

        <div style={styles.grid}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
            <div key={`header-${i}`} style={styles.dayHeader}>{day}</div>
          ))}
          {loading ? (
            <div className="skeleton" style={{ gridColumn: '1 / -1', height: '200px', borderRadius: '8px' }} />
          ) : renderCells()}
        </div>
      </div>

      {renderDayDetail()}

      {/* Monthly Stats */}
      <div className="card animate-fade-in-up">
        <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1rem', fontFamily: 'var(--font-heading)', color: 'var(--color-text-secondary)' }}>
          📊 This Month's Stats
        </h3>
        {monthStats.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>No cooking history yet this month</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {monthStats.map(([protein, count]) => {
              const maxCount = monthStats[0]?.[1] || 1;
              return (
                <div key={protein}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.85rem', textTransform: 'capitalize', color: 'var(--color-text-primary)' }}>{protein}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{count}x</span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <div style={{ 
                      height: '100%', 
                      width: `${(count / maxCount) * 100}%`, 
                      backgroundColor: proteinColors[protein] || 'var(--color-primary)',
                      borderRadius: '3px',
                      transition: 'width 0.6s ease'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '3px',
  },
  dayHeader: {
    textAlign: 'center',
    fontSize: '0.7rem',
    color: 'var(--color-text-muted)',
    paddingBottom: '8px',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cell: {
    aspectRatio: '1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    transition: 'background-color 0.2s ease',
  },
  todayCell: {
    border: '1.5px solid var(--color-primary)',
    backgroundColor: 'rgba(244, 162, 97, 0.08)',
  },
  selectedCell: {
    backgroundColor: 'rgba(244, 162, 97, 0.15)',
  },
  dotContainer: {
    display: 'flex',
    gap: '2px',
    marginTop: '2px',
  },
  dot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
  }
};
