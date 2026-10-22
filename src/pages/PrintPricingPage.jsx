import React, { useEffect, useState } from 'react';
import { api, money } from '../api.js';
import { useLoad, useToast } from '../hooks.js';
import { Page, Card, Field, Toast } from '../components.jsx';

const num = (v) => (v === '' ? '' : Number(v));

export default function PrintPricingPage({ user }) {
  const [saved, reload, error] = useLoad(() => api.get('/pricing'));
  const [p, setP] = useState(null);
  const [toast, show] = useToast();
  const [calc, setCalc] = useState({ pages: 20, copies: 1, color: false, size: 'A4', sides: 'single', binding: 'none', laminate: false });
  const [quote, setQuote] = useState(null);
  const canEdit = user.role === 'admin';

  useEffect(() => { if (saved) setP(JSON.parse(JSON.stringify(saved))); }, [saved]);
  useEffect(() => {
    let live = true;
    if (Number(calc.pages) > 0) api.post('/quote', calc).then((q) => live && setQuote(q)).catch(() => {});
    else setQuote(null);
    return () => { live = false; };
  }, [calc, saved]);

  if (!p) return <Page title="Print Pricing">{error ? <div className="error">{error}</div> : 'Loading…'}</Page>;

  const setRate = (mode, size, side, v) => setP({ ...p, perPage: { ...p.perPage, [mode]: { ...p.perPage[mode], [size]: { ...p.perPage[mode][size], [side]: num(v) } } } });
  const setMap = (group, key, v) => setP({ ...p, [group]: { ...p[group], [key]: num(v) } });
  const setTier = (i, k, v) => setP({ ...p, bulkDiscount: p.bulkDiscount.map((t, j) => (j === i ? { ...t, [k]: num(v) } : t)) });

  const save = async () => {
    try { await api.put('/pricing', p); show('Prices saved'); reload(); } catch (e) { show(e.message, 'err'); }
  };
  const Rate = ({ mode, size, side }) => (
    <input type="number" min="0" step="0.25" disabled={!canEdit} value={p.perPage[mode][size][side]} onChange={(e) => setRate(mode, size, side, e.target.value)} />
  );
  const setC = (k) => (e) => setCalc({ ...calc, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  return (
    <Page title="Print Pricing" subtitle={canEdit ? 'Set your per-page rates, binding and bulk discounts' : 'Current rates (only admins can change them)'}
      actions={canEdit && <button className="btn primary" onClick={save}>Save prices</button>}>
      <div className="grid g2">
        <div>
          <Card title="Per-page rates (₹)">
            <table>
              <thead><tr><th>Type</th><th>Size</th><th>Single-sided</th><th>Double-sided</th></tr></thead>
              <tbody>
                {['bw', 'color'].flatMap((mode) => ['A4', 'A3'].map((size) => (
                  <tr key={mode + size}>
                    <td>{mode === 'bw' ? 'Black & white' : 'Colour'}</td><td>{size}</td>
                    <td><Rate mode={mode} size={size} side="single" /></td><td><Rate mode={mode} size={size} side="double" /></td>
                  </tr>
                )))}
              </tbody>
            </table>
          </Card>

          <Card title="Binding & lamination (₹ per copy)">
            <div className="form-grid">
              {Object.keys(p.binding).map((k) => (
                <Field key={k} label={`${k[0].toUpperCase() + k.slice(1)} binding`}>
                  <input type="number" min="0" disabled={!canEdit} value={p.binding[k]} onChange={(e) => setMap('binding', k, e.target.value)} />
                </Field>
              ))}
              {['A4', 'A3'].map((k) => (
                <Field key={k} label={`Lamination ${k}`}>
                  <input type="number" min="0" disabled={!canEdit} value={p.lamination[k]} onChange={(e) => setMap('lamination', k, e.target.value)} />
                </Field>
              ))}
            </div>
          </Card>

          <Card title="Bulk discount">
            <table>
              <thead><tr><th>Sheets from</th><th>Discount %</th></tr></thead>
              <tbody>{p.bulkDiscount.map((t, i) => (
                <tr key={i}>
                  <td><input type="number" min="1" disabled={!canEdit} value={t.minPages} onChange={(e) => setTier(i, 'minPages', e.target.value)} /></td>
                  <td><input type="number" min="0" max="100" disabled={!canEdit} value={t.percent} onChange={(e) => setTier(i, 'percent', e.target.value)} /></td>
                </tr>
              ))}</tbody>
            </table>
            <p className="muted small">Sheets = pages × copies. Applies to the printing charge only. Save before testing the calculator.</p>
          </Card>
        </div>

        <Card title="Quick price calculator">
          <div className="form-grid">
            <Field label="Pages"><input type="number" min="1" value={calc.pages} onChange={setC('pages')} /></Field>
            <Field label="Copies"><input type="number" min="1" value={calc.copies} onChange={setC('copies')} /></Field>
            <Field label="Size"><select value={calc.size} onChange={setC('size')}><option>A4</option><option>A3</option></select></Field>
            <Field label="Sides"><select value={calc.sides} onChange={setC('sides')}><option value="single">Single</option><option value="double">Double</option></select></Field>
            <Field label="Binding"><select value={calc.binding} onChange={setC('binding')}>{Object.keys(p.binding).map((b) => <option key={b}>{b}</option>)}</select></Field>
          </div>
          <div className="row" style={{ marginBottom: 12 }}>
            <label className="row"><input type="checkbox" checked={calc.color} onChange={setC('color')} /> Colour</label>
            <label className="row"><input type="checkbox" checked={calc.laminate} onChange={setC('laminate')} /> Laminate</label>
          </div>
          {quote ? (
            <div className="quote">
              <div><span>{quote.sheets} sheets × {money(quote.rate)}</span><span>{money(quote.printing)}</span></div>
              {quote.discount > 0 && <div><span>Bulk discount</span><span>−{money(quote.discount)}</span></div>}
              {quote.binding > 0 && <div><span>Binding</span><span>{money(quote.binding)}</span></div>}
              {quote.lamination > 0 && <div><span>Lamination</span><span>{money(quote.lamination)}</span></div>}
              <div className="total"><span>Total</span><span>{money(quote.total)}</span></div>
            </div>
          ) : <p className="muted">Enter the number of pages to see a price.</p>}
        </Card>
      </div>
      <Toast toast={toast} />
    </Page>
  );
}
