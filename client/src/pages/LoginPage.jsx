import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const { user, login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login({ email: form.email, password: form.password });
      } else {
        await register(form);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.logo}>BG</div>
        <h1>BioGuard</h1>
        <p>
          Sistema integral para la gestión y seguimiento de equipos biomédicos,
          hojas de vida, mantenimientos y reportes técnicos.
        </p>
      </div>

      <form className={styles.card} onSubmit={handleSubmit}>
        <h2>{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h2>
        <p>Accede al panel de control de equipos biomédicos.</p>

        {mode === 'register' && (
          <div className="form-field">
            <label htmlFor="name">Nombre</label>
            <input
              id="name"
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
        )}

        <div className="form-field">
          <label htmlFor="email">Correo</label>
          <input
            id="email"
            type="email"
            className="input"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="admin@bioguard.local"
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            className="input"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <button className="btn btn-primary" disabled={loading}>
          {loading ? 'Procesando...' : mode === 'login' ? 'Entrar' : 'Registrarme'}
        </button>

        <p className={styles.switch}>
          {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
          <button
            type="button"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? 'Crear una' : 'Iniciar sesión'}
          </button>
        </p>

        <p className={styles.demo}>
          Demo: <Link to="#">admin@bioguard.local</Link> / admin123
        </p>
      </form>
    </div>
  );
}
