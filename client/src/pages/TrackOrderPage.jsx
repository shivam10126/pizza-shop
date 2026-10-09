import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import OrderDetails from '../components/OrderDetails';
import Notice from '../components/Notice';
import { readLastOrder } from './OrderConfirmationPage';

export default function TrackOrderPage() {
  const [params] = useSearchParams();
  const last = readLastOrder();
  const [orderNumber, setOrderNumber] = useState(params.get('orderNumber') || last?.orderNumber || '');
  const [phone, setPhone] = useState(last?.phone || '');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const lookup = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const d = await api('/orders/track', {
        method: 'POST',
        body: { orderNumber: orderNumber.trim(), phone: phone.trim() },
      });
      setOrder(d.order);
    } catch (ex) {
      setOrder(null);
      setError(ex.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="narrow">
      <form className="card" onSubmit={lookup}>
        <h2>Track your order</h2>
        <p className="muted">Enter the order number from your confirmation and the phone number you ordered with.</p>
        <div className="form-row">
          <label>Order number<input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="PZ-XXXXXX" required /></label>
          <label>Phone<input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" required /></label>
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Looking up…' : 'Find my order'}</button>
      </form>

      {error && <Notice type="error">{error}</Notice>}
      {order && (
        <div className="card">
          <OrderDetails order={order} showCustomer={false} />
          <button type="button" className="btn btn-ghost" onClick={lookup} disabled={loading}>Refresh status</button>
        </div>
      )}
    </div>
  );
}
