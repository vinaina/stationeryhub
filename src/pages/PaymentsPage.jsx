import React, { useMemo, useState } from 'react';
import { api, money, timeOf, dateOf } from '../api.js';
import { useLoad, useToast } from '../hooks.js';
import { Page, Card, Modal, Field, Badge, Empty, Toast, Stat } from '../components.jsx';

export default function PaymentsPage() {
  const [payments, reloadP, error] = useLoad(() => api.get('/payments'), 10000);
  const [orders, reloadO] = useLoad(() => api.get('/orders'), 10000);
  const [toast, show] = useToast();
  const [paying, setPaying] = useState(null); // { order, amount, method }

  const dues = useMemo(() => (orders || []).filter((o) => o.status !== 'cancelled' && o.total - o.paid > 0.001), [orders]);
  const today = new Date().toISOString().slice(0, 10);
  const todayTotal = (payments || []).filter((p) => p.createdAt.slice(0, 10) === today).reduce((s, p) => s + p.amount, 0);
  const outstanding = dues.reduce((s, o) => s + (o.total - o.paid), 0);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/payments', { orderId: paying.order.id, amount: Number(paying.amount), method: paying.method });
      show('Payment recorded'); setPaying(null); reloadP(); reloadO();
    } catch (err) { show(err.message, 'err'); }
  };

  return (
    <Page title="Payments" subtitle="Collect balances and review every payment received">
      {error && <div className="error">{error}</div>}
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Stat label="Collected today" value={money(todayTotal)} tone="ok" />
        <Stat label="Total outstanding" value={money(outstanding)} tone={outstanding ? 'warn' : ''} />
        <Stat label="Unpaid orders" value={dues.length} />
      </div>

      <div className="grid g2">
        <Card title="Balances due">
          {dues.length === 0 ? <Empty>No pending balances 🎉</Empty> : (
            <table>
              <thead><tr><th>Order</th><th>Customer</th><th className="right">Due</th><th /></tr></thead>
              <tbody>{dues.map((o) => (
                <tr key={o.id}><td>{o.number}</td><td>{o.customer}</td>
                  <td className="right">{money(o.total - o.paid)}</td>
                  <td className="right"><button className="btn sm primary" onClick={() => setPaying({ order: o, amount: (o.total - o.paid).toFixed(2), method: 'cash' })}>Collect</button></td></tr>
              ))}</tbody>
            </table>
          )}
        </Card>

        <Card title="Recent payments">
          {!payments || payments.length === 0 ? <Empty>No payments yet</Empty> : (
            <div className="scroll"><table>
              <thead><tr><th>When</th><th>Order</th><th>Method</th><th className="right">Amount</th></tr></thead>
              <tbody>{payments.slice(0, 30).map((p) => (
                <tr key={p.id}><td className="muted">{dateOf(p.createdAt)} {timeOf(p.createdAt)}</td><td>{p.orderNumber}</td>
                  <td><Badge value={p.method} /></td><td className="right">{money(p.amount)}</td></tr>
              ))}</tbody>
            </table></div>
          )}
        </Card>
      </div>

      {paying && (
        <Modal title={`Collect payment — ${paying.order.number}`} onClose={() => setPaying(null)}>
          <form onSubmit={submit}>
            <p className="muted">{paying.order.customer} · Total {money(paying.order.total)} · Balance {money(paying.order.total - paying.order.paid)}</p>
            <div className="form-grid">
              <Field label="Amount (₹)"><input type="number" step="0.01" min="0.01" required autoFocus value={paying.amount} onChange={(e) => setPaying({ ...paying, amount: e.target.value })} /></Field>
              <Field label="Method"><select value={paying.method} onChange={(e) => setPaying({ ...paying, method: e.target.value })}><option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option></select></Field>
            </div>
            <button className="btn primary">Record payment</button>
          </form>
        </Modal>
      )}
      <Toast toast={toast} />
    </Page>
  );
}
