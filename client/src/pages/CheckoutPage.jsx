import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, fieldErrors } from '../api';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { calculateTotals } from '../utils/pricing';
import { Totals } from '../components/OrderDetails';
import Notice from '../components/Notice';

const LAST_ORDER_KEY = 'pizza-shop-last-order';

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const settings = useSettings();
  const navigate = useNavigate();
  const placedRef = useRef(false);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', orderType: 'DELIVERY', paymentMethod: 'CASH', notes: '',
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!items.length && !placedRef.current) navigate('/cart', { replace: true });
  }, [items.length, navigate]);

  const totals = calculateTotals(subtotal, form.orderType, settings);
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const err = (field) => errors[field] && <div className="field-error">{errors[field]}</div>;

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setErrors({});
    try {
      const payload = {
        customer: {
          name: form.name,
          phone: form.phone,
          email: form.email || undefined,
          address: form.address || undefined,
        },
        orderType: form.orderType,
        paymentMethod: form.paymentMethod,
        notes: form.notes || undefined,
        items: items.map((i) => ({
          pizzaId: i.pizzaId, sizeId: i.sizeId, quantity: i.quantity, toppingIds: i.toppings.map((t) => t.id),
        })),
      };
      const { order } = await api('/orders', { method: 'POST', body: payload });
      placedRef.current = true;
      try {
        sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify({ orderNumber: order.orderNumber, phone: order.customer.phone }));
      } catch { /* ignore */ }
      clearCart();
      navigate(`/order/${order.orderNumber}`, { state: { order }, replace: true });
    } catch (ex) {
      setMessage(ex.message);
      setErrors(fieldErrors(ex));
      setSubmitting(false);
    }
  };

  return (
    <div className="two-col">
      <form className="card" onSubmit={submit} noValidate>
        <h2>Checkout</h2>
        {message && <Notice type="error">{message}</Notice>}

        <fieldset>
          <legend>Order type</legend>
          <div className="chip-row">
            {['DELIVERY', 'PICKUP'].map((t) => (
              <label key={t} className={`chip ${form.orderType === t ? 'chip-active' : ''}`}>
                <input type="radio" name="orderType" value={t} checked={form.orderType === t} onChange={set('orderType')} />
                {t === 'DELIVERY' ? 'Home delivery' : 'Pickup from store'}
              </label>
            ))}
          </div>
          {err('orderType')}
        </fieldset>

        <label>Full name<input value={form.name} onChange={set('name')} required autoComplete="name" />{err('customer.name')}</label>
        <label>Phone<input value={form.phone} onChange={set('phone')} required autoComplete="tel" inputMode="tel" placeholder="e.g. 98765 43210" />{err('customer.phone')}</label>
        <label>Email <span className="muted">(optional)</span><input type="email" value={form.email} onChange={set('email')} autoComplete="email" />{err('customer.email')}</label>
        <label>
          {form.orderType === 'DELIVERY' ? 'Delivery address' : 'Address'} {form.orderType !== 'DELIVERY' && <span className="muted">(optional)</span>}
          <textarea rows="3" value={form.address} onChange={set('address')} autoComplete="street-address" />
          {err('customer.address')}
        </label>

        <fieldset>
          <legend>Payment</legend>
          <div className="chip-row">
            {[['CASH', 'Cash on delivery / pickup'], ['CARD', 'Card on delivery'], ['UPI', 'UPI on delivery']].map(([v, label]) => (
              <label key={v} className={`chip ${form.paymentMethod === v ? 'chip-active' : ''}`}>
                <input type="radio" name="paymentMethod" value={v} checked={form.paymentMethod === v} onChange={set('paymentMethod')} />
                {label}
              </label>
            ))}
          </div>
          {err('paymentMethod')}
        </fieldset>

        <label>Notes for the kitchen <span className="muted">(optional)</span><textarea rows="2" value={form.notes} onChange={set('notes')} />{err('notes')}</label>

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Placing order…' : `Place order · ${settings.fmt(totals.total)}`}
        </button>
        <Link to="/cart" className="btn btn-ghost btn-block">Back to cart</Link>
      </form>

      <aside className="card summary">
        <h3>Your order</h3>
        <ul className="mini-list">
          {items.map((i) => (
            <li key={i.key}>
              <span>{i.quantity} × {i.pizzaName} ({i.sizeName}){i.toppings.length ? ` + ${i.toppings.length} topping${i.toppings.length > 1 ? 's' : ''}` : ''}</span>
              <span>{settings.fmt(i.unitPrice * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <Totals totals={totals} />
      </aside>
    </div>
  );
}
