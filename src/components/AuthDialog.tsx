import { useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { useAuth } from '../firebase/authContext';
import { cloudConfigured } from '../firebase/config';

export function AuthDialog({ onClose }: { onClose: () => void }) {
  const auth = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false);
  async function run(task: () => Promise<void>, message = '') {
    setBusy(true); setError(''); setNotice('');
    try { await task(); setNotice(message); } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const email = String(data.get('email')); const password = String(data.get('password'));
    void run(async () => {
      if (mode === 'reset') await auth.reset(email);
      else if (mode === 'signup') await auth.signup(email, password, String(data.get('name')));
      else await auth.login(email, password);
    }, mode === 'reset' ? 'If an eligible account exists, a reset email will be sent. Use the Firebase email link to reset your password.' :
      mode === 'signup' ? 'Account created. Check your email for the verification link.' : 'Signed in.');
  }
  return <Modal title="Private cloud workspace" onClose={() => { if (!busy) onClose(); }}>
    {!cloudConfigured ? <div className="stack"><p>Cloud mode is optional. The local workspace works without an account.</p>
      <p className="muted">To enable cloud storage, follow the Firebase setup in the project README, add your configuration to .env.local, and restart the development server.</p>
      <button onClick={onClose}>Continue locally</button></div> : auth.user ? <div className="stack">
      <p>Signed in as <strong>{auth.user.email}</strong></p>
      <p className="muted">Reports and evidence are private to this account. They are not sent to police or published to other users.</p>
      {!auth.verified && <div className="notice">Verify your email to access cloud storage.
        <div className="button-row"><button disabled={busy} onClick={() => void run(auth.verify, 'Verification email sent.')}>Send verification</button>
          <button disabled={busy} onClick={() => void run(auth.refresh, 'Verification status refreshed.')}>I verified my email</button></div></div>}
      <button disabled={busy} onClick={() => void run(auth.logout)}>Sign out</button>
    </div> : <form className="stack" onSubmit={submit}>
      <div className="segmented">{(['login', 'signup', 'reset'] as const).map(m => <button key={m} type="button" disabled={busy}
        className={m === mode ? 'active' : ''} onClick={() => { setMode(m); setError(''); setNotice(''); }}>{m === 'login' ? 'Sign in' : m === 'signup' ? 'Create account' : 'Reset password'}</button>)}</div>
      {mode === 'signup' && <label>Name<input name="name" autoComplete="name" maxLength={80} required /></label>}
      <label>Email<input type="email" name="email" autoComplete="email" required maxLength={128} /></label>
      {mode !== 'reset' && <label>Password<input type="password" name="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'signup' ? 12 : 1} required /></label>}
      <button className="primary" disabled={busy}>{busy ? 'Please wait…' : mode === 'reset' ? 'Send reset email' : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
      {mode !== 'reset' && <button type="button" disabled={busy} onClick={() => void run(auth.google, 'Signed in with Google.')}>Continue with Google</button>}
    </form>}
    {error && <p className="error" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}
  </Modal>;
}
