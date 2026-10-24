import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables for Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    supabaseUrl.includes('.supabase.co') &&
    supabaseAnonKey.length > 20
  );
};

// Safe fallback client for offline/sandbox development
class FallbackAuthClient {
  private listeners: ((event: string, session: any) => void)[] = [];
  private currentSession: any = null;

  constructor() {
    try {
      const stored = localStorage.getItem('partscout_supabase_session');
      if (stored) {
        this.currentSession = JSON.parse(stored);
      }
    } catch {
      this.currentSession = null;
    }
  }

  async getSession() {
    return { data: { session: this.currentSession }, error: null };
  }

  async getUser() {
    return { data: { user: this.currentSession?.user || null }, error: null };
  }

  onAuthStateChange(callback: (event: string, session: any) => void) {
    this.listeners.push(callback);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            this.listeners = this.listeners.filter((l) => l !== callback);
          },
        },
      },
    };
  }

  async signInWithPassword({ email, password }: { email: string; password?: string }) {
    if (!email || !email.includes('@')) {
      return { data: { user: null, session: null }, error: { message: 'Invalid email address.' } };
    }
    if (password && password.length < 6) {
      return { data: { user: null, session: null }, error: { message: 'Password must be at least 6 characters.' } };
    }

    const role = email.includes('admin')
      ? 'admin'
      : email.includes('procurement') || email.includes('gomez')
      ? 'procurement'
      : 'engineer';

    const mockUser = {
      id: `usr-${Date.now()}`,
      email,
      user_metadata: {
        name: email.split('@')[0].replace('.', ' ').replace(/(^\w|\s\w)/g, (m) => m.toUpperCase()),
        role,
        plant_site: 'Apex PackWorks - Main Plant (Facility B4)',
      },
      created_at: new Date().toISOString(),
    };

    const mockSession = {
      access_token: `sb_demo_${role}_${Date.now()}`,
      token_type: 'bearer',
      user: mockUser,
      expires_at: Math.floor(Date.now() / 1000) + 86400,
    };

    this.currentSession = mockSession;
    localStorage.setItem('partscout_supabase_session', JSON.stringify(mockSession));
    this.listeners.forEach((l) => l('SIGNED_IN', mockSession));

    return { data: { user: mockUser, session: mockSession }, error: null };
  }

  async signUp({ email, password, options }: { email: string; password?: string; options?: { data?: any } }) {
    if (!email || !email.includes('@')) {
      return { data: { user: null, session: null }, error: { message: 'Invalid email address.' } };
    }
    if (password && password.length < 6) {
      return { data: { user: null, session: null }, error: { message: 'Password must be at least 6 characters.' } };
    }

    const metadata = options?.data || {};
    const mockUser = {
      id: `usr-${Date.now()}`,
      email,
      user_metadata: {
        name: metadata.name || email.split('@')[0],
        role: metadata.role || 'engineer',
        plant_site: metadata.plant_site || 'Apex PackWorks - Main Plant (Facility B4)',
      },
      created_at: new Date().toISOString(),
    };

    const mockSession = {
      access_token: `sb_demo_${metadata.role || 'engineer'}_${Date.now()}`,
      token_type: 'bearer',
      user: mockUser,
      expires_at: Math.floor(Date.now() / 1000) + 86400,
    };

    this.currentSession = mockSession;
    localStorage.setItem('partscout_supabase_session', JSON.stringify(mockSession));
    this.listeners.forEach((l) => l('SIGNED_IN', mockSession));

    return { data: { user: mockUser, session: mockSession }, error: null };
  }

  async signOut() {
    this.currentSession = null;
    localStorage.removeItem('partscout_supabase_session');
    this.listeners.forEach((l) => l('SIGNED_OUT', null));
    return { error: null };
  }

  async resetPasswordForEmail(email: string) {
    if (!email || !email.includes('@')) {
      return { data: null, error: { message: 'Invalid email address.' } };
    }
    return { data: { message: 'Password reset link sent to registered email address.' }, error: null };
  }
}

// Export singleton Supabase client or robust fallback client
export const supabase: SupabaseClient = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : ({
      auth: new FallbackAuthClient(),
    } as unknown as SupabaseClient);

export const getSupabaseConfigInfo = () => ({
  isConfigured: isSupabaseConfigured(),
  url: supabaseUrl || 'Not configured in .env',
  hasAnonKey: Boolean(supabaseAnonKey),
});
