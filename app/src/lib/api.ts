import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Where the TradeHub API lives. Set EXPO_PUBLIC_API_URL for the mobile app builds. The
// production website is served by the API server itself, so it uses its own address;
// in development the API is assumed to run on port 4000 of the machine serving the app.
function resolveBaseUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  if (Platform.OS === 'web') {
    return __DEV__ ? `${window.location.protocol}//${window.location.hostname}:4000` : window.location.origin;
  }
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host ?? 'localhost'}:4000`;
}

export const BASE_URL = resolveBaseUrl();

let token: string | null = null;

export const setToken = (value: string | null) => {
  token = value;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/api${path}`, {
      method: options.method ?? (options.body ? 'POST' : 'GET'),
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Could not reach TradeHub. Check your connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || 'Something went wrong. Please try again.');
  return data as T;
}

// Listing photos are stored as server-relative paths.
export const imageUrl = (path: string) => (path.startsWith('/') ? BASE_URL + path : path);

export const errorMessage = (err: unknown) =>
  err instanceof Error ? err.message : 'Something went wrong. Please try again.';
