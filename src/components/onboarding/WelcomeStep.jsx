import React from 'react';
import { Icon } from '../ui/Icon';

const HIGHLIGHTS = [
  { icon: 'pot', title: 'Never wonder what to cook', body: 'A suggestion for lunch and dinner, based on what you have been cooking lately.' },
  { icon: 'family', title: 'Everyone gets a say', body: 'Mark what each person loves, eats, or will not touch — and the planner respects it.' },
  { icon: 'filter', title: 'Your rules, enforced', body: 'Cap beef per week, keep vegetables in rotation, avoid the same protein twice running.' },
];

const WelcomeStep = ({ onNext }) => (
  <div className="animate-fade-in" style={{
    display: 'flex', flexDirection: 'column', justifyContent: 'center',
    minHeight: '100%', padding: 'var(--space-6) var(--space-2)', textAlign: 'center',
  }}>
    <div style={{ marginBottom: 'var(--space-8)' }}>
      <h1 style={{
        margin: 0,
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--text-4xl)',
        fontWeight: 'var(--weight-bold)',
        letterSpacing: '-0.035em',
        lineHeight: 1,
        background: 'var(--gradient-primary)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>
        Dastarkhwan
      </h1>
      <p lang="ur" dir="rtl" style={{
        margin: 'var(--space-3) 0 0',
        fontFamily: 'var(--font-urdu)',
        fontSize: 'var(--text-2xl)',
        color: 'var(--accent)',
        lineHeight: 1.6,
      }}>
        دسترخوان
      </p>
      <p style={{
        margin: 'var(--space-4) auto 0',
        fontSize: 'var(--text-md)',
        color: 'var(--text-secondary)',
        maxWidth: '32ch',
      }}>
        Meal planning for Pakistani kitchens. Works offline, and your data never leaves your phone.
      </p>
    </div>

    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 var(--space-8)', display: 'grid', gap: 'var(--space-3)', textAlign: 'left' }}>
      {HIGHLIGHTS.map((item, index) => (
        <li
          key={item.title}
          className={`card animate-fade-in-up animate-stagger-${index + 1}`}
          style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start', padding: 'var(--space-4)' }}
        >
          <span style={{
            display: 'grid', placeItems: 'center', flex: '0 0 auto',
            width: 40, height: 40, borderRadius: 'var(--radius-sm)',
            background: 'var(--accent-soft)', color: 'var(--accent)',
          }}>
            <Icon name={item.icon} size={20} />
          </span>
          <span>
            <strong style={{ display: 'block', fontSize: 'var(--text-base)', marginBottom: 2 }}>{item.title}</strong>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 'var(--leading-snug)' }}>
              {item.body}
            </span>
          </span>
        </li>
      ))}
    </ul>

    <button type="button" className="btn btn-primary btn--lg animate-fade-in-up animate-stagger-4" onClick={onNext}>
      Get started
      <Icon name="arrowRight" size={19} />
    </button>

    <p className="form-hint" style={{ marginTop: 'var(--space-4)' }}>
      Takes about two minutes. You can change everything later.
    </p>
  </div>
);

export default WelcomeStep;
