import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import NotificationButton from './NotificationButton';

function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav className="navbar">
      <Link to="/" className="brand">MeatLink</Link>

      <div className="nav-right">
        <Link to="/cart">Cart ({count})</Link>

        {user ? (
          <>
            <Link to="/orders">My Orders</Link>
            {user.role !== 'admin' && <Link to="/chat">Chat</Link>}
            {user.role === 'admin' && <Link to="/admin">Admin</Link>}
            <NotificationButton />
            <span>Hi, {user.name} ({user.role})</span>
            <button onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;