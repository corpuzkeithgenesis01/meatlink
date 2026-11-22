import { useEffect, useState } from 'react';
import { API_URL } from '../api';
import { useCart } from '../context/CartContext';
import ProductImage from '../components/ProductImage';
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
      <section className="hero">
        <span className="hero-eyebrow">Local. Fresh. Direct.</span>
        <h1>Good meat, straight from your local seller.</h1>
        <p>
          Chicken and pork cuts for your household, school, or business — with
          pickup, delivery, and wholesale pricing.
        </p>
        <div className="hero-actions">
          <a className="btn btn-light" href="#products">Browse products</a>
          <a className="btn btn-ghost-light" href="#products">See wholesale cuts</a>
        </div>
        <div className="hero-features">
          <span className="hero-feature">✓ Fresh daily</span>
          <span className="hero-feature">✓ Pick-up or delivery</span>
          <span className="hero-feature">✓ Wholesale discounts</span>
        </div>
      </section>

      {notice && <div className="toast" role="status">{notice}</div>}

      <section id="products" className="products-section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Catalog</span>
            <h2>Our products</h2>
          </div>
          <span className="section-count">{visibleProducts.length} cuts available</span>
        </div>

        <div className="search-row">
          <div className="search-field">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input
              placeholder="Search chicken, pork, cuts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="filter-buttons">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                className={`chip-button ${category === c ? '' : 'inactive'}`}
                onClick={() => setCategory(c)}
              >
                {c === 'all' ? 'All cuts' : c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="state-card">
            <span className="spinner" /> Loading fresh cuts...
          </div>
        )}
        {error && <div className="state-card state-card--error">{error}</div>}

        {!loading && !error && visibleProducts.length === 0 && (
          <div className="empty-state">
            <div className="empty-state__icon">🔎</div>
            <h3>No products found</h3>
            <p>Try a different search term or category.</p>
          </div>
        )}

        <div className="product-grid">
          {visibleProducts.map((p) => (
            <article key={p.id} className="product-card">
              <div className="product-card__media">
                <ProductImage product={p} />
                <span className="category chip">{p.category}</span>
              </div>
              <div className="product-card__body">
                <div className="product-card__top">
                  <h3>{p.name}</h3>
                  <span className={`stock-pill ${p.stock <= 0 ? 'out' : ''}`}>
                    {p.stock > 0 ? `${p.stock} ${p.unit} left` : 'Out of stock'}
                  </span>
                </div>
                <p className="price">
                  ₱{Number(p.price).toFixed(2)} <small>/ {p.unit}</small>
                </p>
                <button
                  className="btn btn-primary btn-block"
                  disabled={p.stock <= 0}
                  onClick={() => handleAdd(p)}
                >
                  {p.stock > 0 ? '+ Add to cart' : 'Out of stock'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Home;
