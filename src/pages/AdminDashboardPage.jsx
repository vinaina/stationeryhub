import React from 'react';
import { api, money } from '../api.js';
import { useLoad } from '../hooks.js';
import { Page, Card, Stat, BarChart, Empty } from '../components.jsx';

export default function AdminDashboardPage({ user }) {
  const [s, , error] = useLoad(() => api.get('/reports/summary'), 10000);
  if (error) return <Page title="Dashboard"><div className="error">{error} — is the server running on port 4000?</div></Page>;
  if (!s) return <Page title="Dashboard"><Empty>Loading…</Empty></Page>;

  return (
    <Page title={`Hello, ${user.name.split(' ')[0]} 👋`} subtitle="Here's how the shop is doing today">
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Stat label="Today's sales" value={money(s.today.sales)} hint={`${s.today.orders} orders`} />
        <Stat label="Collected today" value={money(s.today.collected)} tone="ok" />
        <Stat label="Outstanding dues" value={money(s.totals.outstanding)} tone={s.totals.outstanding ? 'warn' : ''} />
        <Stat label="In queue" value={s.queue.waiting} hint={`${s.queue.serving} being served`} />
      </div>

      <div className="grid g2">
        <Card title="Sales — last 7 days">
          <BarChart data={s.salesByDay} valueKey="sales" labelKey="date" format={(v) => (v ? '₹' + Math.round(v) : '0')} />
        </Card>

        <Card title="Low stock alerts" right={<a href="#/inventory">Manage →</a>}>
          {s.lowStock.length === 0 ? <Empty>Everything is well stocked ✅</Empty> : (
            <table>
              <thead><tr><th>Item</th><th className="right">In stock</th><th className="right">Reorder at</th></tr></thead>
              <tbody>
                {s.lowStock.map((p) => (
                  <tr key={p.id}><td>{p.name}</td><td className="right low">{p.stock}</td><td className="right">{p.reorderLevel}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Top products">
          {s.topProducts.length === 0 ? <Empty>No sales yet</Empty> : (
            <table>
              <thead><tr><th>Product</th><th className="right">Qty</th><th className="right">Revenue</th></tr></thead>
              <tbody>{s.topProducts.map((p) => (
                <tr key={p.name}><td>{p.name}</td><td className="right">{p.qty}</td><td className="right">{money(p.revenue)}</td></tr>
              ))}</tbody>
            </table>
          )}
        </Card>

        <Card title="Print desk">
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <Stat label="Print jobs" value={s.printStats.jobs} />
            <Stat label="Sheets printed" value={s.printStats.sheets.toLocaleString('en-IN')} />
            <Stat label="Print revenue" value={money(s.printStats.revenue)} />
            <Stat label="Colour jobs" value={s.printStats.colorJobs} />
          </div>
        </Card>
      </div>
    </Page>
  );
}
