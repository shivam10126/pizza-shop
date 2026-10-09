import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import Notice from '../../components/Notice';

export default function AdminLoginPage() {
  const { user, login } = useAuth();
  const { localMode } = useSettings();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate('/admin', { replace: true });
  }, [user, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(form.username, form.password);
      navigate('/admin', { replace: true });
    } catch (ex) {
      setError(ex.message);
      setBusy(false);
    }
  };

  return (
    <div className="narrow">
      <form className="card login-card" onSubmit={submit}>
        <h2>Staff login</h2>
        {error && <Notice type="error">{error}</Notice>}
        <label>Username<input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoComplete="username" required /></label>
        <label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="current-password" required /></label>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        {localMode ? (
          <p className="muted small">
            No database is connected (local mode). Sign in with <code>manager</code> / <code>1234</code>.
          </p>
        ) : (
          <p className="muted small">
            The first admin account is created by <code>npm run db:seed</code> using ADMIN_USERNAME / ADMIN_PASSWORD from server/.env.
          </p>
        )}
      </form>
    </div>
  );
}
