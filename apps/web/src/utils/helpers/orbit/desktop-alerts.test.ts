import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  desktopAlertState,
  disableDesktopAlerts,
  enableDesktopAlerts,
  showDesktopAlert,
} from './desktop-alerts';

type Permission = 'default' | 'granted' | 'denied';

function fakeNotification(permission: Permission, request: Permission = permission) {
  const created: Array<{ title: string; body?: string }> = [];
  class FakeNotification {
    static permission: Permission = permission;
    static requestPermission = vi.fn(async () => {
      FakeNotification.permission = request;
      return request;
    });
    constructor(title: string, options?: { body?: string }) {
      created.push({ title, body: options?.body });
    }
  }
  vi.stubGlobal('Notification', FakeNotification);
  return { created };
}

describe('desktop alerts', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('reports blocked when the browser denied permission', () => {
    fakeNotification('denied');
    expect(desktopAlertState()).toBe('blocked');
  });

  it('stays off until the person turns it on, then remembers it', async () => {
    fakeNotification('default', 'granted');
    expect(desktopAlertState()).toBe('off');
    expect(await enableDesktopAlerts()).toBe('on');
    expect(desktopAlertState()).toBe('on');
    expect(disableDesktopAlerts()).toBe('off');
  });

  it('does not turn on when the person declines the browser prompt', async () => {
    fakeNotification('default', 'denied');
    expect(await enableDesktopAlerts()).toBe('blocked');
    expect(desktopAlertState()).toBe('blocked');
  });

  it('shows a native notification only when alerts are on', async () => {
    const { created } = fakeNotification('granted');
    showDesktopAlert('Due now', 'Call Sysco');
    expect(created).toHaveLength(0);
    await enableDesktopAlerts();
    showDesktopAlert('Due now', 'Call Sysco');
    expect(created).toEqual([{ title: 'Due now', body: 'Call Sysco' }]);
  });
});
