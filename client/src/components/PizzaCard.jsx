import { useState } from 'react';
import { useSettings } from '../context/SettingsContext';

export default function PizzaCard({ pizza, toppings, onAdd }) {
  const { fmt } = useSettings();
  const defaultSize = pizza.sizes[Math.min(1, pizza.sizes.length - 1)];
  const [sizeId, setSizeId] = useState(defaultSize.sizeId);
  const [selected, setSelected] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [showToppings, setShowToppings] = useState(false);
  const [added, setAdded] = useState(false);

  const size = pizza.sizes.find((s) => s.sizeId === sizeId) || pizza.sizes[0];
  const chosen = toppings.filter((t) => selected.includes(t.id));
  const unitPrice = size.price + chosen.reduce((sum, t) => sum + t.price, 0);

  const toggleTopping = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const add = () => {
    onAdd({ pizza, size, toppings: chosen, quantity });
    setAdded(true);
    setSelected([]);
    setQuantity(1);
    setShowToppings(false);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <article className="card pizza-card">
      <div className="pizza-image" aria-hidden="true">
        {pizza.imageUrl ? <img src={pizza.imageUrl} alt="" loading="lazy" /> : <span>🍕</span>}
      </div>
      <div className="pizza-body">
        <h3>{pizza.name}</h3>
        {pizza.description && <p className="muted small">{pizza.description}</p>}

        <div className="chip-row" role="radiogroup" aria-label={`${pizza.name} size`}>
          {pizza.sizes.map((s) => (
            <button
              key={s.sizeId}
              type="button"
              role="radio"
              aria-checked={s.sizeId === size.sizeId}
              className={`chip ${s.sizeId === size.sizeId ? 'chip-active' : ''}`}
              onClick={() => setSizeId(s.sizeId)}
            >
              {s.sizeName} · {fmt(s.price)}
            </button>
          ))}
        </div>

        {toppings.length > 0 && (
          <div className="toppings">
            <button type="button" className="link-button" onClick={() => setShowToppings((v) => !v)}>
              {showToppings ? 'Hide toppings' : `Add toppings${chosen.length ? ` (${chosen.length})` : ''}`}
            </button>
            {showToppings && (
              <div className="topping-list">
                {toppings.map((t) => (
                  <label key={t.id} className="topping">
                    <input type="checkbox" checked={selected.includes(t.id)} onChange={() => toggleTopping(t.id)} />
                    <span>{t.name}</span>
                    <span className="muted small">+{fmt(t.price)}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="pizza-footer">
          <div className="qty" aria-label="Quantity">
            <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Decrease">−</button>
            <span>{quantity}</span>
            <button type="button" onClick={() => setQuantity((q) => Math.min(20, q + 1))} aria-label="Increase">+</button>
          </div>
          <button type="button" className={`btn ${added ? 'btn-success' : 'btn-primary'}`} onClick={add}>
            {added ? 'Added ✓' : `Add · ${fmt(unitPrice * quantity)}`}
          </button>
        </div>
      </div>
    </article>
  );
}
