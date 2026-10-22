import React, { useState } from 'react';
import { api } from '../api.js';
import { useLoad, useToast } from '../hooks.js';
import { Page, Card, Modal, Field, Badge, Toast } from '../components.jsx';

const BLANK = { name: '', email: '', role: 'staff', pin: '' };

export default function UsersPage({ user }) {
  const [users, reload, error] = useLoad(() => api.get('/users'));
  const [toast, show] = useToast();
  const [form, setForm] = useState(null);
  const [pinFor, setPinFor] = useState(null);

  const act = async (fn, msg) => {
    try { await fn(); show(msg); reload(); } catch (e) { show(e.message, 'err'); }
  };
  const add = async (e) => {
    e.preventDefault();
    await act(() => api.post('/users', form), 'User added');
    setForm(null);
  };

  return (
    <Page title="Users" subtitle="Who can sign in, and what they can do"
      actions={<button className="btn primary" onClick={() => setForm({ ...BLANK })}>+ Add user</button>}>
      {error && <div className="error">{error}</div>}
      <Card>
        <div className="scroll"><table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th /></tr></thead>
          <tbody>{(users || []).map((u) => (
            <tr key={u.id}>
              <td>{u.name}{u.id === user.id && <span className="muted"> (you)</span>}</td>
              <td className="muted">{u.email}</td>
              <td>
                <select value={u.role} disabled={u.id === user.id} style={{ width: 120 }}
                  onChange={(e) => act(() => api.patch(`/users/${u.id}`, { role: e.target.value }), 'Role updated')}>
                  <option value="admin">Admin</option><option value="staff">Staff</option><option value="cashier">Cashier</option>
                </select>
              </td>
              <td><Badge value={u.active ? 'paid' : 'cancelled'} /> <span className="small">{u.active ? 'active' : 'disabled'}</span></td>
              <td className="right"><div className="row" style={{ justifyContent: 'flex-end' }}>
                <button className="btn sm" onClick={() => setPinFor({ u, pin: '' })}>Reset PIN</button>
                {u.id !== user.id && <>
                  <button className="btn sm" onClick={() => act(() => api.patch(`/users/${u.id}`, { active: !u.active }), u.active ? 'User disabled' : 'User enabled')}>{u.active ? 'Disable' : 'Enable'}</button>
                  <button className="btn sm danger" onClick={() => window.confirm(`Remove ${u.name}?`) && act(() => api.del(`/users/${u.id}`), 'User removed')}>Remove</button>
                </>}
              </div></td>
            </tr>
          ))}</tbody>
        </table></div>
        <p className="muted small" style={{ marginTop: 12 }}>
          Admin: everything · Staff: orders, queue, inventory, pricing · Cashier: orders, payments, pricing.
        </p>
      </Card>

      {form && (
        <Modal title="Add user" onClose={() => setForm(null)}>
          <form onSubmit={add}>
            <Field label="Full name"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Email"><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <div className="form-grid">
              <Field label="Role"><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="staff">Staff</option><option value="cashier">Cashier</option><option value="admin">Admin</option></select></Field>
              <Field label="PIN (4+ digits)"><input required minLength={4} inputMode="numeric" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} /></Field>
            </div>
            <button className="btn primary">Add user</button>
          </form>
        </Modal>
      )}
      {pinFor && (
        <Modal title={`Reset PIN — ${pinFor.u.name}`} onClose={() => setPinFor(null)}>
          <form onSubmit={async (e) => { e.preventDefault(); await act(() => api.patch(`/users/${pinFor.u.id}`, { pin: pinFor.pin }), 'PIN updated'); setPinFor(null); }}>
            <Field label="New PIN"><input required minLength={4} autoFocus inputMode="numeric" value={pinFor.pin} onChange={(e) => setPinFor({ ...pinFor, pin: e.target.value })} /></Field>
            <button className="btn primary">Save PIN</button>
          </form>
        </Modal>
      )}
      <Toast toast={toast} />
    </Page>
  );
}
