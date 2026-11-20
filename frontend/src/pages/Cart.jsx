import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL } from '../api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { queueOrder } from '../offlineQueue';
import './Orders.css';

function Cart() {
  const { token } = useAuth();
  const { items, updateQuantity, removeItem, clearCart, total } = useCart();
  const navigate = useNavigate();

  const [buyerType, setBuyerType] = useState('retail');
  const [pickupNotes, setPickupNotes] = useState('');
  const [fulfillment, setFulfillment] = useState('pickup');
  const [paymentMethod, setPaymentMethod] = useState('cop');
  const [street, setStreet] = useState('');
  const [barangay, setBarangay] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [queued, setQueued] = useState(false);

  function handleFulfillmentChange(value) {
    setFulfillment(value);
    setPaymentMethod(value === 'delivery' ? 'cod' : 'cop');
  }

  async function handlePlaceOrder() {
    setError('');

    if (
      fulfillment === 'delivery' &&
      (!street.trim() || !barangay.trim() || !municipality.trim())
    ) {
      setError('Please complete the delivery address.');
      return;
    }

    setLoading(true);

    const payload = {
      buyer_type: buyerType,
      pickup_notes: pickupNotes,
      fulfillment,
      payment_method: paymentMethod,
      delivery_street: fulfillment === 'delivery' ? street.trim() : null,
      delivery_barangay: fulfillment === 'delivery' ? barangay.trim() : null,
      delivery_municipality: fulfillment === 'delivery' ? municipality.trim() : null,
      items: items.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
      })),
    };

    let response = null;

    if (navigator.onLine) {
      try {
        response = await fetch(`${API_URL}/api/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      } catch {
        response = null;
      }
    }

    if (response === null) {
      try {
        await queueOrder(token, payload);
        clearCart();
        setQueued(true);
      } catch {
        setError('Could not save your order offline. Please try again.');
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to place order');

      clearCart();
      navigate('/orders');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (queued) {
    return (
      <div>
        <h2>Order saved</h2>
        <p className="notice">
          You are offline, so your order was saved on this device. It will be
          sent to the seller automatically when you are back online.
        </p>
        <Link to="/">Back to products</Link>
      </div>
    );
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
        <fieldset className="cart-section">
          <legend>Order type</legend>
          <div className="option-row">
            <label>
              <input
                type="radio"
                name="fulfillment"
                value="pickup"
                checked={fulfillment === 'pickup'}
                onChange={() => handleFulfillmentChange('pickup')}
              />
              Pick up
            </label>
            <label>
              <input
                type="radio"
                name="fulfillment"
                value="delivery"
                checked={fulfillment === 'delivery'}
                onChange={() => handleFulfillmentChange('delivery')}
              />
              Delivery
            </label>
          </div>
        </fieldset>

        {fulfillment === 'delivery' && (
          <fieldset className="cart-section">
            <legend>Delivery address</legend>
            <div className="address-grid">
              <label>
                Street
                <input
                  placeholder="House no. / street"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                />
              </label>
              <label>
                Barangay
                <input
                  placeholder="Barangay"
                  value={barangay}
                  onChange={(e) => setBarangay(e.target.value)}
                />
              </label>
              <label>
                Municipality
                <input
                  placeholder="Municipality"
                  value={municipality}
                  onChange={(e) => setMunicipality(e.target.value)}
                />
              </label>
            </div>
          </fieldset>
        )}

        <fieldset className="cart-section">
          <legend>Payment method</legend>
          <div className="option-row">
            <label>
              <input
                type="radio"
                name="payment"
                value="cod"
                checked={paymentMethod === 'cod'}
                onChange={() => setPaymentMethod('cod')}
              />
              COD — Cash on delivery
            </label>
            <label>
              <input
                type="radio"
                name="payment"
                value="cop"
                checked={paymentMethod === 'cop'}
                onChange={() => setPaymentMethod('cop')}
              />
              COP — Cash on pick-up
            </label>
          </div>
        </fieldset>

        <label>
          Buyer type
          <select value={buyerType} onChange={(e) => setBuyerType(e.target.value)}>
            <option value="retail">Retail (household)</option>
            <option value="wholesale">Wholesale (school, bulk)</option>
          </select>
        </label>

        <label>
          Notes (optional)
          <textarea
            rows="3"
            placeholder="Preferred time, cuts, etc."
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