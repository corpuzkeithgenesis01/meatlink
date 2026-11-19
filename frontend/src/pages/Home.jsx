import { useEffect, useState } from 'react';
import { API_URL } from '../api';
import { useCart } from '../context/CartContext';
import './Orders.css';

const CATEGORIES = ['all', 'chicken', 'pork'];

function Home() {
  const { addItem } = useCart();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [notice, setNotice] = useState('');

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

  function handleAdd(product) {
    addItem(product);
    setNotice(`${product.name} added to cart`);
    setTimeout(() => setNotice(''), 2000);
  }

  const visibleProducts = products.filter((p) => {
    const matchesCategory = category === 'all' || p.category === category;
    const matchesSearch = p.name
      .toLowerCase()
      .includes(search.trim().toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div>
      <div className="hero">
        <h1>Fresh chicken and pork, direct from local sellers</h1>
        <p>Browse cuts for your household, school, or business.</p>
      </div>

      <div className="search-row">
        <input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="filter-buttons">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={category === c ? '' : 'inactive'}
              onClick={() => setCategory(c)}
            >
              {c === 'all' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {notice && <p className="notice">{notice}</p>}
      {loading && <p>Loading products...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && visibleProducts.length === 0 && (
        <p>No products found.</p>
      )}

      <div className="product-grid">
        {visibleProducts.map((p) => (
          <div key={p.id} className="product-card">
            <h3>{p.name}</h3>
            <p className="category">{p.category}</p>
            <p className="price">₱{p.price} / {p.unit}</p>
            {p.stock > 0 ? (
              <p className="stock">{p.stock} {p.unit} available</p>
            ) : (
              <p className="stock out">Out of stock</p>
            )}
            <button disabled={p.stock <= 0} onClick={() => handleAdd(p)}>
              Add to cart
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Home;
