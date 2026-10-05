import React, { useState } from 'react';
import { useSuggestion } from '../hooks/useSuggestion';
import { useSettings } from '../hooks/useDatabase';
import { Icon } from '../components/ui/Icon';
import { Modal } from '../components/ui/Modal';

/** Small labelled chip used for dishType / cuisine / dietary tags. */
const Chip = ({ children, variant }) => (
  <span className={variant ? `tag-pill tag-pill--${variant}` : 'tag-pill'}>{children}</span>
);

const SuggestionCard = ({ mealType, suggestionData, heading, mealIcon }) => {
  const {
    suggestion, alternatives, exclusions, isAlreadySelected, loading,
    refresh, acceptSuggestion, rejectSuggestion, cancelPlannedMeal,
  } = suggestionData || {};
  const [accepted, setAccepted] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  if (loading) {
    return (
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <div className="skeleton" style={{ height: 188, borderRadius: 'var(--radius-xl)' }} />
      </div>
    );
  }

  const isLocked = isAlreadySelected || accepted;

  /* ------------------------------------------------------- Empty pool state */
  if (!suggestion) {
    return (
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="empty-state" style={{ paddingBottom: exclusions?.length ? 'var(--space-4)' : undefined }}>
          <span style={{
            display: 'grid', placeItems: 'center', width: 56, height: 56,
            borderRadius: 'var(--radius-full)', background: 'var(--fill-soft)', color: 'var(--text-muted)',
          }}>
            <Icon name="pot" size={26} />
          </span>
          <p style={{ margin: 0, fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)' }}>
            Nothing matches your rules today
          </p>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
            The engine excluded every dish. Here is why:
          </p>
        </div>

        {exclusions?.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 var(--space-4)', display: 'grid', gap: 'var(--space-2)' }}>
            {exclusions.map((entry) => (
              <li
                key={entry.reason}
                className="row-between"
                style={{
                  padding: 'var(--space-3)',
                  background: 'var(--fill-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>{entry.detail}</span>
                <span className="badge badge--neutral tabular">{entry.count}</span>
              </li>
            ))}
          </ul>
        )}

        <p className="form-hint" style={{ textAlign: 'center' }}>
          Loosen a cooldown or a dietary rule in Settings to see more options.
        </p>
      </div>
    );
  }

  /* --------------------------------------------------------- Suggestion card */
  return (
    <>
      <section
        className={isLocked ? 'card-hero' : 'card-hero animate-fade-in-up'}
        aria-label={heading}
        style={{ marginBottom: 'var(--space-6)' }}
      >
        {isLocked && (
          <div className="row-between" style={{ marginBottom: 'var(--space-4)' }}>
            <span className="badge badge--success">
              <Icon name="check" size={13} strokeWidth={3} />
              Planned for today
            </span>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setConfirmRemove(true)}
            >
              <Icon name="trash" size={15} />
              Remove
            </button>
          </div>
        )}

        <div className="row-between" style={{ alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
          <div style={{ minWidth: 0 }}>
            <div className="icon-text" style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 'var(--space-2)' }}>
              <Icon name={mealIcon} size={14} />
              {heading}
            </div>
            <h2 style={{
              margin: '0 0 var(--space-1)',
              fontFamily: 'var(--font-heading)',
              fontSize: 'var(--text-2xl)',
              fontWeight: 'var(--weight-bold)',
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
            }}>
              {suggestion.nameEn}
            </h2>
            {suggestion.nameUr && (
              <p lang="ur" dir="rtl" style={{
                margin: 0,
                fontFamily: 'var(--font-urdu)',
                fontSize: 'var(--text-lg)',
                color: 'var(--accent)',
                lineHeight: 2.1,
              }}>
                {suggestion.nameUr}
              </p>
            )}
          </div>

          <Chip variant={(suggestion.proteinType || '').toLowerCase()}>{suggestion.proteinType}</Chip>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-5)' }}>
          <Chip>{suggestion.dishType}</Chip>
          {suggestion.dietaryTags?.map((tag) => <Chip key={tag}>{tag}</Chip>)}
          {suggestion.cuisineType && <Chip>{suggestion.cuisineType}</Chip>}
        </div>

        {!isLocked && (
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <button
              type="button"
              id={`accept-${mealType}`}
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={async () => { await acceptSuggestion(suggestion.id); setAccepted(true); }}
            >
              <Icon name="check" size={18} strokeWidth={2.6} />
              Cook this
            </button>
            <button
              type="button"
              id={`reject-${mealType}`}
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={() => (rejectSuggestion ? rejectSuggestion() : refresh?.())}
            >
              <Icon name="refresh" size={17} />
              Something else
            </button>
          </div>
        )}
      </section>

      {/* -------------------------------------------------------- Alternatives */}
      {!isLocked && alternatives?.length > 0 && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <p style={{
            margin: '0 0 var(--space-3)',
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--weight-semibold)',
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}>
            Or pick one of these
          </p>
          <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
            {alternatives.slice(0, 3).map((alt) => (
              <button
                type="button"
                key={alt.id}
                id={`alternative-${mealType}-${alt.id}`}
                className="card card--interactive"
                onClick={async () => { await acceptSuggestion(alt.id); setAccepted(true); }}
                style={{ padding: 'var(--space-3) var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}
              >
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', minWidth: 0 }}>
                  <span style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--weight-medium)', color: 'var(--text-primary)' }}>
                    {alt.nameEn}
                  </span>
                  {alt.nameUr && (
                    <span lang="ur" dir="rtl" style={{ fontSize: 'var(--text-sm)', color: 'var(--accent)', fontFamily: 'var(--font-urdu)', lineHeight: 1 }}>
                      {alt.nameUr}
                    </span>
                  )}
                </span>
                <Chip variant={(alt.proteinType || '').toLowerCase()}>{alt.proteinType}</Chip>
              </button>
            ))}
          </div>
        </div>
      )}

      {confirmRemove && (
        <Modal
          title="Remove this planned meal?"
          titleId={`remove-${mealType}-title`}
          onClose={() => setConfirmRemove(false)}
          footer={(
            <>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmRemove(false)}>
                Keep it
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ flex: 1 }}
                onClick={async () => { await cancelPlannedMeal(); setAccepted(false); setConfirmRemove(false); }}
              >
                Remove
              </button>
            </>
          )}
        >
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            This clears <strong>{suggestion.nameEn}</strong> from today&rsquo;s plan and its
            cooking history, so it can be suggested again sooner.
          </p>
        </Modal>
      )}
    </>
  );
};

const SectionHeading = ({ icon, children }) => (
  <h2 style={{
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    margin: '0 0 var(--space-4)',
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-md)',
    fontWeight: 'var(--weight-semibold)',
    color: 'var(--text-secondary)',
  }}>
    <Icon name={icon} size={17} />
    {children}
  </h2>
);

export const HomePage = () => {
  const { settings, loading: settingsLoading } = useSettings();
  const lunchSuggestion = useSuggestion('lunch');
  const dinnerSuggestion = useSuggestion('dinner');

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const greetingIcon = hour < 12 ? 'sun' : hour < 18 ? 'sparkle' : 'moon';
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  if (settingsLoading) {
    return (
      <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
        <div className="skeleton" style={{ height: 64, borderRadius: 'var(--radius-lg)' }} />
        <div className="skeleton" style={{ height: 260, borderRadius: 'var(--radius-xl)' }} />
      </div>
    );
  }

  const mealsPerDay = settings?.mealsPerDay || 2;

  return (
    <div>
      <header style={{ marginBottom: 'var(--space-6)' }}>
        <div className="icon-text" style={{ color: 'var(--accent)', marginBottom: 'var(--space-1)' }}>
          <Icon name={greetingIcon} size={16} />
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
            {dateStr}
          </span>
        </div>
        <h1 style={{
          margin: 0,
          fontFamily: 'var(--font-heading)',
          fontSize: 'var(--text-3xl)',
          fontWeight: 'var(--weight-bold)',
          letterSpacing: '-0.025em',
          lineHeight: 1.1,
        }}>
          {greeting}
        </h1>
      </header>

      {mealsPerDay === 1 ? (
        // One meal a day is configured. The section is titled with the same wording
        // the Settings toggle uses, so the mode is visible on the screen it affects —
        // previously this heading existed only as an aria-label and was invisible.
        // ("Tonight's meal" was dropped: it was wrong for a dinner logged after midnight.)
        <>
          <SectionHeading icon="moon">Lunch/Dinner</SectionHeading>
          <SuggestionCard mealType="dinner" suggestionData={dinnerSuggestion} heading="Dinner" mealIcon="moon" />
        </>
      ) : (
        <>
          <SectionHeading icon="sun">Lunch/Dinner</SectionHeading>
          <SuggestionCard mealType="lunch" suggestionData={lunchSuggestion} heading="Lunch" mealIcon="sun" />

          <SuggestionCard mealType="dinner" suggestionData={dinnerSuggestion} heading="Dinner" mealIcon="moon" />
        </>
      )}
    </div>
  );
};

export default HomePage;
