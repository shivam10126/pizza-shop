import { useSettings } from '../context/SettingsContext';
import { formatDate, statusLabel, PAYMENT_LABELS } from '../utils/format';

export function StatusBadge({ status }) {
  return <span className={`badge badge-${String(status).toLowerCase()}`}>{statusLabel(status)}</span>;
}

/** Subtotal / tax / delivery / total rows. Works for orders and cart previews. */
export function Totals({ totals }) {
  const { fmt } = useSettings();
  return (
    <dl className="totals">
      <div><dt>Subtotal</dt><dd>{fmt(totals.subtotal)}</dd></div>
      <div><dt>Tax</dt><dd>{fmt(totals.tax)}</dd></div>
      <div><dt>Delivery fee</dt><dd>{totals.deliveryFee > 0 ? fmt(totals.deliveryFee) : 'Free'}</dd></div>
      <div className="totals-grand"><dt>Total</dt><dd>{fmt(totals.total)}</dd></div>
    </dl>
  );
}

export default function OrderDetails({ order, showCustomer = true }) {
  const { fmt } = useSettings();
  return (
    <div className="order-details">
      <div className="order-head">
        <div>
          <div className="muted small">Order number</div>
          <div className="order-number">{order.orderNumber}</div>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <dl className="meta-grid">
        <div><dt>Placed</dt><dd>{formatDate(order.createdAt)}</dd></div>
        <div><dt>Type</dt><dd>{order.orderType === 'DELIVERY' ? 'Delivery' : 'Pickup'}</dd></div>
        <div>
          <dt>Payment</dt>
          <dd>{PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod} · {order.paymentStatus.toLowerCase()}</dd>
        </div>
        {order.deliveryAddress && <div><dt>Deliver to</dt><dd>{order.deliveryAddress}</dd></div>}
        {order.notes && <div><dt>Notes</dt><dd>{order.notes}</dd></div>}
        {showCustomer && order.customer && (
          <div>
            <dt>Customer</dt>
            <dd>
              {order.customer.name} · {order.customer.phone}
              {order.customer.email ? ` · ${order.customer.email}` : ''}
            </dd>
          </div>
        )}
      </dl>

      <table className="table">
        <thead>
          <tr><th>Item</th><th className="num">Qty</th><th className="num">Amount</th></tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id}>
              <td>
                <strong>{item.pizzaName}</strong> <span className="muted">({item.sizeName})</span>
                {item.toppings.length > 0 && (
                  <div className="muted small">+ {item.toppings.map((t) => t.name).join(', ')}</div>
                )}
                <div className="muted small">{fmt(item.unitPrice)} each</div>
              </td>
              <td className="num">{item.quantity}</td>
              <td className="num">{fmt(item.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Totals totals={order} />

      {order.statusHistory && order.statusHistory.length > 0 && (
        <div className="timeline">
          <h4>Progress</h4>
          <ol>
            {order.statusHistory.map((h, i) => (
              <li key={i}>
                <StatusBadge status={h.status} />
                <span className="muted small">
                  {formatDate(h.changedAt)}
                  {h.note ? ` · ${h.note}` : ''}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
