import { useCallback, useEffect, useState } from 'react';
import { API_URL } from '../../api';
import { useAuth } from '../../context/AuthContext';

function ArchivedProducts() {
  const { token } = useAuth();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadArchived = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/products/archived/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load archived products');
      setProducts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadArchived();
  }, [loadArchived]);

  async function handleRestore(id) {
    if (!window.confirm('Restore this product?')) return;
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/products/${id}/restore`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to restore product');

      await loadArchived();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p>Loading archived products...</p>;

  return (
    <div>
      <h2 className="page-title">Archived Products</h2>

      {error && <p className="error">{error}</p>}

      {products.length === 0 ? (
        <p>No archived products.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Archived on</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.category}</td>
                <td>₱{p.price} / {p.unit}</td>
                <td>{new Date(p.deleted_at).toLocaleDateString()}</td>
                <td>
                  <button onClick={() => handleRestore(p.id)}>Restore</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ArchivedProducts;