import { useCallback, useEffect, useState } from 'react';
import { API_URL } from '../api';
import ProductForm from '../components/ProductForm';

function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/products`);
      if (!res.ok) throw new Error('Failed to load products');
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  async function handleSave(data) {
    setError('');
    const isEdit = editingProduct !== null;
    const url = isEdit
      ? `${API_URL}/api/products/${editingProduct.id}`
      : `${API_URL}/api/products`;

    try {
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to save product');

      setEditingProduct(null);
      await loadProducts();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }

  async function handleArchive(id) {
    if (!window.confirm('Archive this product?')) return;
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/products/${id}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to archive product');

      await loadProducts();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p>Loading products...</p>;

  return (
    <div>
      <ProductForm
        key={editingProduct ? editingProduct.id : 'new'}
        editingProduct={editingProduct}
        onSave={handleSave}
        onCancel={() => setEditingProduct(null)}
      />

      {error && <p className="error">{error}</p>}

      <h2>Products</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.category}</td>
              <td>₱{p.price} / {p.unit}</td>
              <td>{p.stock}</td>
              <td>
                <button onClick={() => setEditingProduct(p)}>Edit</button>{' '}
                <button className="danger" onClick={() => handleArchive(p.id)}>
                  Archive
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Products;