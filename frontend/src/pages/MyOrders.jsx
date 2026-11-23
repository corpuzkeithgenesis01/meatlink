import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../api';
import { useAuth } from '../context/AuthContext';
import { confirmAction } from '../utils/alerts';
import ProductImage from '../components/ProductImage';
import './Orders.css';

function MyOrders() {
  const { token } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/orders/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load orders');
      setOrders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  async function handleCancel(id) {
    const confirmed = await confirmAction({
      title: 'Cancel this order?',
      text: 'This action cannot be undone.',
      confirmButtonText: 'Yes, cancel it',
    });
    if (!confirmed) return;
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/orders/${id}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel order');

      await loadOrders();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p>Loading your orders...</p>;

  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Your history</span>
          <h2>My orders</h2>
          <p>Track your recent orders and their current status.</p>
        </div>
        <Link className="text-link" to="/">+ New order</Link>
      </div>

      {error && <p className="error">{error}</p>}

      {orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">📋</div>
          <h3>No orders yet</h3>
          <p>When you place an order, it will show up here.</p>
          <Link className="btn btn-primary" to="/">Browse products</Link>
        </div>
      ) : (
        orders.map((order) => (
          <div key={order.id} className="order-card">
            <div className="order-head">
              <h3>Order #{order.id}</h3>
              <span className={`badge badge-${order.status}`}>{order.status}</span>
            </div>

            <p className="order-meta">
              {new Date(order.created_at).toLocaleString()} · {order.buyer_type}
            </p>
            <p className="order-meta">
              {order.fulfillment === 'delivery' ? 'Delivery' : 'Pick-up'} ·{' '}
              {order.payment_method === 'cod'
                ? 'COD (cash on delivery)'
                : 'COP (cash on pick-up)'}
            </p>
            {order.fulfillment === 'delivery' && (
              <p className="order-meta">
                Address: {order.delivery_street}, {order.delivery_barangay},{' '}
                {order.delivery_municipality}
              </p>
            )}
            {order.pickup_notes && (
              <p className="order-meta">Notes: {order.pickup_notes}</p>
            )}

            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {order.order_items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="order-product">
                        <ProductImage product={{ name: item.product_name, product_id: item.product_id }} />
                        <span>{item.product_name}</span>
                      </div>
                    </td>
                    <td>₱{item.unit_price} / {item.unit}</td>
                    <td>{item.quantity} {item.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {Number(order.discount) > 0 && (
              <p className="order-meta discount-line">
                Wholesale discount: -₱{Number(order.discount).toFixed(2)}
              </p>
            )}

            {order.fulfillment === 'delivery' && (
              <p className="order-meta">Includes ₱50.00 delivery fee.</p>
            )}

            <p className="cart-total">Total: ₱{order.total}</p>

            {order.status === 'pending' && (
              <div className="order-actions">
                <button className="danger" onClick={() => handleCancel(order.id)}>
                  Cancel order
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default MyOrders;
