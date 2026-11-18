import { useRegisterSW } from 'virtual:pwa-register/react';

const HOUR = 60 * 60 * 1000;

/**
 * Offers a newly deployed version as soon as it's downloaded, instead of the old behavior where the
 * installed app kept showing the cached version until its next launch. Tapping Refresh activates
 * the new service worker and reloads; nothing is lost because recordings live in
 * IndexedDB and running timers in localStorage, both of which survive a reload.
 *
 * Also checks for updates whenever the app returns to the foreground and once an hour, since a
 * para's phone may keep the app open all day.
 */
export default function UpdateBanner() {
  const { needRefresh: [needRefresh, setNeedRefresh] } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => { void registration.update(); };
      setInterval(check, HOUR);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
    },
  });

  if (!needRefresh) return null;
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-3 bg-indigo-600 px-4 py-2 text-sm text-white shadow-md">
      <span>A new version of BehaviorLens is ready.</span>
      <button onClick={() => void activateUpdate()}
        className="min-h-9 rounded-lg bg-white px-3 font-semibold text-indigo-700">Refresh</button>
      <button onClick={() => setNeedRefresh(false)} aria-label="Dismiss update notice"
        className="min-h-9 px-2 text-indigo-100">Later</button>
    </div>
  );
}

/**
 * Activate the waiting service worker and reload into the new version. Talks to the browser's
 * registration directly rather than the plugin's updateServiceWorker(), whose internal tracking
 * didn't deliver the message in testing. Reloads when the new worker takes control, with a timed
 * fallback so the button always works (e.g. on a first visit, where the page isn't controlled
 * yet and no controllerchange fires).
 */
async function activateUpdate() {
  const reload = () => window.location.reload();
  const registration = await navigator.serviceWorker?.getRegistration();
  if (!registration?.waiting) { reload(); return; }
  navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true });
  registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  setTimeout(reload, 3000);
}
