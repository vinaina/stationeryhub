import React, { useEffect, useMemo, useState } from 'react';
import { api, money, timeOf, dateOf, fileUrl } from '../api.js';
import { useLoad, useToast } from '../hooks.js';
import { Page, Card, Modal, Field, Badge, Empty, Toast } from '../components.jsx';

const STATUSES = ['all', 'pending', 'processing', 'ready', 'completed', 'cancelled'];
const NEXT = { pending: 'processing', processing: 'ready', ready: 'completed' };

const BLANK_JOB = { description: '', pages: '', copies: 1, color: false, size: 'A4', sides: 'single', binding: 'none', laminate: false };

function NewOrder({ onClose, onDone, notify }) {
  const [type, setType] = useState('retail');
  const [customer, setCustomer] = useState('');
  const [phone, setPhone] = useState('');
  const [products] = useLoad(() => api.get('/products'));
  const [pricing] = useLoad(() => api.get('/pricing'));
  const [cart, setCart] = useState([{ productId: '', qty: 1 }]);
  const [job, setJob] = useState(BLANK_JOB);
  const [quote, setQuote] = useState(null);
  const [advance, setAdvance] = useState('');
  const [method, setMethod] = useState('cash');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (type !== 'print' || !(Number(job.pages) > 0)) { setQuote(null); return; }
    let live = true;
    api.post('/quote', job).then((q) => live && setQuote(q)).catch(() => {});
    return () => { live = false; };
  }, [type, job]);

  const retailTotal = cart.reduce((s, l) => {
    const p = (products || []).find((x) => x.id === Number(l.productId));
    return s + (p ? p.price * (Number(l.qty) || 0) : 0);
  }, 0);
  const total = type === 'retail' ? retailTotal : quote ? quote.total : 0;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { type, customer, phone, advance: Number(advance) || 0, method };
      if (type === 'retail') body.items = cart.filter((l) => l.productId).map((l) => ({ productId: Number(l.productId), qty: Number(l.qty) }));
      else body.printJob = job;
      const o = await api.post('/orders', body);
      notify(`Order ${o.number} created`);
      onDone();
    } catch (err) { notify(err.message, 'err'); } finally { setBusy(false); }
  };
  const setJ = (k) => (e) => setJob({ ...job, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  return (
    <Modal title="New order" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="tabs">
          <button type="button" className={type === 'retail' ? 'on' : ''} onClick={() => setType('retail')}>🛍️ Items</button>
          <button type="button" className={type === 'print' ? 'on' : ''} onClick={() => setType('print')}>🖨️ Print job</button>
        </div>
        <div className="form-grid">
          <Field label="Customer name"><input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Walk-in" /></Field>
          <Field label="Phone (optional)"><input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        </div>

        {type === 'retail' ? (
          <>
            {cart.map((l, i) => {
              const p = (products || []).find((x) => x.id === Number(l.productId));
              return (
                <div className="cart-line" key={i}>
                  <select value={l.productId} onChange={(e) => setCart(cart.map((x, j) => (j === i ? { ...x, productId: e.target.value } : x)))}>
                    <option value="">Choose item…</option>
                    {(products || []).map((pr) => <option key={pr.id} value={pr.id} disabled={pr.stock < 1}>{pr.name} — {money(pr.price)} ({pr.stock} left)</option>)}
                  </select>
                  <input type="number" min="1" max={p ? p.stock : undefined} value={l.qty} onChange={(e) => setCart(cart.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))} />
                  <span className="right">{p ? money(p.price * (Number(l.qty) || 0)) : '—'}</span>
                  <button type="button" className="btn ghost sm" onClick={() => setCart(cart.length > 1 ? cart.filter((_, j) => j !== i) : cart)}>✕</button>
                </div>
              );
            })}
            <button type="button" className="btn sm" onClick={() => setCart([...cart, { productId: '', qty: 1 }])}>+ Add another item</button>
          </>
        ) : (
          <>
            <Field label="What is being printed?"><input value={job.description} onChange={setJ('description')} placeholder="e.g. Project report, 2 sets" /></Field>
            <div className="form-grid">
              <Field label="Pages"><input type="number" min="1" required value={job.pages} onChange={setJ('pages')} /></Field>
              <Field label="Copies"><input type="number" min="1" value={job.copies} onChange={setJ('copies')} /></Field>
              <Field label="Paper size"><select value={job.size} onChange={setJ('size')}><option>A4</option><option>A3</option></select></Field>
              <Field label="Sides"><select value={job.sides} onChange={setJ('sides')}><option value="single">Single-sided</option><option value="double">Double-sided</option></select></Field>
              <Field label="Binding">
                <select value={job.binding} onChange={setJ('binding')}>
                  {Object.keys((pricing && pricing.binding) || { none: 0 }).map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </Field>
            </div>
            <div className="row" style={{ marginBottom: 12 }}>
              <label className="row"><input type="checkbox" checked={job.color} onChange={setJ('color')} /> Colour print</label>
              <label className="row"><input type="checkbox" checked={job.laminate} onChange={setJ('laminate')} /> Lamination</label>
            </div>
            {quote && (
              <div className="quote">
                <div><span>{quote.sheets} sheets × {money(quote.rate)}</span><span>{money(quote.printing)}</span></div>
                {quote.discount > 0 && <div><span>Bulk discount</span><span>−{money(quote.discount)}</span></div>}
                {quote.binding > 0 && <div><span>Binding</span><span>{money(quote.binding)}</span></div>}
                {quote.lamination > 0 && <div><span>Lamination</span><span>{money(quote.lamination)}</span></div>}
              </div>
            )}
            <p className="muted small">A queue token is created automatically for print jobs.</p>
          </>
        )}

        <div className="row" style={{ marginTop: 14, justifyContent: 'space-between' }}>
          <strong style={{ fontSize: '1.2rem' }}>Total: {money(total)}</strong>
          <div className="row">
            <input style={{ width: 120 }} type="number" min="0" max={total} placeholder="Paid now ₹" value={advance} onChange={(e) => setAdvance(e.target.value)} />
            <select style={{ width: 90 }} value={method} onChange={(e) => setMethod(e.target.value)}><option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option></select>
            <button className="btn primary" disabled={busy || total <= 0}>Create order</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default function OrderManagementPage() {
  const [orders, reload, error] = useLoad(() => api.get('/orders'), 8000);
  const [toast, show] = useToast();
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState(null);

  const rows = useMemo(() => (orders || []).filter((o) =>
    (status === 'all' || o.status === status) &&
    `${o.number} ${o.customer} ${o.phone}`.toLowerCase().includes(q.toLowerCase())), [orders, status, q]);

  const setOrderStatus = async (o, next) => {
    try { await api.patch(`/orders/${o.id}`, { status: next }); show(`${o.number} → ${next}`); reload(); setDetail(null); }
    catch (err) { show(err.message, 'err'); }
  };

  return (
    <Page title="Orders" subtitle="Shop sales and print jobs in one place"
      actions={<button className="btn primary" onClick={() => setCreating(true)}>+ New order</button>}>
      {error && <div className="error">{error}</div>}
      <Card>
        <div className="row" style={{ marginBottom: 12 }}>
          <div className="tabs" style={{ margin: 0 }}>
            {STATUSES.map((s) => <button key={s} className={status === s ? 'on' : ''} onClick={() => setStatus(s)}>{s}</button>)}
          </div>
          <input className="grow" style={{ minWidth: 160 }} placeholder="Search order, customer, phone…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="scroll">
          <table>
            <thead><tr><th>Order</th><th>Customer</th><th>Type</th><th>When</th><th className="right">Total</th><th>Payment</th><th>Status</th><th /></tr></thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <td><button className="btn ghost sm" onClick={() => setDetail(o)}><strong>{o.number}</strong></button></td>
                  <td>{o.customer}</td>
                  <td>{o.type === 'print' ? '🖨️ Print' : '🛍️ Items'}{o.printJob && o.printJob.fileKey && <a href={fileUrl(o.printJob.fileKey)} target="_blank" rel="noreferrer" title={o.printJob.fileName}> 📎</a>}</td>
                  <td className="muted">{dateOf(o.createdAt)} {timeOf(o.createdAt)}</td>
                  <td className="right">{money(o.total)}</td>
                  <td><Badge value={o.paymentStatus} /></td>
                  <td><Badge value={o.status} /></td>
                  <td className="right">
                    <div className="row" style={{ justifyContent: 'flex-end' }}>
                      {NEXT[o.status] && <button className="btn sm primary" onClick={() => setOrderStatus(o, NEXT[o.status])}>Mark {NEXT[o.status]}</button>}
                      {!['completed', 'cancelled'].includes(o.status) && <button className="btn sm danger" onClick={() => window.confirm(`Cancel ${o.number}?`) && setOrderStatus(o, 'cancelled')}>Cancel</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders && rows.length === 0 && <Empty>No orders found. Create one with “+ New order”.</Empty>}
        </div>
      </Card>

      {creating && <NewOrder onClose={() => setCreating(false)} notify={show} onDone={() => { setCreating(false); reload(); }} />}

      {detail && (
        <Modal title={`${detail.number} — ${detail.customer}`} onClose={() => setDetail(null)}>
          <div className="row" style={{ marginBottom: 10 }}><Badge value={detail.status} /><Badge value={detail.paymentStatus} /></div>
          {detail.type === 'retail' ? (
            <table>
              <thead><tr><th>Item</th><th className="right">Qty</th><th className="right">Price</th><th className="right">Amount</th></tr></thead>
              <tbody>{detail.items.map((i, k) => <tr key={k}><td>{i.name}</td><td className="right">{i.qty}</td><td className="right">{money(i.price)}</td><td className="right">{money(i.qty * i.price)}</td></tr>)}</tbody>
            </table>
          ) : (
            <p>{detail.printJob.description || 'Print job'}: {detail.printJob.pages} pages × {detail.printJob.copies} copies,{' '}
              {detail.printJob.color ? 'colour' : 'B&W'}, {detail.printJob.size}, {detail.printJob.sides}-sided
              {detail.printJob.binding !== 'none' && `, ${detail.printJob.binding} binding`}{detail.printJob.laminate && ', laminated'}.</p>
          )}
          {detail.printJob && detail.printJob.fileKey && (
            <p><a className="btn" href={fileUrl(detail.printJob.fileKey)} target="_blank" rel="noreferrer">📎 Open customer file — {detail.printJob.fileName}</a></p>
          )}
          <p><strong>Total {money(detail.total)}</strong> · Paid {money(detail.paid)} · Due {money(Math.max(0, detail.total - detail.paid))}</p>
          <div className="row">
            {NEXT[detail.status] && <button className="btn primary" onClick={() => setOrderStatus(detail, NEXT[detail.status])}>Mark {NEXT[detail.status]}</button>}
            <button className="btn" onClick={() => window.print()}>🖨️ Print</button>
          </div>
        </Modal>
      )}
      <Toast toast={toast} />
    </Page>
  );
}
