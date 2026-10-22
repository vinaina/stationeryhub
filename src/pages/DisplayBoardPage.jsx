import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useLoad } from '../hooks.js';

// Public screen for a TV facing customers. Refreshes every 3 seconds.
export default function DisplayBoardPage() {
  const [tokens, , error] = useLoad(() => api.get('/tokens'), 3000);
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const list = tokens || [];
  const serving = list.find((t) => t.status === 'serving');
  const waiting = list.filter((t) => t.status === 'waiting');
  const ready = list.filter((t) => t.status === 'done').slice(-3).reverse();

  return (
    <div className="board">
      <header>
        <h1>Stationery<span style={{ color: '#8ea2ff' }}>Hub</span> · Print Desk</h1>
        <div className="clock">{now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
      </header>
      {error && <div style={{ color: '#ff8787' }}>Can't reach the server…</div>}
      <div className="cols">
        <div className="now">
          <h2>Now serving</h2>
          <div className="big">{serving ? serving.number : '—'}</div>
          <div className="who">{serving ? serving.customer : 'Please wait for the next call'}</div>
        </div>
        <div>
          <h2>Next in line</h2>
          <div className="nextlist">
            {waiting.slice(0, 6).map((t, i) => (
              <div className="item" key={t.id}><strong>{t.number}</strong><span>{i === 0 ? 'Next' : `${i} ahead`}</span></div>
            ))}
            {waiting.length === 0 && <div className="item"><span>No one waiting</span></div>}
            {waiting.length > 6 && <div className="muted" style={{ color: '#9aa7d6' }}>+ {waiting.length - 6} more</div>}
          </div>
          {ready.length > 0 && (
            <>
              <h2 style={{ marginTop: 26 }}>Recently served</h2>
              <div className="nextlist">{ready.map((t) => <div className="item" key={t.id}><strong style={{ color: '#9aa7d6' }}>{t.number}</strong><span>Done ✓</span></div>)}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
