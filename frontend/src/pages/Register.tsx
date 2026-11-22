import { ChangeEvent, FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { errorText } from '../api';
import { Brand } from '../components/Brand';

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const set = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register({ email: form.email, password: form.password, firstName: form.firstName || undefined, lastName: form.lastName || undefined });
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card form" onSubmit={onSubmit}>
        <Brand />
        <h1>Créer un compte</h1>
        <p className="muted">3 000 crédits offerts : de quoi créer 30 sites.</p>
        <div className="row">
          <label>
            Prénom
            <input value={form.firstName} onChange={set('firstName')} maxLength={100} autoComplete="given-name" />
          </label>
          <label>
            Nom
            <input value={form.lastName} onChange={set('lastName')} maxLength={100} autoComplete="family-name" />
          </label>
        </div>
        <label>
          E-mail
          <input type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
        </label>
        <label>
          Mot de passe (8 caractères minimum)
          <input type="password" value={form.password} onChange={set('password')} required minLength={8} maxLength={72} autoComplete="new-password" />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="btn" disabled={busy}>
          {busy ? 'Création…' : "S'inscrire"}
        </button>
        <p className="muted">
          Déjà inscrit ? <Link to="/login">Se connecter</Link>
        </p>
      </form>
    </div>
  );
}
