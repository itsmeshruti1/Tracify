import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInWithPopup, GoogleAuthProvider, sendEmailVerification, sendPasswordResetEmail,
  signOut, updateProfile, applyActionCode, type User } from 'firebase/auth';
import { auth } from './config';

interface AuthState {
  user: User | null; verified: boolean; loading: boolean; error: string;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  google: () => Promise<void>; logout: () => Promise<void>;
  verify: () => Promise<void>; refresh: () => Promise<void>;
  reset: (email: string) => Promise<void>;
}
const Context = createContext<AuthState | null>(null);
function configured() {
  if (!auth) throw new Error('Cloud mode is not configured. Use the local demo or follow the Firebase setup in README.');
  return auth;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(Boolean(auth));
  const [error, setError] = useState('');
  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, next => {
      setUser(next); setVerified(Boolean(next?.emailVerified)); setLoading(false);
    }, err => { setError(err.message); setLoading(false); });
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('oobCode');
    if (auth && code && params.get('mode') === 'verifyEmail') {
      void applyActionCode(auth, code).then(async () => {
        await auth?.currentUser?.reload();
        await auth?.currentUser?.getIdToken(true);
        setVerified(Boolean(auth?.currentUser?.emailVerified));
        history.replaceState(null, '', location.pathname);
      }).catch(err => setError(`Email verification failed: ${err.message}`));
    }
  }, []);
  const value: AuthState = {
    user, verified, loading, error,
    login: async (email, password) => { await signInWithEmailAndPassword(configured(), email.trim(), password); },
    signup: async (email, password, name) => {
      if (password.length < 12) throw new Error('Use a password of at least 12 characters.');
      const { user: created } = await createUserWithEmailAndPassword(configured(), email.trim(), password);
      await updateProfile(created, { displayName: name.trim().slice(0, 80) });
      await sendEmailVerification(created);
    },
    google: async () => { await signInWithPopup(configured(), new GoogleAuthProvider()); },
    logout: async () => { await signOut(configured()); },
    verify: async () => {
      const current = configured().currentUser;
      if (!current) throw new Error('Sign in first.');
      await sendEmailVerification(current);
    },
    refresh: async () => {
      const current = configured().currentUser;
      if (!current) throw new Error('Sign in first.');
      await current.reload(); await current.getIdToken(true);
      setVerified(current.emailVerified);
    },
    reset: async email => { await sendPasswordResetEmail(configured(), email.trim()); },
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('AuthProvider is missing.');
  return value;
}
