import React from 'react';
import { Icon, HeartIcon } from './Icon';

/**
 * Form control primitives.
 *
 * Every control here wraps a real native input rather than reimplementing one:
 * the `<input>` stays in the DOM (visually hidden via CSS where necessary) so that
 * keyboard interaction, form semantics, autofill and assistive-technology support
 * come from the browser. The visual layer is drawn around it.
 *
 * The alternative — a `<div role="checkbox">` — has to reimplement space/enter,
 * focus, disabled, and label association by hand, and usually gets one of them wrong.
 */

/* ------------------------------------------------------------------ Checkbox */

export const Checkbox = ({ label, checked, onChange, disabled, id, hint, ...rest }) => {
  const inputId = id || `checkbox-${label?.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <label className="checkbox" htmlFor={inputId}>
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked, event)}
        {...rest}
      />
      <span className="checkbox__box" />
      <span className="checkbox__label">
        {label}
        {hint && <span className="form-hint" style={{ display: 'block' }}>{hint}</span>}
      </span>
    </label>
  );
};

/* --------------------------------------------------------------------- Radio */

export const Radio = ({ label, name, value, checked, onChange, disabled, id }) => {
  const inputId = id || `radio-${name}-${String(value).replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <label className="radio" htmlFor={inputId}>
      <input
        id={inputId}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange?.(value, event)}
      />
      <span className="radio__dot" />
      <span className="radio__label">{label}</span>
    </label>
  );
};

export const RadioGroup = ({ label, legend, name, value, options, onChange, disabled }) => (
  <fieldset style={{ border: 'none', padding: 0, margin: 0, marginBottom: 'var(--space-4)' }}>
    {(legend || label) && (
      <legend className="form-label" style={{ marginBottom: 'var(--space-2)', padding: 0 }}>
        {legend || label}
      </legend>
    )}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
      {options.map((option) => (
        <Radio
          key={option.value}
          name={name}
          value={option.value}
          label={option.label}
          checked={value === option.value}
          disabled={disabled || option.disabled}
          onChange={onChange}
        />
      ))}
    </div>
  </fieldset>
);

/* ---------------------------------------------------------------- Segmented
   For two or three mutually exclusive options, where radios would waste vertical
   space. Implemented as toggle buttons in a group, which is what it visually is. */

export const Segmented = ({ name, legend, value, options, onChange, disabled }) => (
  <div>
    {legend && <div className="form-label" style={{ marginBottom: 'var(--space-2)' }}>{legend}</div>}
    <div className="segmented" role="group" aria-label={legend || name}>
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            id={option.id}
            className="segmented__option"
            aria-pressed={isActive}
            disabled={disabled || option.disabled}
            onClick={() => onChange?.(option.value)}
          >
            {option.icon && <Icon name={option.icon} size={16} />}
            {option.label}
          </button>
        );
      })}
    </div>
  </div>
);

/* -------------------------------------------------------------------- Switch */

export const Switch = ({ label, checked, onChange, disabled, id, describedBy }) => {
  const inputId = id || `switch-${label?.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <label className="switch" htmlFor={inputId}>
      <input
        id={inputId}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        aria-describedby={describedBy}
        onChange={(event) => onChange?.(event.target.checked, event)}
      />
      <span className="switch__track" />
      {label && <span className="switch__label">{label}</span>}
    </label>
  );
};

/* -------------------------------------------------------------------- Range */

export const Range = ({ id, label, value, min = 1, max = 7, step = 1, onChange, formatValue, disabled, hint }) => {
  const inputId = id || `range-${label?.replace(/\s+/g, '-').toLowerCase()}`;
  // Percentage drives the filled portion of the track.
  const percent = max === min ? 0 : ((value - min) / (max - min)) * 100;

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 'var(--space-1)' }}>
        {label && <label className="form-label" htmlFor={inputId}>{label}</label>}
        <span
          className="tabular"
          style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--accent)' }}
          aria-hidden="true"
        >
          {formatValue ? formatValue(value) : value}
        </span>
      </div>
      {hint && <div className="form-hint" style={{ marginBottom: 'var(--space-2)' }}>{hint}</div>}
      <input
        id={inputId}
        className="range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        // The visual value is duplicated above; expose the real one to AT only.
        aria-valuetext={formatValue ? formatValue(value) : String(value)}
        onChange={(event) => onChange?.(Number(event.target.value), event)}
        style={{
          background: `linear-gradient(90deg, var(--accent) 0%, var(--accent) ${percent}%, transparent ${percent}%)`,
          backgroundSize: '100% 8px',
          backgroundPosition: '0 center',
          backgroundRepeat: 'no-repeat',
          borderRadius: 'var(--radius-full)',
        }}
      />
    </div>
  );
};

/* ------------------------------------------------------------------ Stepper
   Replaces `<input type="number">`, whose native spinners are ~10px tall, cannot
   be styled, and are unusable on touch. */

export const Stepper = ({ id, label, value, min = 0, max = 99, step = 1, onChange, unit, disabled, hint }) => {
  const clamp = (next) => Math.min(max, Math.max(min, next));

  return (
    <div>
      {label && (
        <div className="row-between" style={{ marginBottom: 'var(--space-2)' }}>
          <span className="form-label" id={`${id}-label`}>{label}</span>
          <div className="stepper">
            <button
              type="button"
              className="stepper__btn"
              aria-label={`Decrease ${label}`}
              disabled={disabled || value <= min}
              onClick={() => onChange?.(clamp(value - step))}
            >
              <Icon name="minus" size={16} />
            </button>
            <span
              id={id}
              className="stepper__value"
              role="spinbutton"
              aria-valuenow={value}
              aria-valuemin={min}
              aria-valuemax={max}
              aria-labelledby={label ? `${id}-label` : undefined}
              aria-valuetext={unit ? `${value} ${unit}` : String(value)}
            >
              {value}
            </span>
            <button
              type="button"
              className="stepper__btn"
              aria-label={`Increase ${label}`}
              disabled={disabled || value >= max}
              onClick={() => onChange?.(clamp(value + step))}
            >
              <Icon name="plus" size={16} />
            </button>
          </div>
        </div>
      )}
      {hint && <div className="form-hint">{hint}</div>}
    </div>
  );
};

/* --------------------------------------------------------- Preference control
   The tri-state ❤️ / 👍 / 🚫. Previously three emoji buttons whose only state
   signal was a background colour; now real icons with `aria-pressed` and a filled
   glyph for the active state, so state is not carried by colour alone. */

const PREF_STATES = [
  { value: 'loves', icon: 'heart', label: 'Loves', className: 'pref__btn--love' },
  { value: 'eats', icon: 'thumbUp', label: 'Eats', className: 'pref__btn--eat' },
  { value: 'wont_touch', icon: 'ban', label: 'Won’t touch', className: 'pref__btn--wont' },
];

export const PreferenceControl = ({ dishName, value, onChange, disabled, size = 18 }) => (
  <div className="pref" role="group" aria-label={`Preference for ${dishName}`}>
    {PREF_STATES.map((state) => {
      const isActive = value === state.value;
      return (
        <button
          key={state.value}
          type="button"
          id={`pref-${state.value}-${dishName?.replace(/\s+/g, '-').toLowerCase()}`}
          className={`pref__btn ${state.className}`}
          aria-pressed={isActive}
          aria-label={`${state.label} ${dishName}`}
          disabled={disabled}
          onClick={() => onChange?.(isActive ? null : state.value)}
        >
          {state.icon === 'heart'
            ? <HeartIcon size={size} filled={isActive} />
            : <Icon name={state.icon} size={size} strokeWidth={isActive ? 2.4 : 1.8} />}
        </button>
      );
    })}
  </div>
);

