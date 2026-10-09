import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import Notice from '../../components/Notice';
import PizzaForm from './PizzaForm';
import ToppingManager from './ToppingManager';

export default function AdminMenuPage() {
  const { authApi } = useAuth();
  const { fmt } = useSettings();
  const [menu, setMenu] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // null | 'new' | pizza object
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    try {
      setMenu(await authApi('/admin/menu'));
      setError(null);
    } catch (ex) {
      setError(ex.message);
    }
  }, [authApi]);

  useEffect(() => {
    load();
  }, [load]);

  const savePizza = async (data) => {
    if (editing === 'new') {
      await authApi('/admin/pizzas', { method: 'POST', body: data });
      setMessage('Pizza added to the menu.');
    } else {
      await authApi(`/admin/pizzas/${editing.id}`, { method: 'PUT', body: data });
      setMessage('Pizza updated.');
    }
    setEditing(null);
    await load();
  };

  const toggleAvailable = async (pizza) => {
    try {
      await authApi(`/admin/pizzas/${pizza.id}`, { method: 'PUT', body: { isAvailable: !pizza.isAvailable } });
      await load();
    } catch (ex) {
      setError(ex.message);
    }
  };

  const removePizza = async (pizza) => {
    if (!window.confirm(`Delete "${pizza.name}" from the menu? Past orders keep their details.`)) return;
    try {
      await authApi(`/admin/pizzas/${pizza.id}`, { method: 'DELETE' });
      setMessage(`"${pizza.name}" deleted.`);
      await load();
    } catch (ex) {
      setError(ex.message);
    }
  };

  if (error && !menu) return <Notice type="error">{error}</Notice>;
  if (!menu) return <Notice>Loading menu…</Notice>;

  return (
    <>
      {error && <Notice type="error">{error}</Notice>}
      {message && <Notice type="success">{message}</Notice>}

      <section className="card">
        <div className="section-head">
          <h2>Pizzas</h2>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => { setEditing('new'); setMessage(null); }}>Add pizza</button>
        </div>

        {editing && (
          <PizzaForm
            key={editing === 'new' ? 'new' : editing.id}
            categories={menu.categories}
            sizes={menu.sizes}
            initial={editing === 'new' ? null : editing}
            onSubmit={savePizza}
            onCancel={() => setEditing(null)}
          />
        )}

        <table className="table">
          <thead>
            <tr><th>Name</th><th>Category</th><th>Prices</th><th>Available</th><th /></tr>
          </thead>
          <tbody>
            {menu.pizzas.map((p) => (
              <tr key={p.id} className={p.isAvailable ? '' : 'row-muted'}>
                <td><strong>{p.name}</strong>{p.description && <div className="muted small">{p.description}</div>}</td>
                <td>{p.categoryName}</td>
                <td className="small">{p.sizes.map((s) => `${s.sizeName} ${fmt(s.price)}`).join(' · ') || <span className="muted">no prices</span>}</td>
                <td>
                  <label className="switch">
                    <input type="checkbox" checked={p.isAvailable} onChange={() => toggleAvailable(p)} />
                    <span>{p.isAvailable ? 'Yes' : 'No'}</span>
                  </label>
                </td>
                <td className="num actions-cell">
                  <button type="button" className="link-button" onClick={() => { setEditing(p); setMessage(null); }}>Edit</button>
                  <button type="button" className="link-button danger" onClick={() => removePizza(p)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <ToppingManager toppings={menu.toppings} onChanged={load} onError={setError} />
    </>
  );
}
