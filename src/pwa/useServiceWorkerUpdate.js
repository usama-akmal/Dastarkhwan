import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Service worker update handling.
 *
 * The app used `registerType: 'autoUpdate'`, which does activate a new service
 * worker automatically — but activating a worker does **not** reload the page. An
 * open or home-screen-installed app therefore keeps running the JavaScript it
 * already loaded, so a deployed update was invisible until the user manually
 * force-quit and reopened. That is why the interface could look stale for days.
 *
 * This checks for a new worker and offers a reload instead of forcing one: the user
 * may be midway through planning a meal, and silently swapping the page out from
 * under them would discard that.
 */

const SW_URL = '/Dastarkhwan/sw.js';
const SW_SCOPE = '/Dastarkhwan/';
/** Re-check cadence while the app stays open. */
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

export function useServiceWorkerUpdate() {
  const [updateReady, setUpdateReady] = useState(false);
  const [registration, setRegistration] = useState(null);
  const reloadingRef = useRef(false);
  const dismissedRef = useRef(false);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return undefined;
    // In development the worker file is not generated, so registering would 404.
    if (import.meta.env.DEV) return undefined;

    // Captured once, before any worker activates. With `skipWaiting` and
    // `clientsClaim` enabled the new worker takes control almost immediately, so
    // testing `navigator.serviceWorker.controller` later is unreliable: a first
    // install would look like an update and trigger a needless reload.
    const hadController = Boolean(navigator.serviceWorker.controller);

    let cancelled = false;
    let intervalId;
    let onVisible;

    const handleControllerChange = () => {
      // Only a genuine update should reload. On first install there was no previous
      // version, so the page is already running current code.
      if (!hadController) return;
      if (reloadingRef.current || dismissedRef.current) return;
      reloadingRef.current = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE })
      .then((reg) => {
        if (cancelled) return undefined;
        setRegistration(reg);

        // A worker already waiting means an update arrived before this page loaded.
        if (reg.waiting && hadController) setUpdateReady(true);

        reg.addEventListener('updatefound', () => {
          const incoming = reg.installing;
          if (!incoming) return;
          incoming.addEventListener('statechange', () => {
            if (incoming.state === 'installed' && hadController) setUpdateReady(true);
          });
        });

        // Re-check when the app returns to the foreground — the common case for an
        // installed app left open for days on a kitchen counter.
        onVisible = () => {
          if (document.visibilityState === 'visible') reg.update().catch(() => {});
        };
        document.addEventListener('visibilitychange', onVisible);
        intervalId = window.setInterval(() => reg.update().catch(() => {}), CHECK_INTERVAL_MS);

        return reg.update().catch(() => {});
      })
      .catch(() => {
        // Registration failure is non-fatal: the app still works, just without
        // offline caching or update prompts.
      });

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
      if (onVisible) document.removeEventListener('visibilitychange', onVisible);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    const waiting = registration?.waiting;
    if (!waiting) {
      // Nothing pending (the worker may already have activated). A plain reload is
      // still the right action, and the dismissed guard prevents a loop.
      dismissedRef.current = true;
      window.location.reload();
      return;
    }
    // Ask the waiting worker to take over. `controllerchange` then reloads the page,
    // so the reload happens after the new worker is actually controlling the tab.
    waiting.postMessage({ type: 'SKIP_WAITING' });
  }, [registration]);

  /** Suppress the prompt for this session without applying the update. */
  const dismissUpdate = useCallback(() => {
    dismissedRef.current = true;
    setUpdateReady(false);
  }, []);

  return { updateReady, applyUpdate, dismissUpdate };
}

export default useServiceWorkerUpdate;
