import { Routes, Route, Outlet, Link } from 'react-router-dom';
import Navbar from './components/Navbar';
import MenuPage from './pages/MenuPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import TrackOrderPage from './pages/TrackOrderPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminMenuPage from './pages/admin/AdminMenuPage';
import { useSettings } from './context/SettingsContext';

function Layout() {
  const { shopName, localMode } = useSettings();
  return (
    <>
      <Navbar />
      {localMode && (
        <div className="local-banner" role="status">
          <strong>Local mode:</strong> no database is connected, so the menu and orders are stored in this browser only
          (sample data included). Staff login: <code>manager</code> / <code>1234</code>.
        </div>
      )}
      <main className="container page">
        <Outlet />
      </main>
      <footer className="footer">
        © {new Date().getFullYear()} {shopName} · Built with React, Express, Node.js and MySQL
      </footer>
    </>
  );
}

function NotFound() {
  return (
    <div className="empty">
      <h2>Page not found</h2>
      <Link className="btn btn-primary" to="/">Back to the menu</Link>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<MenuPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="order/:orderNumber" element={<OrderConfirmationPage />} />
        <Route path="track" element={<TrackOrderPage />} />
        <Route path="admin/login" element={<AdminLoginPage />} />
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminOrdersPage />} />
          <Route path="menu" element={<AdminMenuPage />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
