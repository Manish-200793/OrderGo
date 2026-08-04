import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { menuAPI, adminAPI } from '../../services/api';
import { formatPrice, CATEGORY_CONFIG } from '../../utils/formatters';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function MenuManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', category: 'snacks', price: '', stock: 50, is_daily_special: false });

  useEffect(() => { loadItems(); }, []);

  async function loadItems() {
    try {
      const res = await menuAPI.getItems();
      setItems(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function openAdd() {
    setEditing(null);
    setForm({ name: '', description: '', category: 'snacks', price: '', stock: 50, is_daily_special: false });
    setShowModal(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({ name: item.name, description: item.description || '', category: item.category, price: item.price, stock: item.stock, is_daily_special: !!item.is_daily_special });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editing) {
        await adminAPI.updateMenuItem(editing.item_id, form);
      } else {
        await adminAPI.addMenuItem(form);
      }
      setShowModal(false);
      loadItems();
    } catch (err) { console.error(err); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this item?')) return;
    try {
      await adminAPI.deleteMenuItem(id);
      loadItems();
    } catch (err) { console.error(err); }
  }

  async function toggleAvailability(item) {
    try {
      await adminAPI.updateMenuItem(item.item_id, { is_available: !item.is_available });
      loadItems();
    } catch (err) { console.error(err); }
  }

  if (loading) return <LoadingSpinner text="Loading menu..." />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title">Menu Management</h1>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={18} /> Add Item</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {items.map(item => (
          <div key={item.item_id} className="glass-card" style={{
            display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem',
            opacity: item.is_available ? 1 : 0.5
          }}>
            <span style={{ fontSize: '1.5rem', width: 40, textAlign: 'center' }}>
              {CATEGORY_CONFIG[item.category]?.emoji}
            </span>
            <div style={{ flex: 1 }}>
              <strong>{item.name}</strong>
              {item.is_daily_special ? <span className="badge badge-special" style={{ marginLeft: 8, fontSize: '10px' }}>⭐ Special</span> : null}
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {CATEGORY_CONFIG[item.category]?.label} • Stock: {item.stock}
              </div>
            </div>
            <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{formatPrice(item.price)}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => toggleAvailability(item)}>
              {item.is_available ? '✅' : '❌'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)}><Edit size={16} /></button>
            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.item_id)}><Trash2 size={16} /></button>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content glass-card animate-scale-in" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>{editing ? 'Edit Item' : 'Add New Item'}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.emoji} {v.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Price (₹)</label>
                  <input type="number" className="form-input" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required min="1" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Stock</label>
                  <input type="number" className="form-input" value={form.stock} onChange={e => setForm({ ...form, stock: parseInt(e.target.value) })} min="0" />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1.7rem' }}>
                  <input type="checkbox" id="daily-special" checked={form.is_daily_special} onChange={e => setForm({ ...form, is_daily_special: e.target.checked })} />
                  <label htmlFor="daily-special" style={{ cursor: 'pointer', fontSize: '0.9rem' }}>⭐ Daily Special</label>
                </div>
              </div>
              <button type="submit" className="btn btn-primary w-full">{editing ? 'Update Item' : 'Add Item'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
