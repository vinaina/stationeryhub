import React from 'react';

export function Page({ title, subtitle, actions, children }) {
  return (
    <section className="page">
      <header className="page-head">
        <div>
          <h1>{title}</h1>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        <div className="row">{actions}</div>
      </header>
      {children}
    </section>
  );
}

export const Card = ({ title, children, right }) => (
  <div className="card">
    {(title || right) && (
      <div className="card-head"><h3>{title}</h3>{right}</div>
    )}
    {children}
  </div>
);

export const Stat = ({ label, value, hint, tone }) => (
  <div className={`stat ${tone || ''}`}>
    <span className="stat-label">{label}</span>
    <strong className="stat-value">{value}</strong>
    {hint && <span className="muted small">{hint}</span>}
  </div>
);

export const Badge = ({ value }) => <span className={`badge b-${value}`}>{value}</span>;

export function Modal({ title, onClose, children }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="card-head"><h3>{title}</h3><button className="btn ghost" onClick={onClose}>✕</button></div>
        {children}
      </div>
    </div>
  );
}

export const Field = ({ label, children }) => (
  <label className="field"><span>{label}</span>{children}</label>
);

export const Empty = ({ children }) => <div className="empty">{children}</div>;

export function Toast({ toast }) {
  if (!toast) return null;
  return <div className={`toast ${toast.kind}`}>{toast.msg}</div>;
}

export function BarChart({ data, valueKey, labelKey, format = (v) => v }) {
  const max = Math.max(1, ...data.map((d) => d[valueKey]));
  return (
    <div className="bars">
      {data.map((d) => (
        <div className="bar-col" key={d[labelKey]} title={`${d[labelKey]}: ${format(d[valueKey])}`}>
          <span className="bar-val">{format(d[valueKey])}</span>
          <div className="bar" style={{ height: `${(d[valueKey] / max) * 100}%` }} />
          <span className="bar-label">{String(d[labelKey]).slice(-5)}</span>
        </div>
      ))}
    </div>
  );
}
