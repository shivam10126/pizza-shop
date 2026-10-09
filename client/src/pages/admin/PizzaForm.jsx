import { useState } from 'react';
import { fieldErrors } from '../../api';
import Notice from '../../components/Notice';

export default function PizzaForm({ categories, sizes, initial, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => ({
    name: initial?.name || '',
    description: initial?.description || '',
    imageUrl: initial?.imageUrl || '',
    categoryId: String(initial?.categoryId || categories[0]?.id || ''),
    isAvailable: initial ? initial.isAvailable : true,
    prices: Object.fromEntries(
      sizes.map((s) => [s.id, String(initial?.sizes.find((x) => x.sizeId === s.id)?.price ?? '')])
    ),
  }));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const setPrice = (sizeId) => (e) => setForm((f) => ({ ...f, prices: { ...f.prices, [sizeId]: e.target.value } }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setErrors({});
    try {
      await onSubmit({
        name: form.name,
        description: form.description || null,
        imageUrl: form.imageUrl || null,
        categoryId: Number(form.categoryId),
        isAvailable: form.isAvailable,
        prices: sizes
          .filter((s) => form.prices[s.id] !== '')
          .map((s) => ({ sizeId: s.id, price: Number(form.prices[s.id]) })),
      });
    } catch (ex) {
      setMessage(ex.message);
      setErrors(fieldErrors(ex));
      setBusy(false);
    }
  };

  return (
    <form className="subform" onSubmit={submit} noValidate>
      <h3>{initial ? `Edit ${initial.name}` : 'New pizza'}</h3>
      {message && <Notice type="error">{message}</Notice>}
      <div className="form-row">
        <label>Name<input value={form.name} onChange={set('name')} required maxLength={100} />{errors.name && <div className="field-error">{errors.name}</div>}</label>
        <label>Category
          <select value={form.categoryId} onChange={set('categoryId')}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {errors.categoryId && <div className="field-error">{errors.categoryId}</div>}
        </label>
      </div>
      <label>Description<textarea rows="2" value={form.description} onChange={set('description')} maxLength={500} /></label>
      <label>Image URL <span className="muted">(optional)</span><input value={form.imageUrl} onChange={set('imageUrl')} placeholder="https://…" /></label>
      <fieldset>
        <legend>Prices (leave a size empty to not offer it)</legend>
        <div className="form-row">
          {sizes.map((s) => (
            <label key={s.id}>{s.name}<input type="number" min="0" step="0.01" value={form.prices[s.id]} onChange={setPrice(s.id)} /></label>
          ))}
        </div>
        {errors.prices && <div className="field-error">{errors.prices}</div>}
      </fieldset>
      <label className="check"><input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })} /> Available for ordering</label>
      <div className="actions">
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
