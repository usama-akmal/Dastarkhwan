import React from 'react';
import { Icon } from '../ui/Icon';

/**
 * Update available notice.
 *
 * Shown when a new version has installed and is waiting. Deliberately a prompt and
 * not an automatic reload: the user may be mid-way through choosing a meal, and
 * swapping the page out from under them would discard that.
 */
export const UpdatePrompt = ({ onUpdate, onDismiss }) => (
  <div
    className="update-prompt animate-fade-in-up"
    role="status"
    aria-live="polite"
  >
    <span style={{
      display: 'grid', placeItems: 'center', flex: '0 0 auto',
      width: 32, height: 32, borderRadius: 'var(--radius-full)',
      background: 'var(--accent-soft)', color: 'var(--accent)',
    }}>
      <Icon name="download" size={17} />
    </span>

    <span style={{ flex: 1, minWidth: 0 }}>
      <strong style={{ display: 'block', fontSize: 'var(--text-sm)' }}>A new version is ready</strong>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
        Reload to get the latest.
      </span>
    </span>

    <button type="button" className="btn btn-primary btn--sm" onClick={onUpdate} id="btn-apply-update">
      Reload
    </button>

    <button
      type="button"
      className="btn btn-ghost"
      onClick={onDismiss}
      aria-label="Dismiss update notice"
      style={{ minWidth: 32, minHeight: 32, padding: 0 }}
    >
      <Icon name="close" size={15} />
    </button>
  </div>
);

export default UpdatePrompt;
