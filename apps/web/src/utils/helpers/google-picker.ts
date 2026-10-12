export interface PickedDriveFile {
  url: string;
  name: string;
}

interface PickerDoc {
  name?: string;
  url?: string;
}

interface PickerResponse {
  action?: string;
  docs?: PickerDoc[];
}

interface PickerBuilder {
  addView(view: unknown): PickerBuilder;
  setOAuthToken(token: string): PickerBuilder;
  setDeveloperKey(key: string): PickerBuilder;
  setAppId(id: string): PickerBuilder;
  setCallback(cb: (data: PickerResponse) => void): PickerBuilder;
  build(): { setVisible(visible: boolean): void };
}

interface GoogleGlobal {
  accounts: {
    oauth2: {
      initTokenClient(config: {
        client_id: string;
        scope: string;
        callback: (res: { access_token?: string; error?: string }) => void;
        error_callback?: (err: { type?: string }) => void;
      }): { requestAccessToken(overrides?: { prompt?: string }): void };
    };
  };
  picker: {
    PickerBuilder: new () => PickerBuilder;
    DocsView: new () => unknown;
  };
}

interface GapiGlobal {
  load(name: string, cb: () => void): void;
}

const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const DRIVE_HOSTS = ['drive.google.com', 'docs.google.com'];

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
const appId = process.env.NEXT_PUBLIC_GOOGLE_APP_ID;

/** The picker is offered only when all three public Google values are set. */
export function isPickerConfigured(): boolean {
  return Boolean(clientId && apiKey && appId);
}

/** Maps what the Picker returns to the link and name we store; null when it is not a Drive link. */
export function mapPickedDoc(doc: PickerDoc | undefined): PickedDriveFile | null {
  if (!doc?.url) return null;
  try {
    const url = new URL(doc.url);
    if (url.protocol !== 'https:' || !DRIVE_HOSTS.includes(url.hostname.toLowerCase())) return null;
    return { url: url.toString(), name: (doc.name ?? '').trim().slice(0, 200) };
  } catch {
    return null;
  }
}

const loadedScripts = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  const cached = loadedScripts.get(src);
  if (cached) return cached;
  const promise = new Promise<void>((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => {
      loadedScripts.delete(src);
      reject(new Error('Could not load Google scripts'));
    };
    document.head.appendChild(el);
  });
  loadedScripts.set(src, promise);
  return promise;
}

function googleWindow(): { google?: GoogleGlobal; gapi?: GapiGlobal } {
  return window as unknown as { google?: GoogleGlobal; gapi?: GapiGlobal };
}

function requestToken(google: GoogleGlobal): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId ?? '',
      scope: DRIVE_FILE_SCOPE,
      callback: (res) =>
        res.access_token ? resolve(res.access_token) : reject(new Error('Access was not granted')),
      error_callback: () => reject(new Error('Google sign-in was closed')),
    });
    client.requestAccessToken();
  });
}

/**
 * Opens Google's file picker. The token stays in the browser and only covers files the user picks
 * (drive.file scope). Resolves null when the user cancels.
 */
export async function pickDriveFile(): Promise<PickedDriveFile | null> {
  await Promise.all([
    loadScript('https://accounts.google.com/gsi/client'),
    loadScript('https://apis.google.com/js/api.js'),
  ]);
  const { google, gapi } = googleWindow();
  if (!google || !gapi) throw new Error('Google scripts are not available');

  await new Promise<void>((resolve) => gapi.load('picker', () => resolve()));
  const token = await requestToken(google);

  return new Promise((resolve) => {
    const picker = new google.picker.PickerBuilder()
      .addView(new google.picker.DocsView())
      .setOAuthToken(token)
      .setDeveloperKey(apiKey ?? '')
      .setAppId(appId ?? '')
      .setCallback((data) => {
        if (data.action === 'picked') resolve(mapPickedDoc(data.docs?.[0]));
        else if (data.action === 'cancel') resolve(null);
      })
      .build();
    picker.setVisible(true);
  });
}
