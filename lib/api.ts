/**
 * REST API client — replaces the Supabase client.
 * Handles JWT auth, auto-refresh on 401, and platform-specific token storage.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// On web (nginx proxy) use same-origin; on mobile use explicit host.
const BASE_URL: string =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === 'web' ? '' : 'http://localhost:8000');

// ── Token storage ─────────────────────────────────────────────────────────────

const TOKEN_KEY = 'campuseats_auth_tokens';

type Tokens = { access: string; refresh: string };

let _cache: Tokens | null = null;

const tokenStorage = {
  async get(): Promise<Tokens | null> {
    if (_cache) return _cache;
    try {
      const raw =
        Platform.OS === 'web'
          ? localStorage.getItem(TOKEN_KEY)
          : await SecureStore.getItemAsync(TOKEN_KEY);
      if (!raw) return null;
      _cache = JSON.parse(raw);
      return _cache;
    } catch {
      return null;
    }
  },

  async set(tokens: Tokens | null): Promise<void> {
    _cache = tokens;
    if (Platform.OS === 'web') {
      if (tokens) localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
      else localStorage.removeItem(TOKEN_KEY);
    } else {
      if (tokens) await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(tokens));
      else await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  },
};

// ── Core fetch wrapper ────────────────────────────────────────────────────────

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const tokens = await tokenStorage.get();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (tokens?.access) headers['Authorization'] = `Bearer ${tokens.access}`;

  let res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // Auto-refresh on 401
  if (res.status === 401 && tokens?.refresh) {
    const refreshRes = await fetch(`${BASE_URL}/api/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: tokens.refresh }),
    });

    if (refreshRes.ok) {
      const refreshData = await refreshRes.json();
      const newTokens: Tokens = {
        access: refreshData.access,
        refresh: refreshData.refresh ?? tokens.refresh,
      };
      await tokenStorage.set(newTokens);
      headers['Authorization'] = `Bearer ${newTokens.access}`;
      res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
    } else {
      await tokenStorage.set(null);
      throw new Error('Session expired. Please sign in again.');
    }
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(errBody.detail ?? errBody.message ?? 'Request failed');
  }

  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}

async function uploadRequest<T = any>(path: string, formData: FormData): Promise<T> {
  const tokens = await tokenStorage.get();
  const headers: Record<string, string> = {};
  if (tokens?.access) headers['Authorization'] = `Bearer ${tokens.access}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail ?? 'Upload failed');
  }
  return res.json() as Promise<T>;
}

// ── Public API ────────────────────────────────────────────────────────────────

export const api = {
  /** Exposed so AuthContext can read / clear tokens. */
  _tokens: tokenStorage,

  auth: {
    async signIn(email: string, password: string) {
      const data = await request('/api/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      await tokenStorage.set({ access: data.access, refresh: data.refresh });
      return data.user;
    },

    async signUp(email: string, password: string, username: string, fullName: string) {
      const data = await request('/api/auth/register/', {
        method: 'POST',
        body: JSON.stringify({ email, password, username, full_name: fullName }),
      });
      await tokenStorage.set({ access: data.access, refresh: data.refresh });
      return data.user;
    },

    async signOut() {
      const tokens = await tokenStorage.get();
      try {
        await request('/api/auth/logout/', {
          method: 'POST',
          body: JSON.stringify({ refresh: tokens?.refresh }),
        });
      } catch {
        // Best-effort logout
      } finally {
        await tokenStorage.set(null);
      }
    },

    me() {
      return request('/api/auth/me/');
    },
  },

  videos: {
    feed() {
      return request('/api/videos/feed/');
    },

    userVideos(userId: string) {
      return request(`/api/videos/?user_id=${encodeURIComponent(userId)}`);
    },

    async upload(videoUri: string, data: {
      caption: string;
      tags: string[];
      isFoodHack: boolean;
      duration?: number;
    }) {
      const form = new FormData();

      if (Platform.OS === 'web') {
        // On web, fetch the local blob URL and append as Blob
        const response = await fetch(videoUri);
        const blob = await response.blob();
        form.append('video', blob, 'video.mp4');
      } else {
        // On native (iOS/Android), React Native FormData accepts {uri, name, type}
        // Detect the real extension from the URI (iOS records .MOV, Android records .mp4)
        const uriLower = videoUri.toLowerCase();
        const ext = uriLower.endsWith('.mov') ? 'mov' : 'mp4';
        const mimeType = ext === 'mov' ? 'video/quicktime' : 'video/mp4';
        form.append('video', { uri: videoUri, name: `video.${ext}`, type: mimeType } as any);
      }

      form.append('caption', data.caption);
      form.append('tags', JSON.stringify(data.tags));
      form.append('is_food_hack', String(data.isFoodHack));
      if (data.duration != null) form.append('duration', String(data.duration));
      return uploadRequest('/api/videos/', form);
    },

    like(videoId: string) {
      return request(`/api/videos/${videoId}/like/`, { method: 'POST' });
    },

    unlike(videoId: string) {
      return request(`/api/videos/${videoId}/like/`, { method: 'DELETE' });
    },

    delete(videoId: string) {
      return request(`/api/videos/${videoId}/`, { method: 'DELETE' });
    },
  },

  comments: {
    list(videoId: string) {
      return request(`/api/videos/${videoId}/comments/`);
    },

    create(videoId: string, text: string) {
      return request(`/api/videos/${videoId}/comments/`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
    },
  },

  restaurants: {
    list(search?: string) {
      const qs = search ? `?search=${encodeURIComponent(search)}` : '';
      return request(`/api/restaurants/${qs}`);
    },

    get(id: string) {
      return request(`/api/restaurants/${id}/`);
    },

    save(id: string) {
      return request(`/api/restaurants/${id}/save/`, { method: 'POST' });
    },

    unsave(id: string) {
      return request(`/api/restaurants/${id}/save/`, { method: 'DELETE' });
    },

    reviews(id: string) {
      return request(`/api/restaurants/${id}/reviews/`);
    },

    addReview(id: string, data: { rating: number; comment: string }) {
      return request(`/api/restaurants/${id}/reviews/`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  },

  profiles: {
    get(userId: string) {
      return request(`/api/profiles/${userId}/`);
    },

    update(data: Partial<{
      username: string;
      full_name: string;
      avatar_url: string;
      bio: string;
      campus_location: string;
    }>) {
      return request('/api/auth/me/', { method: 'PATCH', body: JSON.stringify(data) });
    },
  },
};
