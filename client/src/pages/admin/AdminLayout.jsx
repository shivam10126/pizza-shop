import { Navigate, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Notice from '../../components/Notice';

export default function AdminLayout() {
  const { user, loading } = useAuth();
  if (loading) return <Notice>Checking your session…</Notice>;
  if (!user) return <Navigate to="/admin/login" replace />;

  return (
    <div className="admin">
      <div className="admin-head">
        <h1>Dashboard</h1>
        <nav className="subnav" aria-label="Admin">
          <NavLink to="/admin" end>Orders</NavLink>
          {user.role === 'ADMIN' && <NavLink to="/admin/menu">Menu</NavLink>}
        </nav>
        <span className="muted small">Signed in as {user.displayName || user.username} ({user.role.toLowerCase()})</span>
      </div>
      <Outlet />
    </div>
  );
}
