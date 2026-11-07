import { useEffect, useState } from 'react';
import { API_URL } from '../api';

function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProducts() {
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
    }

    loadProducts();
  }, []);

  if (loading) return <p>Loading products...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div>
      <h2>Products</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Price</th>
            <th>Stock</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.category}</td>
              <td>₱{p.price} / {p.unit}</td>
              <td>{p.stock}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Products;