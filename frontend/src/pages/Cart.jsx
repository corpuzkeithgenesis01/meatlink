import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL } from '../api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import ProductImage from '../components/ProductImage';
import { queueOrder } from '../offlineQueue';
import './Orders.css';

const WHOLESALE_MIN_KG = 10;
const WHOLESALE_DISCOUNT_PER_KG = 10;
const DELIVERY_FEE = 50;

function Cart() {
  const { token } = useAuth();
  const { items, count, updateQuantity, removeItem, clearCart, total } = useCart();
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

  const isWholesale = buyerType === 'wholesale';
  const totalKg = items
    .filter((i) => String(i.unit).toLowerCase() === 'kg')
    .reduce((sum, i) => sum + i.quantity, 0);
  const wholesaleEligible = isWholesale && totalKg >= WHOLESALE_MIN_KG;
  const discount = wholesaleEligible ? totalKg * WHOLESALE_DISCOUNT_PER_KG : 0;
  const deliveryFee = fulfillment === 'delivery' ? DELIVERY_FEE : 0;
  const payable = Math.max(total - discount, 0) + deliveryFee;

  function handleFulfillmentChange(value) {
    setFulfillment(value);
    setPaymentMethod(value === 'delivery' ? 'cod' : 'cop');
  }

  async function handlePlaceOrder() {
    setError('');

    if (isWholesale && !wholesaleEligible) {
      setError(
        `Wholesale orders require at least ${WHOLESALE_MIN_KG} kg (currently ${totalKg} kg).`
      );
      return;
    }

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
      <div className="empty-state">
        <div className="empty-state__icon">📦</div>
        <h2>Order saved</h2>
        <p className="notice">
          You are offline, so your order was saved on this device. It will be
          sent to the seller automatically when you are back online.
        </p>
        <Link className="btn btn-primary" to="/">Back to products</Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">🛒</div>
        <h2>Your cart is empty</h2>
        <p>Fresh cuts are waiting for you. Add a few favorites to get started.</p>
        <Link className="btn btn-primary" to="/">Browse products</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Checkout</span>
          <h2>Your cart</h2>
          <p>Review your cuts and choose how you want to get them.</p>
        </div>
        <Link className="text-link" to="/">← Continue shopping</Link>
      </div>

      <div className="cart-layout">
        <section className="card cart-items">
          <header className="cart-items__head">
            <h3>Items in your cart</h3>
            <span className="muted">{count} item{count === 1 ? '' : 's'}</span>
          </header>

          {items.map((i) => (
            <div className="cart-item" key={i.product_id}>
              <ProductImage product={i} />
              <div className="cart-item__info">
                <h4>{i.name}</h4>
                <p className="muted">₱{Number(i.price).toFixed(2)} / {i.unit}</p>
                <div className="qty-stepper" aria-label={`Quantity for ${i.name}`}>
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    disabled={i.quantity <= 1}
                    onClick={() => updateQuantity(i.product_id, i.quantity - 1)}
                  >
                    −
                  </button>
                  <span>{i.quantity}</span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    disabled={i.quantity >= i.stock}
                    onClick={() => updateQuantity(i.product_id, i.quantity + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="cart-item__line">
                <strong>₱{(i.price * i.quantity).toFixed(2)}</strong>
                <button
                  type="button"
                  className="remove-link"
                  onClick={() => removeItem(i.product_id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </section>

        <aside className="card cart-summary">
          <h3>Order details</h3>

          <fieldset className="cart-section">
            <legend>How would you like it?</legend>
            <div className="segmented">
              <label>
                <input
                  type="radio"
                  name="fulfillment"
                  value="pickup"
                  checked={fulfillment === 'pickup'}
                  onChange={() => handleFulfillmentChange('pickup')}
                />
                <span>🏪 Pick-up</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="fulfillment"
                  value="delivery"
                  checked={fulfillment === 'delivery'}
                  onChange={() => handleFulfillmentChange('delivery')}
                />
                <span>🚚 Delivery</span>
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
            <div className="segmented">
              <label>
                <input
                  type="radio"
                  name="payment"
                  value="cop"
                  checked={paymentMethod === 'cop'}
                  onChange={() => setPaymentMethod('cop')}
                />
                <span>Cash on pick-up</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="payment"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                />
                <span>Cash on delivery</span>
              </label>
            </div>
          </fieldset>

          <label className="field">
            Buyer type
            <select value={buyerType} onChange={(e) => setBuyerType(e.target.value)}>
              <option value="retail">Retail (household)</option>
              <option value="wholesale">Wholesale (school, bulk)</option>
            </select>
          </label>

          {isWholesale && (
            <div className={wholesaleEligible ? 'notice' : 'discount-warning'}>
              {wholesaleEligible
                ? `Wholesale discount: ₱${WHOLESALE_DISCOUNT_PER_KG}/kg × ${totalKg} kg = -₱${discount.toFixed(2)}`
                : `Wholesale requires at least ${WHOLESALE_MIN_KG} kg (currently ${totalKg} kg).`}
            </div>
          )}

          <label className="field">
            Notes (optional)
            <textarea
              rows="3"
              placeholder="Preferred time, cuts, etc."
              value={pickupNotes}
              onChange={(e) => setPickupNotes(e.target.value)}
            />
          </label>

          <div className="summary-lines">
            <div className="summary-line">
              <span>Subtotal</span>
              <span>₱{total.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="summary-line discount-line">
                <span>Wholesale discount</span>
                <span>−₱{discount.toFixed(2)}</span>
              </div>
            )}
            {fulfillment === 'delivery' && (
              <div className="summary-line">
                <span>Delivery fee</span>
                <span>₱{deliveryFee.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="summary-total">
            <span>Total</span>
            <strong>₱{payable.toFixed(2)}</strong>
          </div>
          {discount > 0 && (
            <p className="discount-total">You saved ₱{discount.toFixed(2)} with wholesale pricing.</p>
          )}

          {error && <p className="error">{error}</p>}

          <button
            className="btn btn-primary btn-block"
            onClick={handlePlaceOrder}
            disabled={loading || (isWholesale && !wholesaleEligible)}
          >
            {loading ? 'Placing order...' : 'Place order'}
          </button>
          <p className="summary-note">No payment online — pay when you receive your order.</p>
        </aside>
      </div>
    </div>
  );
}

export default Cart;
