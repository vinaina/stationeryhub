import React, { useMemo, useState } from 'react';
import { api, money } from '../api.js';
import { useLoad, useToast } from '../hooks.js';
import { Page, Card, Modal, Field, Empty, Toast, Stat } from '../components.jsx';

const BLANK = { name: '', sku: '', category: '', price: '', cost: '', stock: '', reorderLevel: '' };

export default function InventoryPage() {
  const [products, reload, error] = useLoad(() => api.get('/products'));
  const [toast, show] = useToast();
  const [q, setQ] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [editing, setEditing] = useState(null); // product object or BLANK
  const [restock, setRestock] = useState(null);

  const rows = useMemo(() => (products || []).filter((p) =>
    (!lowOnly || p.stock <= p.reorderLevel) &&
    `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(q.toLowerCase())), [products, q, lowOnly]);

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing.id) await api.put(`/products/${editing.id}`, editing);
      else await api.post('/products', editing);
      setEditing(null); show('Product saved'); reload();
    } catch (err) { show(err.message, 'err'); }
  };
  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.name}"?`)) return;
    try { await api.del(`/products/${p.id}`); show('Product deleted'); reload(); } catch (err) { show(err.message, 'err'); }
  };
  const addStock = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/products/${restock.p.id}`, { stock: restock.p.stock + Number(restock.qty) });
      setRestock(null); show('Stock updated'); reload();
    } catch (err) { show(err.message, 'err'); }
  };

  const list = products || [];
  const low = list.filter((p) => p.stock <= p.reorderLevel).length;
  const value = list.reduce((s, p) => s + p.stock * p.cost, 0);
  const set = (k) => (e) => setEditing({ ...editing, [k]: e.target.value });

  return (
    <Page title="Inventory" subtitle="Everything you sell, and how much is left"
      actions={<button className="btn primary" onClick={() => setEditing({ ...BLANK })}>+ Add product</button>}>
      {error && <div className="error">{error}</div>}
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Stat label="Products" value={list.length} />
        <Stat label="Low stock" value={low} tone={low ? 'bad' : 'ok'} />
        <Stat label="Stock value (at cost)" value={money(value)} />
      </div>

      <Card>
        <div className="row" style={{ marginBottom: 12 }}>
          <input className="grow" placeholder="Search name, SKU or category…" value={q} onChange={(e) => setQ(e.target.value)} />
          <label className="row small"><input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} /> Low stock only</label>
        </div>
        <div className="scroll">
          <table>
            <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th className="right">Price</th><th className="right">Cost</th><th className="right">Stock</th><th /></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td><td className="muted">{p.sku}</td><td>{p.category}</td>
                  <td className="right">{money(p.price)}</td><td className="right">{money(p.cost)}</td>
                  <td className={`right ${p.stock <= p.reorderLevel ? 'low' : ''}`}>{p.stock}{p.stock <= p.reorderLevel && ' ⚠'}</td>
                  <td className="right">
                    <div className="row" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn sm" onClick={() => setRestock({ p, qty: '' })}>+ Stock</button>
                      <button className="btn sm" onClick={() => setEditing(p)}>Edit</button>
                      <button className="btn sm danger" onClick={() => remove(p)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products && rows.length === 0 && <Empty>No products match.</Empty>}
        </div>
      </Card>

      {editing && (
        <Modal title={editing.id ? 'Edit product' : 'Add product'} onClose={() => setEditing(null)}>
          <form onSubmit={save}>
            <Field label="Name"><input required value={editing.name} onChange={set('name')} /></Field>
            <div className="form-grid">
              <Field label="SKU"><input value={editing.sku} onChange={set('sku')} /></Field>
              <Field label="Category"><input value={editing.category} onChange={set('category')} /></Field>
              <Field label="Selling price (₹)"><input type="number" min="0" step="0.01" required value={editing.price} onChange={set('price')} /></Field>
              <Field label="Cost price (₹)"><input type="number" min="0" step="0.01" value={editing.cost} onChange={set('cost')} /></Field>
              <Field label="Stock"><input type="number" min="0" value={editing.stock} onChange={set('stock')} /></Field>
              <Field label="Reorder level"><input type="number" min="0" value={editing.reorderLevel} onChange={set('reorderLevel')} /></Field>
            </div>
            <button className="btn primary">Save</button>
          </form>
        </Modal>
      )}

      {restock && (
        <Modal title={`Add stock — ${restock.p.name}`} onClose={() => setRestock(null)}>
          <form onSubmit={addStock}>
            <p className="muted">Currently {restock.p.stock} in stock.</p>
            <Field label="Quantity received"><input type="number" min="1" required autoFocus value={restock.qty} onChange={(e) => setRestock({ ...restock, qty: e.target.value })} /></Field>
            <button className="btn primary">Add to stock</button>
          </form>
        </Modal>
      )}
      <Toast toast={toast} />
    </Page>
  );
}
