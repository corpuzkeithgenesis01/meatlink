import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import NotificationButton from './NotificationButton';

function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav className="navbar">
      <Link to="/" className="brand" aria-label="MeatLink home">
        <span className="brand-mark">M</span>
        <span>Meat<span>Link</span></span>
      </Link>

      <div className="nav-right">
        <div className="nav-links">
          <Link to="/">Shop</Link>
          {!isAdmin && (
            <Link to="/cart" className="nav-cart">
              Cart
              {count > 0 && <span className="cart-badge">{count}</span>}
            </Link>
          )}
          {user && (
            <>
              {!isAdmin && <Link to="/orders">My Orders</Link>}
              {!isAdmin && <Link to="/chat">Chat</Link>}
              {isAdmin && <Link to="/admin">Admin</Link>}
            </>
          )}
        </div>

        {user ? (
          <div className="nav-account">
            <NotificationButton />
            <span className="user-chip">
              <span className="avatar">{String(user.name || '?').charAt(0).toUpperCase()}</span>
              <span className="user-chip__text">
                <strong>{user.name}</strong>
                <small>{user.role}</small>
              </span>
            </span>
            <button className="btn btn-outline-light" onClick={handleLogout}>Logout</button>
          </div>
        ) : (
          <div className="nav-account">
            <Link className="btn btn-outline-light" to="/login">Login</Link>
            <Link className="btn btn-light" to="/register">Get started</Link>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
