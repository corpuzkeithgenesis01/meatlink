import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL } from '../api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import './Orders.css';

function Cart() {
  const { token } = useAuth();
  const { items, updateQuantity, removeItem, clearCart, total } = useCart();
  const navigate = useNavigate();

  const [buyerType, setBuyerType] = useState('retail');
  const [pickupNotes, setPickupNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handlePlaceOrder() {
    setError('');
    setLoading(true);

    try {
      const res = await fetch(${API_URL}/api/orders, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: Bearer ${token},
        },
        body: JSON.stringify({
          buyer_type: buyerType,
          pickup_notes: pickupNotes,
          items: items.map((i) => ({
            product_id: i.product_id,
            quantity: i.quantity,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place order');

      clearCart();
      navigate('/orders');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div>
        <h2>Your Cart</h2>
        <p>Your cart is empty.</p>
        <Link to="/">Browse products</Link>
      </div>
    );
  }

  return (
    <div>
      <h2>Your Cart</h2>

      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Price</th>
            <th>Quantity</th>
            <th>Subtotal</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.product_id}>
              <td>{i.name}</td>
              <td>₱{i.price} / {i.unit}</td>
              <td>
                <input
                  className="qty-input"
                  type="number"
                  min="1"
                  max={i.stock}
                  value={i.quantity}
                  onChange={(e) =>
                    updateQuantity(i.product_id, Number(e.target.value) || 1)
                  }
                />{' '}
                {i.unit}
              </td>
              <td>₱{(i.price * i.quantity).toFixed(2)}</td>
              <td>
                <button className="danger" onClick={() => removeItem(i.product_id)}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="cart-box">
        <label>
          Buyer type
          <select value={buyerType} onChange={(e) => setBuyerType(e.target.value)}>
            <option value="retail">Retail (household)</option>
            <option value="wholesale">Wholesale (school, bulk)</option>
          </select>
        </label>

        <label>
          Pickup notes (optional)
          <textarea
            rows="3"
            placeholder="Preferred pickup time, cuts, etc."
            value={pickupNotes}
            onChange={(e) => setPickupNotes(e.target.value)}
          />
        </label>

        <p className="cart-total">Total: ₱{total.toFixed(2)}</p>

        {error && <p className="error">{error}</p>}

        <button onClick={handlePlaceOrder} disabled={loading}>
          {loading ? 'Placing order...' : 'Place order'}
        </button>
      </div>
    </div>
  );
}

export default Cart;
