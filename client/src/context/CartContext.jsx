import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { round2 } from '../utils/pricing';

const STORAGE_KEY = 'pizza-shop-cart';
const CartContext = createContext(null);

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

const lineKey = (pizzaId, sizeId, toppings) =>
  `${pizzaId}-${sizeId}-${toppings.map((t) => t.id).sort((a, b) => a - b).join('.')}`;

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage unavailable (private mode) - cart still works for this page */
    }
  }, [items]);

  const value = useMemo(() => {
    const addItem = ({ pizza, size, toppings = [], quantity = 1 }) => {
      const key = lineKey(pizza.id, size.sizeId, toppings);
      setItems((prev) => {
        const existing = prev.find((i) => i.key === key);
        if (existing) {
          return prev.map((i) =>
            i.key === key ? { ...i, quantity: Math.min(20, i.quantity + quantity) } : i
          );
        }
        const unitPrice = round2(size.price + toppings.reduce((s, t) => s + t.price, 0));
        return [
          ...prev,
          {
            key,
            pizzaId: pizza.id,
            pizzaName: pizza.name,
            sizeId: size.sizeId,
            sizeName: size.sizeName,
            basePrice: size.price,
            toppings: toppings.map((t) => ({ id: t.id, name: t.name, price: t.price })),
            unitPrice,
            quantity,
          },
        ];
      });
    };
    const updateQuantity = (key, quantity) =>
      setItems((prev) =>
        quantity <= 0
          ? prev.filter((i) => i.key !== key)
          : prev.map((i) => (i.key === key ? { ...i, quantity: Math.min(20, quantity) } : i))
      );
    const removeItem = (key) => setItems((prev) => prev.filter((i) => i.key !== key));
    const clearCart = () => setItems([]);
    const count = items.reduce((s, i) => s + i.quantity, 0);
    const subtotal = round2(items.reduce((s, i) => s + i.unitPrice * i.quantity, 0));
    return { items, addItem, updateQuantity, removeItem, clearCart, count, subtotal };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
