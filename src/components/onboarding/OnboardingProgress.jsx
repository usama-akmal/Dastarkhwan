import React from 'react';
import { Icon } from '../ui/Icon';

/**
 * Progress indicator for the setup wizard.
 *
 * Promoted to a real `progressbar` so assistive tech announces "step 2 of 4"
 * instead of reading a row of empty boxes. The dots are decorative and hidden.
 */
const OnboardingProgress = ({ currentStep, totalSteps, labels }) => (
  <div style={{ marginBottom: 'var(--space-6)' }}>
    <div className="row-between" style={{ marginBottom: 'var(--space-2)' }}>
      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--accent)' }}>
        Step {currentStep + 1} of {totalSteps}
      </span>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
        {labels?.[currentStep]}
      </span>
    </div>

    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-valuenow={currentStep + 1}
      aria-label="Setup progress"
      style={{
        display: 'flex', gap: 4, height: 6,
      }}
    >
      {Array.from({ length: totalSteps }).map((_, index) => (
        <span
          key={index}
          style={{
            flex: 1,
            borderRadius: 'var(--radius-full)',
            background: index <= currentStep ? 'var(--gradient-primary)' : 'var(--fill-medium)',
            transition: 'background var(--duration-base) var(--ease-out)',
          }}
        />
      ))}
    </div>
  </div>
);

export const WizardStep = ({ title, description, children, actions }) => (
  <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
    <header style={{ marginBottom: 'var(--space-6)' }}>
      <h2 style={{
        margin: '0 0 var(--space-2)',
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-2xl)',
        fontWeight: 'var(--weight-bold)',
        letterSpacing: '-0.02em',
      }}>
        {title}
      </h2>
      {description && (
        <p style={{ margin: 0, fontSize: 'var(--text-base)', color: 'var(--text-secondary)' }}>
          {description}
        </p>
      )}
    </header>

    <div style={{ flex: 1 }}>{children}</div>
    {actions && <div style={{ marginTop: 'var(--space-8)' }}>{actions}</div>}
  </div>
);

export const Callout = ({ icon = 'info', tone = 'info', children }) => {
  const tones = {
    info: { bg: 'var(--accent-soft)', border: 'var(--accent-border)', fg: 'var(--accent)' },
    warning: { bg: 'var(--warning-soft)', border: 'var(--accent-border)', fg: 'var(--warning)' },
    success: { bg: 'var(--success-soft)', border: 'var(--success-border)', fg: 'var(--success)' },
  };
  const t = tones[tone] || tones.info;

  return (
    <div style={{
      display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start',
      padding: 'var(--space-3) var(--space-4)',
      borderRadius: 'var(--radius-md)',
      background: t.bg, border: `1px solid ${t.border}`, color: t.fg,
      fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-snug)',
    }}>
      <Icon name={icon} size={16} style={{ marginTop: 2, flexShrink: 0 }} />
      <span>{children}</span>
    </div>
  );
};

export default OnboardingProgress;
