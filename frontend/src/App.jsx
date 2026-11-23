import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { connectSocket } from './socket';
import { notifyBrowser } from './utils/browserNotify';
import Navbar from './components/Navbar';
import OfflineBanner from './components/OfflineBanner';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/AdminLayout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Cart from './pages/Cart';
import MyOrders from './pages/MyOrders';
import Chat from './pages/Chat';
import Dashboard from './pages/admin/Dashboard';
import AdminProducts from './pages/admin/AdminProducts';
import ArchivedProducts from './pages/admin/ArchivedProducts';
import AdminOrders from './pages/admin/AdminOrders';
import AdminChat from './pages/admin/AdminChat';

function PublicLayout() {
  return (
    <div className="container">
      <Outlet />
    </div>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <strong>MeatLink</strong> · Fresh chicken and pork from local sellers to your table.
    </footer>
  );
}

function LiveNotifications() {
  const { token, user } = useAuth();

  useEffect(() => {
    if (!token || !user) return undefined;

    const socket = connectSocket(token);

    socket.on('order:status', (data) => {
      notifyBrowser({
        title: data.title,
        body: data.body,
        url: data.url || '/orders',
      });
    });

    socket.on('chat:message', (message) => {
      if (user.role === 'admin') {
        if (message.sender_id === message.buyer_id) {
          notifyBrowser({
            title: 'New message from a buyer',
            body: message.content,
            url: '/admin/chat',
          });
        }
      } else if (message.sender_id !== user.id) {
        notifyBrowser({
          title: 'New message from the seller',
          body: message.content,
          url: '/chat',
        });
      }
    });

    return () => socket.disconnect();
  }, [token, user]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <LiveNotifications />
          <Navbar />
          <OfflineBanner />
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/cart"
                element={
                  <ProtectedRoute buyerOnly>
                    <Cart />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders"
                element={
                  <ProtectedRoute buyerOnly>
                    <MyOrders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat"
                element={
                  <ProtectedRoute>
                    <Chat />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="archived" element={<ArchivedProducts />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="chat" element={<AdminChat />} />
            </Route>
          </Routes>
          <Footer />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;