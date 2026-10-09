import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import OrderDetails, { StatusBadge } from '../../components/OrderDetails';
import Notice from '../../components/Notice';
import { ORDER_STATUSES, statusLabel, formatDate } from '../../utils/format';

const PAGE_SIZE = 20;

function OrderRow({ order, onChangeStatus, expanded, onToggle }) {
  const { fmt } = useSettings();
  const [next, setNext] = useState(order.allowedNextStatuses[0] || '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => setNext(order.allowedNextStatuses[0] || ''), [order.allowedNextStatuses]);

  const apply = async () => {
    setBusy(true);
    setError(null);
    try {
      await onChangeStatus(order, next, note);
      setNote('');
    } catch (ex) {
      setError(ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="card order-row">
      <div className="order-row-head">
        <div>
          <strong className="order-number">{order.orderNumber}</strong>
          <div className="muted small">{formatDate(order.createdAt)}</div>
        </div>
        <div>
          <div>{order.customer.name}</div>
          <div className="muted small">{order.customer.phone}</div>
        </div>
        <div>
          <div>{order.orderType === 'DELIVERY' ? 'Delivery' : 'Pickup'} · {order.items.reduce((s, i) => s + i.quantity, 0)} items</div>
          <div className="muted small">{order.paymentMethod} · {order.paymentStatus.toLowerCase()}</div>
        </div>
        <div className="num"><strong>{fmt(order.total)}</strong></div>
        <StatusBadge status={order.status} />
        <button type="button" className="link-button" onClick={onToggle}>{expanded ? 'Hide' : 'Details'}</button>
      </div>

      {order.allowedNextStatuses.length > 0 && (
        <div className="status-actions">
          <select value={next} onChange={(e) => setNext(e.target.value)} aria-label="Next status">
            {order.allowedNextStatuses.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
          </select>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" maxLength={255} />
          <button type="button" className="btn btn-primary btn-sm" onClick={apply} disabled={busy || !next}>
            {busy ? 'Saving…' : 'Update status'}
          </button>
        </div>
      )}
      {error && <Notice type="error">{error}</Notice>}
      {expanded && <OrderDetails order={order} />}
    </article>
  );
}

export default function AdminOrdersPage() {
  const { authApi } = useAuth();
  const { fmt } = useSettings();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    try {
      const [list, s] = await Promise.all([
        authApi(`/admin/orders?status=${status}&page=${page}&pageSize=${PAGE_SIZE}`),
        authApi('/admin/stats'),
      ]);
      setData(list);
      setStats(s);
      setError(null);
    } catch (ex) {
      setError(ex.message);
    }
  }, [authApi, status, page]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000); // keep the board fresh
    return () => clearInterval(timer);
  }, [load]);

  const changeStatus = async (order, next, note) => {
    const { order: updated } = await authApi(`/admin/orders/${order.id}/status`, {
      method: 'PATCH',
      body: { status: next, note: note || undefined },
    });
    setData((d) => d && { ...d, orders: d.orders.map((o) => (o.id === updated.id ? { ...updated, statusHistory: undefined } : o)) });
    load();
  };

  const loadDetails = async (order) => {
    if (expanded === order.id) return setExpanded(null);
    setExpanded(order.id);
    if (!order.statusHistory) {
      const { order: full } = await authApi(`/admin/orders/${order.id}`);
      setData((d) => d && { ...d, orders: d.orders.map((o) => (o.id === full.id ? full : o)) });
    }
    return undefined;
  };

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <>
      {stats && (
        <div className="stats">
          <div className="stat"><span>Today's orders</span><strong>{stats.today.orders}</strong></div>
          <div className="stat"><span>Today's revenue</span><strong>{fmt(stats.today.revenue)}</strong></div>
          <div className="stat"><span>Pending</span><strong>{stats.byStatus.PENDING || 0}</strong></div>
          <div className="stat"><span>In the kitchen</span><strong>{(stats.byStatus.CONFIRMED || 0) + (stats.byStatus.PREPARING || 0)}</strong></div>
          <div className="stat"><span>On the way / ready</span><strong>{(stats.byStatus.OUT_FOR_DELIVERY || 0) + (stats.byStatus.READY_FOR_PICKUP || 0)}</strong></div>
        </div>
      )}

      <div className="toolbar">
        <label>Status
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
          </select>
        </label>
        <button type="button" className="btn btn-ghost btn-sm" onClick={load}>Refresh</button>
        {data && <span className="muted small">{data.total} order{data.total === 1 ? '' : 's'}</span>}
      </div>

      {error && <Notice type="error">{error}</Notice>}
      {!data && !error && <Notice>Loading orders…</Notice>}
      {data && data.orders.length === 0 && <Notice>No orders{status ? ` with status "${statusLabel(status)}"` : ' yet'}.</Notice>}
      {data && data.orders.map((o) => (
        <OrderRow key={o.id} order={o} onChangeStatus={changeStatus} expanded={expanded === o.id} onToggle={() => loadDetails(o)} />
      ))}

      {pages > 1 && (
        <div className="pagination">
          <button type="button" className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span className="muted small">Page {page} of {pages}</span>
          <button type="button" className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </>
  );
}
