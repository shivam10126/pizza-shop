import { Link, NavLink } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const { shopName } = useSettings();
  const { count } = useCart();
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="brand">
          <span aria-hidden="true">🍕</span> {shopName}
        </Link>
        <nav className="nav-links" aria-label="Main">
          <NavLink to="/" end>Menu</NavLink>
          <NavLink to="/track">Track order</NavLink>
          <NavLink to="/cart" className="cart-link">
            Cart
            {count > 0 && <span className="cart-count" aria-label={`${count} items`}>{count}</span>}
          </NavLink>
          {user ? (
            <>
              <NavLink to="/admin">Dashboard</NavLink>
              <button type="button" className="link-button" onClick={logout}>Log out</button>
            </>
          ) : (
            <NavLink to="/admin/login" className="muted-link">Staff login</NavLink>
          )}
          <button
            type="button"
            className="theme-toggle"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <span aria-hidden="true">{theme === 'dark' ? '☀️' : '🌙'}</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
