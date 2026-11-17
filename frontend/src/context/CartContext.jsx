import { createContext, useContext, useEffect, useState } from 'react';

const CartContext = createContext(null);

function readSavedCart() {
  try {
    const saved = JSON.parse(localStorage.getItem('cart'));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(readSavedCart);

  // I-save ang cart sa tuwing nagbabago
  useEffect(() => {
    try {
      localStorage.setItem('cart', JSON.stringify(items));
    } catch {
      // kung hindi makapag-save, tuloy lang
    }
  }, [items]);

  function addItem(product) {
    setItems((current) => {
      const existing = current.find((i) => i.product_id === product.id);

      if (existing) {
        return current.map((i) =>
          i.product_id === product.id
            ? {
                ...i,
                stock: product.stock,
                quantity: Math.min(i.quantity + 1, product.stock),
              }
            : i
        );
      }

      return [
        ...current,
        {
          product_id: product.id,
          name: product.name,
          price: Number(product.price),
          unit: product.unit,
          stock: product.stock,
          quantity: 1,
        },
      ];
    });
  }

  function updateQuantity(productId, quantity) {
    setItems((current) =>
      current.map((i) =>
        i.product_id === productId
          ? { ...i, quantity: Math.max(1, Math.min(quantity, i.stock)) }
          : i
      )
    );
  }

  function removeItem(productId) {
    setItems((current) => current.filter((i) => i.product_id !== productId));
  }

  function clearCart() {
    setItems([]);
  }

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, updateQuantity, removeItem, clearCart, total, count }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}