import { ReactNode } from 'react';
import { Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { LayoutTemplate, LogOut, MapPin, PanelsTopLeft } from 'lucide-react';
import { useAuth } from './auth';
import { Brand } from './components/Brand';
import Landing from './pages/Landing';
import Login from './pages/Login';
import NewSite from './pages/NewSite';
import Pay from './pages/Pay';
import Prospects from './pages/Prospects';
import Register from './pages/Register';
import SiteEditor from './pages/SiteEditor';
import Sites from './pages/Sites';
import Templates from './pages/Templates';

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p className="boot muted">Chargement…</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

function Shell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const name = user?.firstName || user?.email || '';
  return (
    <div className="shell">
      <header className="nav">
        <Brand />
        <nav className="appnav" aria-label="Navigation principale">
          <NavLink to="/" end>
            <MapPin size={18} aria-hidden /> <span>Prospection</span>
          </NavLink>
          <NavLink to="/sites">
            <PanelsTopLeft size={18} aria-hidden /> <span>Mes sites</span>
          </NavLink>
          <NavLink to="/templates">
            <LayoutTemplate size={18} aria-hidden /> <span>Modèles</span>
          </NavLink>
        </nav>
        <div className="nav-right">
          <div className="credits" title="Une création de site coûte 100 crédits">
            <strong>{user?.credits.toLocaleString('fr-FR')}</strong>
            <span>crédits</span>
          </div>
          <div className="who">
            <span className="muted" title={user?.email}>
              {name}
            </span>
            <button className="icon-btn" onClick={logout} aria-label="Se déconnecter" title="Se déconnecter">
              <LogOut size={18} aria-hidden />
            </button>
          </div>
        </div>
      </header>
      <main className="stage">{children}</main>
    </div>
  );
}

function ShellOutlet() {
  return (
    <RequireAuth>
      <Shell>
        <Outlet />
      </Shell>
    </RequireAuth>
  );
}

/** « / » : la page d'accueil pour les visiteurs, la carte de prospection une fois connecté. */
function Home() {
  const { user, loading } = useAuth();
  if (loading) return <p className="boot muted">Chargement…</p>;
  return user ? (
    <Shell>
      <Prospects />
    </Shell>
  ) : (
    <Landing />
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/pay/:token" element={<Pay />} />
      <Route element={<ShellOutlet />}>
        <Route path="sites" element={<Sites />} />
        <Route path="sites/new" element={<NewSite />} />
        <Route path="sites/:id" element={<SiteEditor />} />
        <Route path="templates" element={<Templates />} />
        <Route path="*" element={<p className="page-pad">Page introuvable.</p>} />
      </Route>
    </Routes>
  );
}
