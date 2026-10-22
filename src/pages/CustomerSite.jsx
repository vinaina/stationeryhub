import React, { useEffect, useMemo, useState } from 'react';
import { api, money } from '../api.js';
import { useLoad } from '../hooks.js';

const TABS = [
  ['home', 'Home'],
  ['shop', 'Shop'],
  ['print', 'Print & Copy'],
  ['track', 'Track order'],
];

function Header({ page, cartCount }) {
  return (
    <header className="cs-header">
      <a className="cs-logo" href="#/">Stationery<span>Hub</span></a>
      <nav className="cs-nav">
        {TABS.map(([k, label]) => (
          <a key={k} href={k === 'home' ? '#/' : `#/${k}`} className={page === k ? 'on' : ''}>
            {label}{k === 'shop' && cartCount > 0 ? ` (${cartCount})` : ''}
          </a>
        ))}
        <a className="cs-staff" href="#/staff">Staff login</a>
      </nav>
    </header>
  );
}

function Home() {
  return (
    <>
      <section className="cs-hero">
        <h1>Everything for school, office & print — in one place</h1>
        <p>Order stationery, get documents printed, and track your order from your phone.</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <a className="btn primary" href="#/shop">Shop stationery</a>
          <a className="btn" href="#/print">Get a print price</a>
        </div>
      </section>
      <section className="cs-cards">
        <a className="cs-card" href="#/shop"><span>🛍️</span><h3>Shop</h3><p>Notebooks, pens, files, calculators and more.</p></a>
        <a className="cs-card" href="#/print"><span>🖨️</span><h3>Print & Copy</h3><p>B&W or colour, A4/A3, binding and lamination with an instant price.</p></a>
        <a className="cs-card" href="#/track"><span>🎫</span><h3>Track your order</h3><p>Enter your order number to see if it is ready.</p></a>
      </section>
      <section className="cs-info">
        <h3>How it works</h3>
        <ol>
          <li>Choose items or enter your print details and place the order.</li>
          <li>You get an order number (print jobs also get a queue token).</li>
          <li>Pay and collect at the counter when your order is ready.</li>
        </ol>
      </section>
    </>
  );
}

function Confirmation({ order, onNew }) {
  return (
    <div className="cs-box cs-done">
      <div style={{ fontSize: '2.4rem' }}>✅</div>
      <h2>Order placed!</h2>
      <p>Your order number is</p>
      <div className="cs-num">{order.number}</div>
      {order.token && <p>Queue token: <strong>{order.token}</strong></p>}
      {order.printJob && order.printJob.fileName && <p>📎 File received: <strong>{order.printJob.fileName}</strong></p>}
      <p>Total <strong>{money(order.total)}</strong> — pay at the counter when you collect.</p>
      <p className="muted small">Save your order number and phone number to track it.</p>
      <div className="row" style={{ justifyContent: 'center' }}>
        <a className="btn primary" href="#/track">Track this order</a>
        <button className="btn" onClick={onNew}>Place another</button>
      </div>
    </div>
  );
}

function Shop({ cart, setCart }) {
  const [items, , error] = useLoad(() => api.get('/shop'));
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [form, setForm] = useState({ customer: '', phone: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  const cats = useMemo(() => ['All', ...new Set((items || []).map((p) => p.category))], [items]);
  const shown = (items || []).filter((p) => (cat === 'All' || p.category === cat) && p.name.toLowerCase().includes(q.toLowerCase()));
  const lines = Object.entries(cart).map(([id, qty]) => ({ p: (items || []).find((x) => x.id === Number(id)), qty })).filter((l) => l.p);
  const total = lines.reduce((s, l) => s + l.p.price * l.qty, 0);
  const change = (p, d) => {
    const qty = Math.max(0, Math.min(p.stock, (cart[p.id] || 0) + d));
    const next = { ...cart };
    if (qty) next[p.id] = qty; else delete next[p.id];
    setCart(next);
  };

  const place = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const o = await api.post('/orders', { type: 'retail', customer: form.customer, phone: form.phone,
        items: lines.map((l) => ({ productId: l.p.id, qty: l.qty })) });
      setDone(o); setCart({});
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };

  if (done) return <Confirmation order={done} onNew={() => setDone(null)} />;
  return (
    <div className="cs-shop">
      <div>
        <div className="row" style={{ marginBottom: 12 }}>
          <input className="grow" placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="tabs" style={{ flexWrap: 'wrap' }}>
          {cats.map((c) => <button key={c} className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>{c}</button>)}
        </div>
        {error && <div className="error">Can't reach the shop right now. Please try again.</div>}
        <div className="cs-products">
          {shown.map((p) => (
            <div className="cs-product" key={p.id}>
              <div className="cs-emoji">📝</div>
              <strong>{p.name}</strong>
              <span className="muted small">{p.category}</span>
              <div className="cs-price">{money(p.price)}</div>
              {!p.inStock ? <span className="badge b-cancelled">Out of stock</span> : cart[p.id] ? (
                <div className="row" style={{ justifyContent: 'center' }}>
                  <button className="btn sm" onClick={() => change(p, -1)}>−</button><strong>{cart[p.id]}</strong>
                  <button className="btn sm" onClick={() => change(p, 1)}>+</button>
                </div>
              ) : <button className="btn primary sm" onClick={() => change(p, 1)}>Add to cart</button>}
            </div>
          ))}
        </div>
        {items && shown.length === 0 && <div className="empty">No products found.</div>}
      </div>

      <form className="cs-box cs-cart" onSubmit={place}>
        <h3>Your cart</h3>
        {lines.length === 0 ? <p className="muted">Your cart is empty.</p> : (
          <>
            {lines.map((l) => <div className="cs-line" key={l.p.id}><span>{l.qty} × {l.p.name}</span><span>{money(l.qty * l.p.price)}</span></div>)}
            <div className="cs-line total"><span>Total</span><span>{money(total)}</span></div>
            <label className="field"><span>Your name</span><input required value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} /></label>
            <label className="field"><span>Phone number</span><input required inputMode="tel" minLength={10} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
            {err && <div className="error">{err}</div>}
            <button className="btn primary" style={{ width: '100%' }} disabled={busy}>Place order</button>
            <p className="muted small">Pay at the counter when you collect.</p>
          </>
        )}
      </form>
    </div>
  );
}

const MAX_MB = 15;
const readBase64 = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1] || '');
  r.onerror = () => reject(new Error('Could not read the file'));
  r.readAsDataURL(file);
});
// Best-effort page count for simple PDFs (customer can always correct it).
async function countPdfPages(file) {
  try {
    const text = new TextDecoder('latin1').decode(await file.arrayBuffer());
    const n = (text.match(/\/Type\s*\/Page(?![a-zA-Z])/g) || []).length;
    return n > 0 ? n : 0;
  } catch { return 0; }
}

function Print() {
  const [job, setJob] = useState({ description: '', pages: '', copies: 1, color: false, size: 'A4', sides: 'single', binding: 'none', laminate: false });
  const [pricing] = useLoad(() => api.get('/pricing'));
  const [quote, setQuote] = useState(null);
  const [form, setForm] = useState({ customer: '', phone: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [file, setFile] = useState(null); // { name, size, data }
  const [fileNote, setFileNote] = useState('');

  const pickFile = async (e) => {
    const f = e.target.files && e.target.files[0];
    setErr(''); setFileNote('');
    if (!f) { setFile(null); return; }
    if (!/\.(pdf|docx?|jpe?g|png)$/i.test(f.name)) { setErr('Please choose a PDF, Word, JPG or PNG file.'); e.target.value = ''; return; }
    if (f.size > MAX_MB * 1024 * 1024) { setErr(`That file is too big. Maximum is ${MAX_MB} MB.`); e.target.value = ''; return; }
    try {
      const data = await readBase64(f);
      setFile({ name: f.name, size: f.size, data });
      if (/\.pdf$/i.test(f.name)) {
        const n = await countPdfPages(f);
        if (n > 0) { setJob((j) => ({ ...j, pages: n, description: j.description || f.name.replace(/\.pdf$/i, '') })); setFileNote(`We found ${n} pages. Please check the number is right.`); }
        else setFileNote('Please enter the number of pages yourself.');
      } else setFileNote('Please enter the number of pages yourself.');
    } catch (x) { setErr(x.message); }
  };

  useEffect(() => {
    let live = true;
    if (Number(job.pages) > 0) api.post('/quote', job).then((q) => live && setQuote(q)).catch(() => {});
    else setQuote(null);
    return () => { live = false; };
  }, [job]);

  const setJ = (k) => (e) => setJob({ ...job, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const place = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const o = await api.post('/orders', { type: 'print', customer: form.customer, phone: form.phone, printJob: { ...job, file: file ? { name: file.name, data: file.data } : undefined } });
      const t = await api.get(`/track?number=${o.number}&phone=${encodeURIComponent(form.phone)}`);
      setDone({ ...o, token: t.token && t.token.number });
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };

  if (done) return <Confirmation order={done} onNew={() => setDone(null)} />;
  return (
    <form className="cs-box cs-print" onSubmit={place}>
      <h2>Print & Copy</h2>
      <p className="muted">Upload your file, check the details and see the price. You can also bring your file to the counter on a pen drive instead.</p>
      <label className="field">
        <span>Upload your file (PDF, Word, JPG or PNG, up to {MAX_MB} MB)</span>
        <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={pickFile} />
      </label>
      {file && <p className="small" style={{ marginTop: -4 }}>📎 {file.name} ({file.size < 1048576 ? Math.max(1, Math.round(file.size / 1024)) + ' KB' : (file.size / 1048576).toFixed(1) + ' MB'}) {fileNote && <span className="muted">· {fileNote}</span>}</p>}
      {!file && fileNote && <p className="muted small">{fileNote}</p>}
      <label className="field"><span>What do you need printed?</span><input value={job.description} onChange={setJ('description')} placeholder="e.g. Project report" /></label>
      <div className="form-grid">
        <label className="field"><span>Pages</span><input type="number" min="1" required value={job.pages} onChange={setJ('pages')} /></label>
        <label className="field"><span>Copies</span><input type="number" min="1" value={job.copies} onChange={setJ('copies')} /></label>
        <label className="field"><span>Paper size</span><select value={job.size} onChange={setJ('size')}><option>A4</option><option>A3</option></select></label>
        <label className="field"><span>Sides</span><select value={job.sides} onChange={setJ('sides')}><option value="single">Single-sided</option><option value="double">Double-sided</option></select></label>
        <label className="field"><span>Binding</span><select value={job.binding} onChange={setJ('binding')}>{Object.keys((pricing && pricing.binding) || { none: 0 }).map((b) => <option key={b} value={b}>{b}</option>)}</select></label>
      </div>
      <div className="row" style={{ marginBottom: 12 }}>
        <label className="row"><input type="checkbox" checked={job.color} onChange={setJ('color')} /> Colour</label>
        <label className="row"><input type="checkbox" checked={job.laminate} onChange={setJ('laminate')} /> Lamination</label>
      </div>
      {quote ? (
        <div className="quote">
          <div><span>{quote.sheets} sheets × {money(quote.rate)}</span><span>{money(quote.printing)}</span></div>
          {quote.discount > 0 && <div><span>Bulk discount</span><span>−{money(quote.discount)}</span></div>}
          {quote.binding > 0 && <div><span>Binding</span><span>{money(quote.binding)}</span></div>}
          {quote.lamination > 0 && <div><span>Lamination</span><span>{money(quote.lamination)}</span></div>}
          <div className="total"><span>Total</span><span>{money(quote.total)}</span></div>
        </div>
      ) : <p className="muted">Enter the number of pages to see the price.</p>}
      {quote && (
        <>
          <div className="form-grid" style={{ marginTop: 14 }}>
            <label className="field"><span>Your name</span><input required value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} /></label>
            <label className="field"><span>Phone number</span><input required inputMode="tel" minLength={10} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          </div>
          {err && <div className="error">{err}</div>}
          <button className="btn primary" disabled={busy}>Place print order</button>
        </>
      )}
    </form>
  );
}

function Track() {
  const [number, setNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');
  const STEPS = ['pending', 'processing', 'ready', 'completed'];
  const MSG = { pending: 'We have received your order.', processing: 'We are working on your order.', ready: 'Your order is ready — please collect it at the counter!', completed: 'Collected. Thank you!', cancelled: 'This order was cancelled.' };

  const look = async (e) => {
    e.preventDefault(); setErr(''); setRes(null);
    try { setRes(await api.get(`/track?number=${encodeURIComponent(number)}&phone=${encodeURIComponent(phone)}`)); }
    catch (x) { setErr(x.message); }
  };
  return (
    <div className="cs-box cs-track">
      <h2>Track your order</h2>
      <form onSubmit={look}>
        <label className="field"><span>Order number</span><input required value={number} onChange={(e) => setNumber(e.target.value)} placeholder="ORD-0001" /></label>
        <label className="field"><span>Phone number used for the order</span><input required inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
        <button className="btn primary">Check status</button>
      </form>
      {err && <div className="error" style={{ marginTop: 12 }}>{err}</div>}
      {res && (
        <div style={{ marginTop: 16 }}>
          <h3>{res.number} · {res.summary}</h3>
          {res.status === 'cancelled' ? <div className="error">{MSG.cancelled}</div> : (
            <div className="cs-steps">{STEPS.map((s, i) => (
              <div key={s} className={i <= STEPS.indexOf(res.status) ? 'on' : ''}><span>{i + 1}</span>{s}</div>
            ))}</div>
          )}
          <p><strong>{MSG[res.status]}</strong></p>
          {res.token && res.token.status === 'waiting' && <p>Your token <strong>{res.token.number}</strong> — {res.token.ahead} {res.token.ahead === 1 ? 'person' : 'people'} ahead of you.</p>}
          {res.token && res.token.status === 'serving' && <p>Token <strong>{res.token.number}</strong> is being served now.</p>}
          <p className="muted">Total {money(res.total)} · Paid {money(res.paid)} · {res.paymentStatus}</p>
        </div>
      )}
    </div>
  );
}

export default function CustomerSite({ page }) {
  const [cart, setCart] = useState({});
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  return (
    <div className="cs">
      <Header page={page} cartCount={cartCount} />
      <main className="cs-main">
        {page === 'home' && <Home />}
        {page === 'shop' && <Shop cart={cart} setCart={setCart} />}
        {page === 'print' && <Print />}
        {page === 'track' && <Track />}
      </main>
      <footer className="cs-footer">© StationeryHub · <a href="#/staff">Staff login</a> · <a href="#/display" target="_blank" rel="noreferrer">Queue display</a></footer>
    </div>
  );
}
