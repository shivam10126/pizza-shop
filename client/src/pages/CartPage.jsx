import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { calculateTotals } from '../utils/pricing';
import { Totals } from '../components/OrderDetails';

export default function CartPage() {
  const { items, updateQuantity, removeItem, clearCart, subtotal } = useCart();
  const settings = useSettings();
  const { fmt } = settings;

  if (!items.length) {
    return (
      <div className="empty">
        <h2>Your cart is empty</h2>
        <p className="muted">Add a few pizzas from the menu to get started.</p>
        <Link className="btn btn-primary" to="/">Browse the menu</Link>
      </div>
    );
  }

  const preview = calculateTotals(subtotal, 'DELIVERY', settings);

  return (
    <div className="two-col">
      <section className="card">
        <h2>Your cart</h2>
        <table className="table">
          <thead>
            <tr><th>Item</th><th>Qty</th><th className="num">Amount</th><th /></tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.key}>
                <td>
                  <strong>{item.pizzaName}</strong> <span className="muted">({item.sizeName})</span>
                  {item.toppings.length > 0 && (
                    <div className="muted small">+ {item.toppings.map((t) => t.name).join(', ')}</div>
                  )}
                  <div className="muted small">{fmt(item.unitPrice)} each</div>
                </td>
                <td>
                  <div className="qty">
                    <button type="button" onClick={() => updateQuantity(item.key, item.quantity - 1)} aria-label="Decrease">−</button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => updateQuantity(item.key, item.quantity + 1)} aria-label="Increase">+</button>
                  </div>
                </td>
                <td className="num">{fmt(item.unitPrice * item.quantity)}</td>
                <td className="num">
                  <button type="button" className="link-button danger" onClick={() => removeItem(item.key)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" className="link-button" onClick={clearCart}>Clear cart</button>
      </section>

      <aside className="card summary">
        <h3>Summary</h3>
        <Totals totals={preview} />
        <p className="muted small">
          Shown with the delivery fee of {fmt(settings.deliveryFee)}
          {settings.freeDeliveryOver > 0 ? ` (free over ${fmt(settings.freeDeliveryOver)})` : ''}.
          Pickup orders have no delivery fee.
        </p>
        <Link to="/checkout" className="btn btn-primary btn-block">Checkout</Link>
        <Link to="/" className="btn btn-ghost btn-block">Add more pizzas</Link>
      </aside>
    </div>
  );
}
