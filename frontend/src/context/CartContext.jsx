import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('ordergo_cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('ordergo_cart', JSON.stringify(items));
  }, [items]);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  function addItem(menuItem) {
    setItems(prev => {
      const existing = prev.find(i => i.item_id === menuItem.item_id);
      if (existing) {
        return prev.map(i =>
          i.item_id === menuItem.item_id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { ...menuItem, quantity: 1 }];
    });
  }

  function removeItem(itemId) {
    setItems(prev => prev.filter(i => i.item_id !== itemId));
  }

  function updateQuantity(itemId, quantity) {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }
    setItems(prev =>
      prev.map(i => (i.item_id === itemId ? { ...i, quantity } : i))
    );
  }

  function clearCart() {
    setItems([]);
  }

  return (
    <CartContext.Provider value={{ items, itemCount, totalPrice, addItem, removeItem, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
