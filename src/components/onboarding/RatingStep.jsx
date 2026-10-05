import React, { useState } from 'react';
import { useDishes, useFamilyMembers } from '../../hooks/useDatabase';
import { setMemberPreference } from '../../data/db';
import { PREF } from '../../utils/preferences';
import { Icon, HeartIcon } from '../ui/Icon';
import { WizardStep, Callout } from './OnboardingProgress';

/**
 * Rate the first dishes, for everyone at once.
 *
 * The escape hatches are given real prominence here: 30 consecutive cards is the
 * single biggest drop-off risk in onboarding, so "skip" is a first-class action
 * rather than a low-contrast link below the fold.
 */
const RatingStep = ({ onComplete }) => {
  const { dishes = [], loading: dishesLoading } = useDishes();
  const { members: familyMembers = [], loading: familyLoading } = useFamilyMembers();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastChoice, setLastChoice] = useState(null);

  const displayDishes = dishes.slice(0, 30);
  const total = displayDishes.length;

  const advance = () => {
    if (currentIndex < total - 1) {
      setCurrentIndex((prev) => prev + 1);
      setLastChoice(null);
    } else {
      onComplete();
    }
  };

  const handleRate = async (preference) => {
    if (total === 0) return;
    const dish = displayDishes[currentIndex];

    // Read-modify-write per member from the database rather than from the rendered
    // snapshot, so rapid taps cannot clobber each other's preference maps.
    for (const member of familyMembers) {
      await setMemberPreference(member.id, dish.id, preference);
    }

    setLastChoice(preference);
    advance();
  };

  if (dishesLoading || familyLoading) {
    return (
      <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
        <div className="skeleton" style={{ height: 180, borderRadius: 'var(--radius-xl)' }} />
        <div className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  if (total === 0) {
    return (
      <WizardStep
        title="No dishes found"
        description="The recipe library appears to be empty."
        actions={<button type="button" className="btn btn-primary btn--lg btn--block" onClick={onComplete}>Continue</button>}
      >
        <Callout icon="warning" tone="warning">
          Try refreshing the built-in recipes from Settings after setup.
        </Callout>
      </WizardStep>
    );
  }

  const currentDish = displayDishes[currentIndex];
  const progress = ((currentIndex + 1) / total) * 100;

  const CHOICES = [
    { value: PREF.LOVES, label: 'Loves it', hint: 'Suggest often', icon: 'heart', tone: 'var(--danger)' },
    { value: PREF.EATS, label: 'Eats it', hint: 'Fine with it', icon: 'thumbUp', tone: 'var(--success)' },
    { value: PREF.WONT_TOUCH, label: 'Won’t eat', hint: 'Never suggest', icon: 'ban', tone: 'var(--text-secondary)' },
  ];

  return (
    <WizardStep
      title="Their tastes"
      description={`${total} quick taps. Rate what you know — unsure dishes can be skipped.`}
    >
      {/* Card position indicator */}
      <div className="row-between" style={{ marginBottom: 'var(--space-3)' }}>
        <span className="tabular" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          {currentIndex + 1} of {total}
        </span>
        <button
          type="button"
          className="btn btn-ghost btn--sm"
          onClick={onComplete}
        >
          Skip the rest
        </button>
      </div>

      <div className="stat-bar" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="stat-bar__fill" style={{ width: `${progress}%` }} />
      </div>

      {/* The dish under consideration */}
      <div
        key={currentDish.id}
        className="card-elevated animate-fade-in-up"
        style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-5)', marginBottom: 'var(--space-5)' }}
      >
        <h3 style={{
          margin: 0,
          fontFamily: 'var(--font-heading)',
          fontSize: 'var(--text-2xl)',
          fontWeight: 'var(--weight-bold)',
          letterSpacing: '-0.02em',
        }}>
          {currentDish.nameEn}
        </h3>
        {currentDish.nameUr && (
          <p lang="ur" dir="rtl" style={{
            margin: 'var(--space-2) 0 0',
            fontFamily: 'var(--font-urdu)',
            fontSize: 'var(--text-xl)',
            color: 'var(--accent)',
            lineHeight: 2,
          }}>
            {currentDish.nameUr}
          </p>
        )}
        {currentDish.proteinType && (
          <span className={`tag-pill tag-pill--${currentDish.proteinType}`} style={{ marginTop: 'var(--space-4)' }}>
            {currentDish.proteinType}
          </span>
        )}
      </div>

      {/* The three choices */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
        {CHOICES.map((choice) => {
          const isActive = lastChoice === choice.value;
          return (
            <button
              key={choice.value}
              type="button"
              className="card card--interactive"
              onClick={() => handleRate(choice.value)}
              aria-label={`${choice.label} — for everyone`}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 'var(--space-2)', padding: 'var(--space-4) var(--space-2)',
                borderColor: isActive ? 'var(--accent)' : undefined,
              }}
            >
              <span style={{
                display: 'grid', placeItems: 'center', width: 44, height: 44,
                borderRadius: 'var(--radius-full)', background: 'var(--fill-soft)', color: choice.tone,
              }}>
                {choice.icon === 'heart'
                  ? <HeartIcon size={22} filled={isActive} />
                  : <Icon name={choice.icon} size={22} />}
              </span>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)' }}>
                {choice.label}
              </span>
              <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>{choice.hint}</span>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 'var(--space-4)' }}>
        <Callout icon="info">
          Applies to everyone for now. Set individual preferences per person later under Family.
        </Callout>
      </div>
    </WizardStep>
  );
};

export default RatingStep;
