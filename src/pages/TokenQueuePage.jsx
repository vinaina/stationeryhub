import React from 'react';
import { api, timeOf } from '../api.js';
import { useLoad, useToast } from '../hooks.js';
import { Page, Card, Badge, Empty, Toast } from '../components.jsx';

export default function TokenQueuePage() {
  const [tokens, reload, error] = useLoad(() => api.get('/tokens'), 3000);
  const [toast, show] = useToast();

  const list = tokens || [];
  const serving = list.find((t) => t.status === 'serving');
  const waiting = list.filter((t) => t.status === 'waiting');
  const finished = list.filter((t) => ['done', 'skipped'].includes(t.status)).reverse();

  const callNext = async () => {
    try {
      const r = await api.post('/tokens/call-next');
      show(r.token ? `Now serving ${r.token.number}` : 'No one is waiting');
      reload();
    } catch (e) { show(e.message, 'err'); }
  };
  const setStatus = async (t, status) => {
    try { await api.patch(`/tokens/${t.id}`, { status }); reload(); } catch (e) { show(e.message, 'err'); }
  };

  return (
    <Page title="Token Queue" subtitle="Print jobs get a token automatically. Customers see progress on the display board."
      actions={<><a className="btn" href="#/display" target="_blank" rel="noreferrer">📺 Open display board</a>
        <button className="btn primary" onClick={callNext} disabled={!waiting.length && !serving}>
          {waiting.length ? 'Call next ▶' : 'Finish current'}
        </button></>}>
      {error && <div className="error">{error}</div>}

      <div className="token-now">
        <div style={{ opacity: 0.8 }}>Now serving</div>
        <div className="num">{serving ? serving.number : '—'}</div>
        <div>{serving ? serving.customer : 'Nobody yet'}</div>
        {serving && <button className="btn sm" style={{ marginTop: 10 }} onClick={() => setStatus(serving, 'done')}>Mark done</button>}
      </div>

      <div className="grid g2">
        <Card title={`Waiting (${waiting.length})`}>
          {waiting.length === 0 ? <Empty>Queue is empty 🎉</Empty> : (
            <table>
              <tbody>{waiting.map((t, i) => (
                <tr key={t.id}>
                  <td><span className="token-chip">{t.number}</span></td>
                  <td>{t.customer}<div className="muted small">{timeOf(t.createdAt)} · {i === 0 ? 'next up' : `${i} ahead`}</div></td>
                  <td className="right"><div className="row" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn sm" onClick={() => setStatus(t, 'serving')}>Serve</button>
                    <button className="btn sm danger" onClick={() => setStatus(t, 'skipped')}>Skip</button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </Card>

        <Card title="Finished today">
          {finished.length === 0 ? <Empty>Nothing finished yet</Empty> : (
            <table>
              <tbody>{finished.map((t) => (
                <tr key={t.id}><td><span className="token-chip">{t.number}</span></td><td>{t.customer}</td>
                  <td><Badge value={t.status} /></td>
                  <td className="right">{t.status === 'skipped' && <button className="btn sm" onClick={() => setStatus(t, 'waiting')}>Requeue</button>}</td></tr>
              ))}</tbody>
            </table>
          )}
        </Card>
      </div>
      <Toast toast={toast} />
    </Page>
  );
}
