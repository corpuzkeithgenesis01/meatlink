import { useEffect, useState } from 'react';
import { API_URL } from '../../api';
import { useAuth } from '../../context/AuthContext';

const LOW_STOCK_LIMIT = 10;

function Dashboard() {
  const { token } = useAuth();

  const [products, setProducts] = useState([]);
  const [archivedCount, setArchivedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadStats() {
      try {
        const [productsRes, archivedRes] = await Promise.all([
          fetch(`${API_URL}/api/products`),
          fetch(`${API_URL}/api/products/archived/list`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const productsData = await productsRes.json();
        const archivedData = await archivedRes.json();

        if (!productsRes.ok) {
          throw new Error(productsData.error || 'Failed to load products');
        }
        if (!archivedRes.ok) {
          throw new Error(archivedData.error || 'Failed to load archived products');
        }

        setProducts(productsData);
        setArchivedCount(archivedData.length);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [token]);

  if (loading) return <p>Loading dashboard...</p>;
  if (error) return <p className="error">{error}</p>;

  const chickenCount = products.filter((p) => p.category === 'chicken').length;
  const porkCount = products.filter((p) => p.category === 'pork').length;
  const lowStock = products.filter((p) => p.stock <= LOW_STOCK_LIMIT);

  return (
    <div>
      <h2 className="page-title">Dashboard</h2>

      <div className="stats">
        <div className="stat-card">
          <p className="stat-number">{products.length}</p>
          <p className="stat-label">Active products</p>
        </div>
        <div className="stat-card">
          <p className="stat-number">{archivedCount}</p>
          <p className="stat-label">Archived products</p>
        </div>
        <div className="stat-card">
          <p className="stat-number">{chickenCount}</p>
          <p className="stat-label">Chicken items</p>
        </div>
        <div className="stat-card">
          <p className="stat-number">{porkCount}</p>
          <p className="stat-label">Pork items</p>
        </div>
        <div className="stat-card">
          <p className="stat-number">{lowStock.length}</p>
          <p className="stat-label">Low stock (10 or less)</p>
        </div>
      </div>

      <h3>Low stock products</h3>
      {lowStock.length === 0 ? (
        <p>All products have enough stock.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>
            {lowStock.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.category}</td>
                <td>{p.stock} {p.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Dashboard;