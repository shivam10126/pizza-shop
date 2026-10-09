import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';

export default function ToppingManager({ toppings, onChanged, onError }) {
  const { authApi } = useAuth();
  const { fmt } = useSettings();
  const [draft, setDraft] = useState({ name: '', price: '' });
  const [editing, setEditing] = useState(null); // { id, name, price }

  const run = async (fn) => {
    try {
      await fn();
      onError(null);
      await onChanged();
    } catch (ex) {
      onError(ex.message);
    }
  };

  const add = (e) => {
    e.preventDefault();
    run(async () => {
      await authApi('/admin/toppings', { method: 'POST', body: { name: draft.name, price: Number(draft.price) } });
      setDraft({ name: '', price: '' });
    });
  };
  const save = (e) => {
    e.preventDefault();
    run(async () => {
      await authApi(`/admin/toppings/${editing.id}`, { method: 'PUT', body: { name: editing.name, price: Number(editing.price) } });
      setEditing(null);
    });
  };
  const toggle = (t) => run(() => authApi(`/admin/toppings/${t.id}`, { method: 'PUT', body: { isAvailable: !t.isAvailable } }));
  const remove = (t) => {
    if (window.confirm(`Delete topping "${t.name}"?`)) run(() => authApi(`/admin/toppings/${t.id}`, { method: 'DELETE' }));
  };

  return (
    <section className="card">
      <h2>Toppings</h2>
      <form className="toolbar" onSubmit={add}>
        <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="New topping name" required maxLength={60} />
        <input type="number" min="0" step="0.01" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} placeholder="Price" required />
        <button type="submit" className="btn btn-primary btn-sm">Add topping</button>
      </form>
      <table className="table">
        <thead><tr><th>Name</th><th>Price</th><th>Available</th><th /></tr></thead>
        <tbody>
          {toppings.map((t) => (
            <tr key={t.id} className={t.isAvailable ? '' : 'row-muted'}>
              {editing && editing.id === t.id ? (
                <td colSpan={4}>
                  <form className="toolbar" onSubmit={save}>
                    <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required maxLength={60} />
                    <input type="number" min="0" step="0.01" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} required />
                    <button type="submit" className="btn btn-primary btn-sm">Save</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                  </form>
                </td>
              ) : (
                <>
                  <td>{t.name}</td>
                  <td>{fmt(t.price)}</td>
                  <td>
                    <label className="switch">
                      <input type="checkbox" checked={t.isAvailable} onChange={() => toggle(t)} />
                      <span>{t.isAvailable ? 'Yes' : 'No'}</span>
                    </label>
                  </td>
                  <td className="num actions-cell">
                    <button type="button" className="link-button" onClick={() => setEditing({ id: t.id, name: t.name, price: String(t.price) })}>Edit</button>
                    <button type="button" className="link-button danger" onClick={() => remove(t)}>Delete</button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
