import { NavLink } from 'react-router-dom';
import './Sidebar.css';

function Sidebar() {
  return (
    <aside className="sidebar">
      <h3>Admin Panel</h3>
      <NavLink to="/admin/products">Products</NavLink>
      <NavLink to="/admin/archived">Archived</NavLink>
      <NavLink to="/admin/orders">Orders</NavLink>
      <NavLink to="/admin/chat">Chat</NavLink>
    </aside>
  );
}

export default Sidebar;