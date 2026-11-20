import { useCallback, useEffect, useState } from 'react';
import { API_URL } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { confirmAction } from '../../utils/alerts';
import '../Orders.css';

const NEXT_STATUS = {
  pending: { value: 'confirmed', label: 'Confirm' },
  confirmed: { value: 'ready', label: 'Mark ready' },
  ready: { value: 'completed', label: 'Complete' },
};

const FILTERS = ['all', 'pending', 'confirmed', 'ready', 'completed', 'cancelled'];

function AdminOrders() {
  const { token } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/orders`, {
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

  async function updateStatus(id, status) {
    if (status === 'cancelled') {
      const confirmed = await confirmAction({
        title: 'Cancel this order?',
        text: 'This action cannot be undone.',
        confirmButtonText: 'Yes, cancel it',
      });
      if (!confirmed) return;
    }
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/orders/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update order');

      await loadOrders();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p>Loading orders...</p>;

  const visibleOrders =
    filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  return (
    <div>
      <h2 className="page-title">Orders</h2>

      <select
        className="filter-select"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      >
        {FILTERS.map((f) => (
          <option key={f} value={f}>
            {f === 'all' ? 'All orders' : f.charAt(0).toUpperCase() + f.slice(1)}
          </option>
        ))}
      </select>

      {error && <p className="error">{error}</p>}

      {visibleOrders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        visibleOrders.map((order) => {
          const next = NEXT_STATUS[order.status];
          const isOpen = Boolean(next);

          return (
            <div key={order.id} className="order-card">
              <div className="order-head">
                <h3>Order #{order.id}</h3>
                <span className={`badge badge-${order.status}`}>{order.status}</span>
              </div>

              <p className="order-meta">
                Buyer: {order.users?.name || 'Unknown'} ({order.users?.email || '-'})
              </p>
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
                      <td>{item.product_name}</td>
                      <td>₱{item.unit_price} / {item.unit}</td>
                      <td>{item.quantity} {item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className="cart-total">Total: ₱{order.total}</p>

              {isOpen && (
                <div className="order-actions">
                  <button onClick={() => updateStatus(order.id, next.value)}>
                    {next.label}
                  </button>
                  <button
                    className="danger"
                    onClick={() => updateStatus(order.id, 'cancelled')}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

export default AdminOrders;