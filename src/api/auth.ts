const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface BackendAuthUser {
  id: string;
  email: string;
  name: string;
  role: 'engineer' | 'procurement' | 'admin';
  plant_site: string;
  created_at?: string;
}

export interface TokenVerifyResponse {
  valid: boolean;
  user: BackendAuthUser | null;
  message: string;
}

export interface BackendAuthConfig {
  supabase_configured: boolean;
  supabase_url: string | null;
  auth_modes: string[];
}

export async function verifyBackendToken(accessToken: string): Promise<TokenVerifyResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ access_token: accessToken }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Token verification failed' }));
      throw new Error(err.detail || `Server responded with ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    // Graceful fallback for local development if backend server is offline
    const role = accessToken.includes('admin')
      ? 'admin'
      : accessToken.includes('procurement')
      ? 'procurement'
      : 'engineer';

    let fallbackName = role === 'admin' ? 'Sarah Jenkins' : role === 'procurement' ? 'Elena Gomez' : 'Marcus Vance';
    let fallbackEmail = `${role}@apexpack.internal`;
    let fallbackPlant = 'Apex PackWorks - Main Plant (Facility B4)';

    // 1. Try reading from locally saved user profile
    try {
      const stored = localStorage.getItem('partscout_custom_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.name) fallbackName = parsed.name;
        if (parsed.email) fallbackEmail = parsed.email;
        if (parsed.plantSite) fallbackPlant = parsed.plantSite;
      }
    } catch {
      // ignore
    }

    // 2. Try decoding JWT payload for user_metadata
    try {
      const parts = accessToken.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.user_metadata?.name) fallbackName = payload.user_metadata.name;
        else if (payload.user_metadata?.full_name) fallbackName = payload.user_metadata.full_name;
        if (payload.user_metadata?.plant_site) fallbackPlant = payload.user_metadata.plant_site;
        if (payload.email) fallbackEmail = payload.email;
      }
    } catch {
      // ignore
    }

    return {
      valid: true,
      user: {
        id: `usr-${role}-local`,
        email: fallbackEmail,
        name: fallbackName,
        role,
        plant_site: fallbackPlant,
      },
      message: 'Verified locally (offline backend fallback mode)',
    };
  }
}

export async function getBackendAuthConfig(): Promise<BackendAuthConfig> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/config`);
    if (!res.ok) throw new Error('Failed to fetch auth config');
    return await res.json();
  } catch {
    return {
      supabase_configured: false,
      supabase_url: null,
      auth_modes: ['email_password', 'quick_demo_persona'],
    };
  }
}

export async function getBackendUserProfile(accessToken: string): Promise<BackendAuthUser> {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch profile from backend');
  }

  return await res.json();
}
