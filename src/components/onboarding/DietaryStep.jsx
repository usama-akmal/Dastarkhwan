import React, { useState } from 'react';
import { addDietaryRule } from '../../data/db';
import { DIETARY_RULE_TYPES, RULE_CATEGORIES } from '../../utils/preferences';
import { Icon } from '../ui/Icon';
import { Switch, Stepper } from '../ui/Controls';
import { WizardStep, Callout } from './OnboardingProgress';

/**
 * Optional dietary constraints.
 *
 * Each rule is a switch plus a stepper, rather than a checkbox with a bare range
 * input: the previous range had no visible value, no tick marks, and a hit area
 * about 2px tall on some Android builds.
 */
const RULE_PRESETS = [
  {
    key: 'beef',
    title: 'Limit red meat',
    description: 'Cap how often beef or mutton is suggested in a week',
    category: RULE_CATEGORIES.PROTEIN_TYPE,
    value: 'beef',
    ruleType: DIETARY_RULE_TYPES.MAX_PER_WEEK,
    defaultLimit: 2,
    min: 1,
    max: 7,
    unit: 'times a week',
  },
  {
    key: 'fried',
    title: 'Limit fried food',
    description: 'Keep deep-fried dishes to a set number per week',
    category: RULE_CATEGORIES.DISH_TYPE,
    value: 'fried',
    ruleType: DIETARY_RULE_TYPES.MAX_PER_WEEK,
    defaultLimit: 2,
    min: 1,
    max: 7,
    unit: 'times a week',
  },
  {
    key: 'veg',
    title: 'Guarantee vegetables',
    description: 'Make sure vegetable or lentil dishes appear each week',
    category: RULE_CATEGORIES.PROTEIN_TYPE,
    value: 'vegetables',
    ruleType: DIETARY_RULE_TYPES.MIN_PER_WEEK,
    defaultLimit: 2,
    min: 1,
    max: 7,
    unit: 'times a week',
  },
  {
    key: 'fat',
    title: 'No heavy days in a row',
    description: 'Never suggest a high-fat dish two days running',
    category: RULE_CATEGORIES.DIETARY_TAGS,
    value: 'high-fat',
    ruleType: DIETARY_RULE_TYPES.NO_CONSECUTIVE,
    defaultLimit: 1,
    min: 1,
    max: 1,
    unit: '',
  },
];

const DietaryStep = ({ onComplete }) => {
  const [state, setState] = useState(() => RULE_PRESETS.reduce((acc, preset) => {
    acc[preset.key] = { active: false, limit: preset.defaultLimit };
    return acc;
  }, {}));

  const toggle = (key, active) => setState((prev) => ({ ...prev, [key]: { ...prev[key], active } }));
  const setLimit = (key, limit) => setState((prev) => ({ ...prev, [key]: { ...prev[key], limit } }));

  const handleComplete = async () => {
    const rules = RULE_PRESETS
      .filter((preset) => state[preset.key].active)
      .map((preset) => ({
        ruleType: preset.ruleType,
        category: preset.category,
        value: preset.value,
        limit: preset.ruleType === DIETARY_RULE_TYPES.NO_CONSECUTIVE ? 1 : state[preset.key].limit,
        isActive: true,
      }));

    for (const rule of rules) {
      await addDietaryRule(rule);
    }
    onComplete();
  };

  const activeCount = RULE_PRESETS.filter((preset) => state[preset.key].active).length;

  return (
    <WizardStep
      title="Any dietary rules?"
      description="Optional. These are hard limits the planner will always respect."
      actions={(
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          <button type="button" className="btn btn-primary btn--lg btn--block" onClick={handleComplete}>
            {activeCount > 0 ? `Finish with ${activeCount} rule${activeCount > 1 ? 's' : ''}` : 'Finish setup'}
            <Icon name="check" size={18} />
          </button>
          <button type="button" className="btn btn-ghost btn--block" onClick={onComplete}>
            Skip this step
          </button>
        </div>
      )}
    >
      <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
        {RULE_PRESETS.map((preset) => {
          const isOn = state[preset.key].active;
          return (
            <div
              key={preset.key}
              className="card"
              style={{
                padding: 'var(--space-4)',
                borderColor: isOn ? 'var(--accent-border)' : undefined,
                background: isOn ? 'var(--accent-softer)' : undefined,
              }}
            >
              <Switch
                id={`rule-${preset.key}`}
                checked={isOn}
                onChange={(checked) => toggle(preset.key, checked)}
                label={preset.title}
              />
              <p style={{
                margin: 'var(--space-1) 0 0 65px',
                fontSize: 'var(--text-xs)',
                color: 'var(--text-muted)',
                lineHeight: 'var(--leading-snug)',
              }}>
                {preset.description}
              </p>

              {/* The stepper only appears once the rule is enabled, so the step does
                  not present nine controls at once. */}
              {isOn && preset.ruleType !== DIETARY_RULE_TYPES.NO_CONSECUTIVE && (
                <div style={{ marginTop: 'var(--space-4)' }}>
                  <Stepper
                    id={`rule-${preset.key}-limit`}
                    label="How often"
                    unit={preset.unit}
                    value={state[preset.key].limit}
                    min={preset.min}
                    max={preset.max}
                    onChange={(limit) => setLimit(preset.key, limit)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 'var(--space-5)' }}>
        <Callout icon="info">
          You can add, remove or change any of these later in Settings.
        </Callout>
      </div>
    </WizardStep>
  );
};

export default DietaryStep;
