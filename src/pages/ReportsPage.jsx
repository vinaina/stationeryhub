import React from 'react';
import { api, money } from '../api.js';
import { useLoad } from '../hooks.js';
import { Page, Card, Stat, BarChart, Empty } from '../components.jsx';

function downloadCsv(name, rows) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function ReportsPage() {
  const [s, , error] = useLoad(() => api.get('/reports/summary'), 15000);
  const [orders] = useLoad(() => api.get('/orders'));
  if (error) return <Page title="Reports"><div className="error">{error}</div></Page>;
  if (!s) return <Page title="Reports"><Empty>Loading…</Empty></Page>;

  const exportOrders = () => downloadCsv('orders.csv', [
    ['Order', 'Date', 'Customer', 'Type', 'Total', 'Paid', 'Payment', 'Status'],
    ...(orders || []).map((o) => [o.number, o.createdAt, o.customer, o.type, o.total, o.paid, o.paymentStatus, o.status]),
  ]);
  const methodTotal = Object.values(s.byMethod).reduce((a, b) => a + b, 0);

  return (
    <Page title="Reports" subtitle="All-time numbers and the last 7 days"
      actions={<button className="btn" onClick={exportOrders} disabled={!orders}>⬇ Export orders (CSV)</button>}>
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Stat label="Total sales" value={money(s.totals.sales)} hint={`${s.totals.orders} orders`} />
        <Stat label="Money collected" value={money(s.totals.collected)} tone="ok" />
        <Stat label="Outstanding" value={money(s.totals.outstanding)} tone={s.totals.outstanding ? 'warn' : ''} />
        <Stat label="Stock value (cost)" value={money(s.inventoryValue)} />
      </div>

      <div className="grid g2">
        <Card title="Orders per day">
          <BarChart data={s.salesByDay} valueKey="orders" labelKey="date" />
        </Card>
        <Card title="Sales per day">
          <BarChart data={s.salesByDay} valueKey="sales" labelKey="date" format={(v) => (v ? '₹' + Math.round(v) : '0')} />
        </Card>

        <Card title="Payments by method">
          {methodTotal === 0 ? <Empty>No payments yet</Empty> : (
            <table><tbody>{Object.entries(s.byMethod).map(([m, v]) => (
              <tr key={m}><td style={{ textTransform: 'capitalize' }}>{m}</td>
                <td style={{ width: '50%' }}><div style={{ background: '#3b5bdb', height: 10, borderRadius: 5, width: `${(v / methodTotal) * 100}%` }} /></td>
                <td className="right">{money(v)}</td></tr>
            ))}</tbody></table>
          )}
        </Card>

        <Card title="Best sellers">
          {s.topProducts.length === 0 ? <Empty>No item sales yet</Empty> : (
            <table>
              <thead><tr><th>Product</th><th className="right">Sold</th><th className="right">Revenue</th></tr></thead>
              <tbody>{s.topProducts.map((p) => <tr key={p.name}><td>{p.name}</td><td className="right">{p.qty}</td><td className="right">{money(p.revenue)}</td></tr>)}</tbody>
            </table>
          )}
        </Card>

        <Card title="Print desk summary">
          <table><tbody>
            <tr><td>Print jobs</td><td className="right">{s.printStats.jobs}</td></tr>
            <tr><td>Sheets printed</td><td className="right">{s.printStats.sheets.toLocaleString('en-IN')}</td></tr>
            <tr><td>Colour jobs</td><td className="right">{s.printStats.colorJobs}</td></tr>
            <tr><td>Print revenue</td><td className="right">{money(s.printStats.revenue)}</td></tr>
          </tbody></table>
        </Card>

        <Card title="Needs restocking">
          {s.lowStock.length === 0 ? <Empty>All stocked up ✅</Empty> : (
            <table><tbody>{s.lowStock.map((p) => <tr key={p.id}><td>{p.name}</td><td className="right low">{p.stock} left</td></tr>)}</tbody></table>
          )}
        </Card>
      </div>
    </Page>
  );
}
