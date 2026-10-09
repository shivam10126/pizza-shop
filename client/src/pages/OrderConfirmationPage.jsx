import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../api';
import OrderDetails from '../components/OrderDetails';
import Notice from '../components/Notice';

const LAST_ORDER_KEY = 'pizza-shop-last-order';

export function readLastOrder() {
  try {
    return JSON.parse(sessionStorage.getItem(LAST_ORDER_KEY) || 'null');
  } catch {
    return null;
  }
}

export default function OrderConfirmationPage() {
  const { orderNumber } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(location.state?.order || null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (order) return;
    const last = readLastOrder();
    if (!last || last.orderNumber !== orderNumber) {
      setError('Use "Track order" with your order number and phone number to see this order.');
      return;
    }
    api('/orders/track', { method: 'POST', body: { orderNumber, phone: last.phone } })
      .then((d) => setOrder(d.order))
      .catch((e) => setError(e.message));
  }, [order, orderNumber]);

  if (error) {
    return (
      <div className="narrow">
        <Notice type="error">{error}</Notice>
        <Link className="btn btn-primary" to="/track">Track an order</Link>
      </div>
    );
  }
  if (!order) return <Notice>Loading your order…</Notice>;

  return (
    <div className="narrow">
      <div className="card">
        <div className="success-head">
          <div className="success-icon" aria-hidden="true">✓</div>
          <h2>Thank you! Your order is in.</h2>
          <p className="muted">
            Keep your order number <strong>{order.orderNumber}</strong> and the phone number you used to track it.
          </p>
        </div>
        <OrderDetails order={order} />
        <div className="actions">
          <Link className="btn btn-primary" to={`/track?orderNumber=${encodeURIComponent(order.orderNumber)}`}>Track this order</Link>
          <Link className="btn btn-ghost" to="/">Order more</Link>
        </div>
      </div>
    </div>
  );
}
