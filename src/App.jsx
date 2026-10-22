import React, { useEffect, useState } from 'react';
import { api } from './api.js';
import AdminDashboardPage from './pages/AdminDashboardPage.jsx';
import InventoryPage from './pages/InventoryPage.jsx';
import OrderManagementPage from './pages/OrderManagementPage.jsx';
import TokenQueuePage from './pages/TokenQueuePage.jsx';
import DisplayBoardPage from './pages/DisplayBoardPage.jsx';
import PrintPricingPage from './pages/PrintPricingPage.jsx';
import PaymentsPage from './pages/PaymentsPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import CustomerSite from './pages/CustomerSite.jsx';

const ROUTES = [
  { path: 'dashboard', label: '📊 Dashboard', el: AdminDashboardPage, roles: ['admin', 'staff', 'cashier'] },
  { path: 'orders', label: '🧾 Orders', el: OrderManagementPage, roles: ['admin', 'staff', 'cashier'] },
  { path: 'queue', label: '🎫 Token Queue', el: TokenQueuePage, roles: ['admin', 'staff'] },
  { path: 'inventory', label: '📦 Inventory', el: InventoryPage, roles: ['admin', 'staff'] },
  { path: 'pricing', label: '🖨️ Print Pricing', el: PrintPricingPage, roles: ['admin', 'staff', 'cashier'] },
  { path: 'payments', label: '💳 Payments', el: PaymentsPage, roles: ['admin', 'cashier'] },
  { path: 'reports', label: '📈 Reports', el: ReportsPage, roles: ['admin'] },
  { path: 'users', label: '👥 Users', el: UsersPage, roles: ['admin'] },
];

const CUSTOMER_PAGES = ['home', 'shop', 'print', 'track'];

const useHash = () => {
  const read = () => window.location.hash.replace(/^#\/?/, '') || 'home';
  const [hash, setHash] = useState(read());
  useEffect(() => {
    const on = () => { setHash(read()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash;
};

function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@stationeryhub.local');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    try { onLogin(await api.post('/login', { email, pin })); }
    catch (err) { setError(err.message); }
  };
  return (
    <div className="login">
      <form className="card" onSubmit={submit}>
        <h1>Stationery<span style={{ color: '#3b5bdb' }}>Hub</span></h1>
        <p className="muted" style={{ marginBottom: 16 }}>Sign in to manage your shop</p>
        {error && <div className="error">{error}</div>}
        <label className="field"><span>Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required /></label>
        <label className="field"><span>PIN</span>
          <input value={pin} onChange={(e) => setPin(e.target.value)} type="password" inputMode="numeric" required autoFocus /></label>
        <button className="btn primary" style={{ width: '100%' }}>Sign in</button>
        <div className="hint">
          Demo accounts (change these under Users):<br />
          admin@stationeryhub.local · 1234<br />
          staff@stationeryhub.local · 2222<br />
          cashier@stationeryhub.local · 3333<br />
          <a href="#/display">Open the customer display board →</a><br />
          <a href="#/">← Back to the customer website</a>
        </div>
      </form>
    </div>
  );
}

export default function App() {
  const hash = useHash();
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sh_user')); } catch { return null; }
  });

  // Customer website (public): home, shop, print, track
  if (CUSTOMER_PAGES.includes(hash)) return <CustomerSite page={hash} />;

  // The display board is public: it is meant for a TV facing customers.
  if (hash === 'display') return <DisplayBoardPage />;

  if (!user) {
    return <Login onLogin={(u) => { localStorage.setItem('sh_user', JSON.stringify(u)); setUser(u); }} />;
  }

  const allowed = ROUTES.filter((r) => r.roles.includes(user.role));
  const current = allowed.find((r) => r.path === hash) || allowed[0];
  const Page = current.el;

  return (
    <div className="shell">
      <aside className="side">
        <div className="logo">Stationery<span>Hub</span></div>
        <nav className="nav">
          {allowed.map((r) => (
            <a key={r.path} href={`#/${r.path}`} className={r.path === current.path ? 'active' : ''}>{r.label}</a>
          ))}
          <a href="#/display" target="_blank" rel="noreferrer">📺 Display Board ↗</a>
          <a href="#/" target="_blank" rel="noreferrer">🌐 Customer website ↗</a>
        </nav>
        <div className="me">
          {user.name}<br /><span style={{ opacity: 0.7, textTransform: 'capitalize' }}>{user.role}</span>
          <button className="btn sm" onClick={() => { localStorage.removeItem('sh_user'); setUser(null); }}>Sign out</button>
        </div>
      </aside>
      <main className="main"><Page user={user} /></main>
    </div>
  );
}
