import { useEffect, useState } from 'react';
import { api } from '../api';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import PizzaCard from '../components/PizzaCard';
import Notice from '../components/Notice';

export default function MenuPage() {
  const [menu, setMenu] = useState(null);
  const [error, setError] = useState(null);
  const { addItem } = useCart();
  const { shopName, fmt, freeDeliveryOver } = useSettings();

  useEffect(() => {
    api('/menu').then(setMenu).catch((e) => setError(e.message));
  }, []);

  if (error) return <Notice type="error">Could not load the menu: {error}</Notice>;
  if (!menu) return <Notice>Loading menu…</Notice>;

  return (
    <>
      <section className="hero">
        <h1>Hot, fresh pizza from {shopName}</h1>
        <p>
          Pick a size, pile on your favourite toppings and choose delivery or pickup.
          {freeDeliveryOver > 0 && ` Free delivery on orders over ${fmt(freeDeliveryOver)}.`}
        </p>
        <div className="chip-row">
          {menu.categories.map((c) => (
            <a key={c.id} href={`#cat-${c.id}`} className="chip">{c.name}</a>
          ))}
        </div>
      </section>

      {menu.categories.length === 0 && <Notice>The menu is empty right now. Please check back soon.</Notice>}

      {menu.categories.map((c) => (
        <section key={c.id} id={`cat-${c.id}`} className="menu-section">
          <h2>{c.name}</h2>
          <div className="grid">
            {c.pizzas.map((p) => (
              <PizzaCard key={p.id} pizza={p} toppings={menu.toppings} onAdd={addItem} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
