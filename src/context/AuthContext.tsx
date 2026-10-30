import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GitHub, GitHubError, User } from '../lib/github';

interface AuthContextType {
  token: string | null;
  user: User | null;
  loading: boolean;
  loginWithToken: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  github: GitHub | null;
  recentRepos: string[];
  addRecentRepo: (fullName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const KEYCHAIN_SERVICE = 'com.timeclimbers.playgrouditor.token';
const RECENT_KEY = '@playgrouditor:recent_repos';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentRepos, setRecentRepos] = useState<string[]>([]);
  const [github, setGithub] = useState<GitHub | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const stored = await AsyncStorage.getItem(RECENT_KEY);
        if (stored) {
          setRecentRepos(JSON.parse(stored) as string[]);
        }
        const creds = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
        if (creds) {
          const t = creds.password;
          const gh = new GitHub(t);
          try {
            setUser(await gh.user());
          } catch (e: unknown) {
            if (e instanceof GitHubError && e.status === 401) {
              await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
              return;
            }
            // Offline at launch must not sign the user out.
            console.warn('Could not load GitHub user', e);
          }
          setToken(t);
          setGithub(gh);
        }
      } catch (e: unknown) {
        console.error('Failed to restore session', e);
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, []);

  async function loginWithToken(t: string) {
    const gh = new GitHub(t);
    const u = await gh.user();
    await Keychain.setGenericPassword('github', t, { service: KEYCHAIN_SERVICE });
    setToken(t);
    setUser(u);
    setGithub(gh);
  }

  async function logout() {
    await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
    setToken(null);
    setUser(null);
    setGithub(null);
  }

  async function addRecentRepo(fullName: string) {
    const updated = [fullName, ...recentRepos.filter(r => r !== fullName)].slice(0, 10);
    setRecentRepos(updated);
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  }

  return (
    <AuthContext
      value={{
        token,
        user,
        loading,
        loginWithToken,
        logout,
        github,
        recentRepos,
        addRecentRepo,
      }}
    >
      {children}
    </AuthContext>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
