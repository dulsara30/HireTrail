const KEY = 'ht_orbit_desktop_alerts';

export type DesktopAlertState = 'unsupported' | 'blocked' | 'off' | 'on';

function supported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/** Whether desktop alerts are available, blocked by the browser, switched off, or on. */
export function desktopAlertState(): DesktopAlertState {
  if (!supported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  try {
    if (Notification.permission === 'granted' && window.localStorage.getItem(KEY) === '1')
      return 'on';
  } catch {
    // storage is not available: treat as off
  }
  return 'off';
}

/** Asks the browser for permission (it shows its own prompt) and remembers the choice. */
export async function enableDesktopAlerts(): Promise<DesktopAlertState> {
  if (!supported()) return 'unsupported';
  const permission =
    Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off';
  try {
    window.localStorage.setItem(KEY, '1');
  } catch {
    // storage is not available: the choice only lasts until the page closes
  }
  return 'on';
}

export function disableDesktopAlerts(): DesktopAlertState {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // nothing to remove
  }
  return desktopAlertState();
}

/** Shows a native notification when alerts are on. Never throws. */
export function showDesktopAlert(title: string, body: string): void {
  if (desktopAlertState() !== 'on') return;
  try {
    new Notification(title, { body, tag: `orbit-${title}` });
  } catch {
    // some browsers only allow notifications from a service worker: skip quietly
  }
}
