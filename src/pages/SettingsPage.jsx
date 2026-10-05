import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSettings, useDietaryRules, useCookingHistory, useDishes, useFamilyMembers, useUsageEvents } from '../hooks/useDatabase';
import {
  db,
  restoreDefaultDishes,
  exportAllData,
  importAllData,
  requestPersistentStorage,
} from '../data/db';
import {
  DIETARY_RULE_TYPES,
  RULE_CATEGORIES,
  RULE_CATEGORY_VALUES,
  describeRule,
} from '../utils/preferences';
import { useTheme } from '../theme/themeContext';
import { computeInsights, formatInsightsForSharing } from '../utils/insights';
import { Icon } from '../components/ui/Icon';
import { Modal } from '../components/ui/Modal';
import { RadioGroup, Segmented, Stepper } from '../components/ui/Controls';

const RULE_TYPE_OPTIONS = [
  { value: DIETARY_RULE_TYPES.MAX_PER_WEEK, label: 'Max per week' },
  { value: DIETARY_RULE_TYPES.MIN_PER_WEEK, label: 'Min per week' },
  { value: DIETARY_RULE_TYPES.NO_CONSECUTIVE, label: 'No consecutive days' },
];

const CATEGORY_OPTIONS = [
  { value: RULE_CATEGORIES.PROTEIN_TYPE, label: 'Protein type' },
  { value: RULE_CATEGORIES.DISH_TYPE, label: 'Dish type' },
  { value: RULE_CATEGORIES.DIETARY_TAGS, label: 'Dietary tag' },
];

const MEAL_OPTIONS = [
  { value: 2, label: 'Lunch/Dinner' },
  { value: 1, label: 'Dinner only' },
];

const THEME_OPTIONS = [
  { value: 'system', label: 'System', icon: 'monitor' },
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
];

const emptyRule = () => ({
  ruleType: DIETARY_RULE_TYPES.MAX_PER_WEEK,
  category: RULE_CATEGORIES.PROTEIN_TYPE,
  value: RULE_CATEGORY_VALUES[RULE_CATEGORIES.PROTEIN_TYPE][0],
  limit: 2,
});

/** Titled block used for each settings section. */
const Section = ({ icon, title, description, children }) => (
  <section className="card" style={{ marginBottom: 'var(--space-4)' }}>
    <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
      <span style={{
        display: 'grid', placeItems: 'center', flex: '0 0 auto',
        width: 36, height: 36, borderRadius: 'var(--radius-sm)',
        background: 'var(--accent-soft)', color: 'var(--accent)',
      }}>
        <Icon name={icon} size={19} />
      </span>
      <div>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: 'var(--text-md)', fontWeight: 'var(--weight-semibold)' }}>
          {title}
        </h2>
        {description && (
          <p style={{ margin: '2px 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            {description}
          </p>
        )}
      </div>
    </div>
    {children}
  </section>
);

export const SettingsPage = () => {
  const { settings, loading: settingsLoading, updateSettings } = useSettings();
  const { rules, loading: rulesLoading, addRule, deleteRule } = useDietaryRules();
  const { history } = useCookingHistory();
  const { dishes } = useDishes();
  const { members } = useFamilyMembers();
  const { events: usageEvents } = useUsageEvents();
  const { mode, setTheme } = useTheme();

  // Computed on-device from the user's own data. There is no telemetry in this app,
  // so this is the only way either of us can tell whether it is actually being used.
  const insights = useMemo(
    () => computeInsights({ history, dishes, familyMembers: members, settings, usageEvents }),
    [history, dishes, members, settings, usageEvents],
  );

  const [draft, setDraft] = useState({});
  const [isRuleFormOpen, setIsRuleFormOpen] = useState(false);
  const [newRule, setNewRule] = useState(emptyRule);
  const [backupStatus, setBackupStatus] = useState(null);
  const [pendingErase, setPendingErase] = useState(false);
  const [pendingReseed, setPendingReseed] = useState(false);
  const [insightsCopied, setInsightsCopied] = useState(false);
  const fileInputRef = useRef(null);

  // Ask the browser not to evict this origin. There is no server, so eviction is
  // total data loss; this is the only defence the platform offers.
  useEffect(() => { requestPersistentStorage(); }, []);

  // Draft edits layered over live settings. Sync happens during render rather than
  // in an effect, which avoids a second render pass.
  const localSettings = settings
    ? { ...settings, ...draft, cooldowns: { ...settings.cooldowns, ...(draft.cooldowns || {}) } }
    : null;

  if (settingsLoading || rulesLoading || !localSettings) {
    return (
      <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
        <div className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-lg)' }} />
        <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  const commitToDatabase = async (changes, keys) => {
    await updateSettings(changes);
    setDraft((prev) => {
      const next = { ...prev };
      for (const key of keys) delete next[key];
      return next;
    });
  };

  const setCooldown = (key, value) => setDraft((prev) => ({
    ...prev,
    cooldowns: { ...(prev.cooldowns || {}), [key]: value },
  }));

  const saveCooldowns = () => commitToDatabase({ cooldowns: localSettings.cooldowns }, ['cooldowns']);

  const handleAddRule = async (event) => {
    event.preventDefault();
    await addRule(newRule);
    setIsRuleFormOpen(false);
    setNewRule(emptyRule());
  };

  const handleExport = async () => {
    try {
      const payload = await exportAllData();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dastarkhwan-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setBackupStatus({
        kind: 'ok',
        message: `Backup saved — ${payload.counts.dishes} dishes, ${payload.counts.familyMembers} members, ${payload.counts.cookingHistory} meals.`,
      });
    } catch (error) {
      setBackupStatus({ kind: 'error', message: `Could not export: ${error.message}` });
    }
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const counts = await importAllData(JSON.parse(await file.text()));
      setBackupStatus({
        kind: 'ok',
        message: `Restored ${counts.dishes} dishes, ${counts.familyMembers} members and ${counts.cookingHistory} meals.`,
      });
    } catch (error) {
      setBackupStatus({ kind: 'error', message: `Could not restore: ${error.message}` });
    }
  };

  return (
    <div>
      {/* ------------------------------------------------------------ Theme */}
      <Section icon="sparkle" title="Appearance" description="Choose a theme, or follow your device">
        <Segmented name="theme" value={mode} options={THEME_OPTIONS} onChange={setTheme} />
      </Section>

      {/* ------------------------------------------------------- Meal planning */}
      <Section icon="pot" title="Meal planning" description="How many meals to suggest each day">
        <Segmented
          name="mealsPerDay"
          value={localSettings.mealsPerDay}
          options={MEAL_OPTIONS}
          onChange={(value) => commitToDatabase({ mealsPerDay: value }, ['mealsPerDay'])}
        />
      </Section>

      {/* ---------------------------------------------------------- Household */}
      <Section icon="family" title="Household" description="Shown on the home screen">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="setting-family-name">Family name</label>
          <input
            id="setting-family-name"
            type="text"
            className="input"
            placeholder="e.g. Khan family"
            value={localSettings.familyName || ''}
            onChange={(event) => setDraft((prev) => ({ ...prev, familyName: event.target.value }))}
            onBlur={(event) => commitToDatabase({ familyName: event.target.value }, ['familyName'])}
          />
        </div>
      </Section>

      {/* ---------------------------------------------------------- Cooldowns */}
      <Section
        icon="refresh"
        title="Repetition cooldowns"
        description="How long before a dish, protein or dish type can come back"
      >
        <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
          <Stepper
            id="cooldown-same-dish"
            label="Same dish"
            unit="days"
            value={localSettings.cooldowns?.sameDish ?? 0}
            min={0}
            max={30}
            onChange={(value) => setCooldown('sameDish', value)}
            hint="A dish is not suggested again for this many days."
          />
          <Stepper
            id="cooldown-same-protein"
            label="Same protein"
            unit="days"
            value={localSettings.cooldowns?.sameProtein ?? 0}
            min={0}
            max={30}
            onChange={(value) => setCooldown('sameProtein', value)}
            hint="Stops chicken on consecutive days, for example."
          />
          <Stepper
            id="cooldown-same-type"
            label="Same dish type"
            unit="days"
            value={localSettings.cooldowns?.sameDishType ?? 0}
            min={0}
            max={30}
            onChange={(value) => setCooldown('sameDishType', value)}
            hint="Stops rice or curry appearing too often."
          />
        </div>

        {draft.cooldowns && Object.keys(draft.cooldowns).length > 0 && (
          <button type="button" className="btn btn-primary btn--block" style={{ marginTop: 'var(--space-5)' }} onClick={saveCooldowns}>
            <Icon name="check" size={17} /> Save cooldowns
          </button>
        )}
      </Section>

      {/* ------------------------------------------------------ Dietary rules */}
      <Section icon="filter" title="Dietary rules" description="Hard limits the planner must respect">
        {rules?.length === 0 ? (
          <p style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            No rules yet. Add one to cap a protein, or to guarantee vegetables each week.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 var(--space-4)', display: 'grid', gap: 'var(--space-2)' }}>
            {rules.map((rule) => (
              <li key={rule.id} className="row-between" style={{
                padding: 'var(--space-3)',
                background: 'var(--fill-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
              }}>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 'var(--text-base)' }}>{describeRule(rule)}</span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{rule.category}</span>
                </span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  id={`btn-delete-rule-${rule.id}`}
                  aria-label={`Delete rule: ${describeRule(rule)}`}
                  onClick={() => deleteRule(rule.id)}
                  style={{ color: 'var(--danger)', minWidth: 40, minHeight: 40, padding: 0 }}
                >
                  <Icon name="trash" size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <button type="button" className="btn btn-secondary btn--block" id="btn-add-rule-start" onClick={() => setIsRuleFormOpen(true)}>
          <Icon name="plus" size={17} /> Add a rule
        </button>
      </Section>

      {/* ------------------------------------------------------------ Usage */}
      <Section
        icon="sparkle"
        title="Your usage"
        description="Counted on this device — nothing is sent anywhere"
      >
        {insights.totalMeals === 0 ? (
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Nothing planned yet. Once you start accepting suggestions, your habits will
            show up here.
          </p>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
              {[
                { label: 'Meals planned', value: insights.totalMeals, hint: `${insights.mealsPerWeek}/week` },
                { label: 'Days used', value: insights.daysWithMeals, hint: `${insights.mealsLast30Days} in last 30` },
                { label: 'Current streak', value: `${insights.currentStreak}d`, hint: `longest ${insights.longestStreak}d` },
                { label: 'Distinct dishes', value: insights.distinctDishes, hint: `${insights.distinctProteins} proteins` },
              ].map((stat) => (
                <div key={stat.label} style={{
                  padding: 'var(--space-3)',
                  background: 'var(--fill-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                }}>
                  <div className="tabular" style={{
                    fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)',
                    fontWeight: 'var(--weight-bold)', color: 'var(--accent)', lineHeight: 1.1,
                  }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>
                    {stat.label}
                  </div>
                  <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>{stat.hint}</div>
                </div>
              ))}
            </div>

            {/* How much of the household's opinion the planner actually knows. */}
            <div style={{ marginTop: 'var(--space-5)' }}>
              <div className="row-between" style={{ marginBottom: 'var(--space-1)' }}>
                <span className="form-label">Preferences rated</span>
                <span className="tabular" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  {insights.ratingsGiven}/{insights.ratingsPossible} ({Math.round(insights.ratingCoverage * 100)}%)
                </span>
              </div>
              <div className="stat-bar">
                <div className="stat-bar__fill" style={{ width: `${Math.min(100, insights.ratingCoverage * 100)}%` }} />
              </div>
              <p className="form-hint" style={{ marginTop: 'var(--space-2)', marginBottom: 0 }}>
                {insights.ratingCoverage < 0.25
                  ? 'The planner is guessing for most dishes. Rating more will noticeably improve suggestions.'
                  : 'Higher coverage means suggestions follow your family rather than chance.'}
              </p>
            </div>

            {/* Suggestion quality. This is the number that says whether the
                recommendations actually land, and therefore whether building more
                on top of them is worth it. */}
            {insights.topPickRate !== null && (
              <div style={{ marginTop: 'var(--space-5)' }}>
                <div className="row-between" style={{ marginBottom: 'var(--space-1)' }}>
                  <span className="form-label">Suggestions accepted</span>
                  <span className="tabular" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    {Math.round(insights.topPickRate * 100)}% first choice
                  </span>
                </div>
                <div className="stat-bar">
                  <div className="stat-bar__fill" style={{ width: `${insights.topPickRate * 100}%` }} />
                </div>
                <p className="form-hint" style={{ marginTop: 'var(--space-2)', marginBottom: 0 }}>
                  {insights.suggestionsShown} suggestion{insights.suggestionsShown === 1 ? '' : 's'} shown.
                  {' '}You took one of them {Math.round(insights.listAcceptanceRate * 100)}% of the time
                  ({insights.suggestionsAccepted} as offered, {insights.suggestionsAcceptedAlternative} from the list,
                  {' '}{insights.suggestionsRejected} swapped away).
                  {insights.topPickRate < 0.4 && insights.listAcceptanceRate >= 0.6
                    && ' The list usually has something you want, but rarely the first choice — the ranking needs work.'}
                  {insights.listAcceptanceRate < 0.6
                    && ' A low rate here means the suggestions are not landing.'}
                </p>
              </div>
            )}

            {insights.customDishes > 0 && (
              <p className="form-hint" style={{ marginTop: 'var(--space-4)', marginBottom: 0 }}>
                Plus <span className="tabular">{insights.customDishes}</span> recipe
                {insights.customDishes === 1 ? '' : 's'} of your own.
              </p>
            )}

            <button
              type="button"
              id="btn-copy-insights"
              className="btn btn-secondary btn--block"
              style={{ marginTop: 'var(--space-4)' }}
              onClick={async () => {
                const text = formatInsightsForSharing(insights);
                try {
                  await navigator.clipboard.writeText(text);
                  setInsightsCopied(true);
                  window.setTimeout(() => setInsightsCopied(false), 2500);
                } catch {
                  // Clipboard access can be denied; showing the text is the fallback.
                  window.prompt('Copy this summary:', text);
                }
              }}
            >
              <Icon name="download" size={16} />
              {insightsCopied ? 'Copied' : 'Copy summary'}
            </button>
            <p className="form-hint" style={{ marginTop: 'var(--space-2)', marginBottom: 0 }}>
              Counts only — no dish names, no family names, no dates. Safe to paste when
              reporting a problem.
            </p>
          </>
        )}
      </Section>

      {/* ------------------------------------------------------------- Backup */}
      <Section icon="database" title="Backup &amp; restore" description="Everything lives on this device only">
        {backupStatus && (
          <div
            role="status"
            style={{
              display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start',
              padding: 'var(--space-3)',
              marginBottom: 'var(--space-4)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
              background: backupStatus.kind === 'ok' ? 'var(--success-soft)' : 'var(--danger-soft)',
              border: `1px solid ${backupStatus.kind === 'ok' ? 'var(--success-border)' : 'var(--danger-border)'}`,
              color: backupStatus.kind === 'ok' ? 'var(--success)' : 'var(--danger)',
            }}
          >
            <Icon name={backupStatus.kind === 'ok' ? 'check' : 'warning'} size={16} />
            <span>{backupStatus.message}</span>
          </div>
        )}

        <p style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          There is no account and no server. If this browser&rsquo;s data is cleared, or you
          change phones, a backup file is the only way to get it back.
        </p>

        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          <button type="button" id="btn-export-backup" className="btn btn-primary btn--block" onClick={handleExport}>
            <Icon name="download" size={17} /> Export backup
          </button>
          <button type="button" id="btn-import-backup" className="btn btn-secondary btn--block" onClick={() => fileInputRef.current?.click()}>
            <Icon name="upload" size={17} /> Restore from backup
          </button>
        </div>
        <input
          ref={fileInputRef}
          id="import-backup-file"
          type="file"
          accept="application/json,.json"
          onChange={handleImportFile}
          style={{ display: 'none' }}
        />
      </Section>

      {/* ---------------------------------------------------- Data management */}
      <Section icon="warning" title="Reset &amp; erase" description="Destructive — export a backup first">
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          <button type="button" id="btn-reseed-db" className="btn btn-secondary btn--block" onClick={() => setPendingReseed(true)}>
            <Icon name="refresh" size={17} /> Refresh built-in recipes
          </button>
          <button
            type="button"
            id="btn-reset-history"
            className="btn btn-secondary btn--block"
            onClick={async () => {
              if (window.confirm('Clear all cooking history? This cannot be undone.')) {
                await db.cookingHistory.clear();
                setBackupStatus({ kind: 'ok', message: 'Cooking history cleared.' });
              }
            }}
          >
            <Icon name="calendar" size={17} /> Reset cooking history
          </button>
          <button type="button" id="btn-erase-all" className="btn btn-danger btn--block" onClick={() => setPendingErase(true)}>
            <Icon name="trash" size={17} /> Erase everything
          </button>
        </div>
      </Section>

      {/* ----------------------------------------------------- Add rule modal */}
      {isRuleFormOpen && (
        <Modal
          title="Add a dietary rule"
          titleId="add-rule-title"
          onClose={() => setIsRuleFormOpen(false)}
          footer={(
            <>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsRuleFormOpen(false)}>
                Cancel
              </button>
              <button type="submit" form="rule-form" id="btn-save-rule" className="btn btn-primary" style={{ flex: 1 }}>
                Save rule
              </button>
            </>
          )}
        >
          <form id="rule-form" onSubmit={handleAddRule} style={{ display: 'grid', gap: 'var(--space-5)' }}>
            <RadioGroup
              name="rule-type"
              legend="Rule"
              value={newRule.ruleType}
              options={RULE_TYPE_OPTIONS}
              onChange={(value) => setNewRule({ ...newRule, ruleType: value })}
            />

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="rule-category">Applies to</label>
              <select
                id="rule-category"
                className="select"
                value={newRule.category}
                onChange={(event) => {
                  const category = event.target.value;
                  setNewRule({ ...newRule, category, value: RULE_CATEGORY_VALUES[category][0] });
                }}
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="rule-value">Which one</label>
              <select
                id="rule-value"
                className="select"
                value={newRule.value}
                onChange={(event) => setNewRule({ ...newRule, value: event.target.value })}
              >
                {(RULE_CATEGORY_VALUES[newRule.category] || []).map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>

            {newRule.ruleType !== DIETARY_RULE_TYPES.NO_CONSECUTIVE && (
              <Stepper
                id="rule-limit"
                label={newRule.ruleType === DIETARY_RULE_TYPES.MAX_PER_WEEK ? 'Maximum per week' : 'Minimum per week'}
                unit="times"
                value={newRule.limit}
                min={1}
                max={14}
                onChange={(value) => setNewRule({ ...newRule, limit: value })}
              />
            )}
          </form>
        </Modal>
      )}

      {/* -------------------------------------------------------- Erase modal */}
      {pendingErase && (
        <Modal
          title="Erase everything?"
          titleId="erase-title"
          onClose={() => setPendingErase(false)}
          footer={(
            <>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setPendingErase(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ flex: 1 }}
                onClick={async () => { await db.delete(); window.location.reload(); }}
              >
                Erase all data
              </button>
            </>
          )}
        >
          <p style={{ margin: '0 0 var(--space-4)', color: 'var(--text-secondary)' }}>
            This permanently deletes your recipes, family members, preferences and the entire
            cooking history on this device.
          </p>
          <div style={{
            display: 'flex', gap: 'var(--space-2)',
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--danger-soft)',
            border: '1px solid var(--danger-border)',
            color: 'var(--danger)',
            fontSize: 'var(--text-sm)',
          }}>
            <Icon name="warning" size={16} />
            <span>Export a backup first if there is any chance you want this data back.</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn--block"
            style={{ marginTop: 'var(--space-4)' }}
            onClick={async () => { setPendingErase(false); await handleExport(); }}
          >
            <Icon name="download" size={16} /> Export a backup now
          </button>
        </Modal>
      )}

      {/* ------------------------------------------------------- Reseed modal */}
      {pendingReseed && (
        <Modal
          title="Refresh built-in recipes?"
          titleId="reseed-title"
          onClose={() => setPendingReseed(false)}
          footer={(
            <>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setPendingReseed(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={async () => {
                  const count = await restoreDefaultDishes();
                  setPendingReseed(false);
                  setBackupStatus({ kind: 'ok', message: `Restored ${count} built-in recipes. Your own recipes were kept.` });
                }}
              >
                Refresh recipes
              </button>
            </>
          )}
        >
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            This restores the original 80 dishes to their default details.
            Your own recipes, cooking history and family preferences are left untouched.
          </p>
        </Modal>
      )}
    </div>
  );
};

export default SettingsPage;
