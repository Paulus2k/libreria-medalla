import React, { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Archive, X, TrendingUp, TrendingDown, Search } from 'lucide-react'
import { inventarioAPI, productosAPI } from '../services/api'
import { useToast } from '../context/ToastContext'

function fmtFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-GT', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

const TIPOS = ['entrada', 'salida', 'ajuste']

export default function Inventario() {
  const { addToast } = useToast()
  const [historial, setHistorial]   = useState([])
  const [productos, setProductos]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [modalOpen, setModalOpen]   = useState(false)
  const [guardando, setGuardando]   = useState(false)
  const [filtroTipo, setFiltroTipo] = useState('')
  const [busquedaStock, setBusquedaStock] = useState('')
  const [filtroStock, setFiltroStock]     = useState('')
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState({ producto_id: '', tipo: 'entrada', cantidad: '', motivo: '' })

  async function cargar() {
    setLoading(true)
    try {
      const [h, p] = await Promise.all([inventarioAPI.getHistorial(), productosAPI.getAll()])
      setHistorial(Array.isArray(h) ? h : (h.data || []))
      setProductos(Array.isArray(p) ? p : (p.data || []))
    } catch (err) {
      addToast('Error al cargar inventario: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  useEffect(() => {
    const filtro = searchParams.get('filtro')
    if (filtro === 'bajo' || filtro === 'medio') setFiltroStock(filtro)
  }, [searchParams])

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleGuardar(e) {
    e.preventDefault()
    if (!form.producto_id || !form.cantidad || !form.tipo) {
      addToast('Completa todos los campos obligatorios.', 'error')
      return
    }
    setGuardando(true)
    try {
      await inventarioAPI.movimiento({
        producto_id:     form.producto_id,
        tipo_movimiento: form.tipo,
        cantidad:        parseInt(form.cantidad),
        motivo:          form.motivo,
      })
      addToast('Movimiento registrado correctamente', 'success')
      setModalOpen(false)
      setForm({ producto_id: '', tipo: 'entrada', cantidad: '', motivo: '' })
      cargar()
    } catch (err) {
      addToast('Error: ' + err.message, 'error')
    } finally {
      setGuardando(false)
    }
  }

  // Productos filtrados por búsqueda en la sección de stock
  const productosFiltrados = useMemo(() => {
    let lista = productos
    if (filtroStock === 'bajo')  lista = lista.filter(p => p.stock <= (p.stock_minimo ?? 5))
    if (filtroStock === 'medio') lista = lista.filter(p => p.stock > (p.stock_minimo ?? 5) && p.stock <= (p.stock_minimo ?? 5) * 2)
    const q = busquedaStock.toLowerCase()
    if (!q) return lista
    return lista.filter(p =>
      p.nombre?.toLowerCase().includes(q) ||
      p.categoria?.toLowerCase().includes(q)
    )
  }, [productos, busquedaStock, filtroStock])

  const historialFiltrado = filtroTipo
    ? historial.filter(h => h.tipo_movimiento === filtroTipo)
    : historial

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">Control de <span>Inventario</span></h2>
          <p className="page-subtitle">{historial.length} movimientos registrados</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Registrar movimiento
        </button>
      </div>

      {/* Stock actual */}
      <div style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              Stock actual por producto
              {filtroStock && (
                <span className={`badge ${filtroStock === 'bajo' ? 'badge-red' : 'badge-gold'}`} style={{ marginLeft: 10 }}>
                  {filtroStock === 'bajo' ? 'Stock bajo' : 'Stock medio'}
                  <button onClick={() => setFiltroStock('')} style={{ marginLeft: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
                </span>
              )}
            </h3>
            <div className="search-input-wrap" style={{ width: 240 }}>
              <Search size={14} />
              <input
                className="form-input"
                placeholder="Buscar producto…"
                value={busquedaStock}
                onChange={e => setBusquedaStock(e.target.value)}
                style={{ fontSize: '0.85rem' }}
              />
            </div>
          </div>
          <div className="card-body" style={{ paddingTop: 12 }}>
            {productosFiltrados.length === 0 ? (
              <p style={{ textAlign: 'center', opacity: 0.45, fontSize: '0.875rem' }}>
                {busquedaStock ? 'Sin resultados' : 'Sin productos registrados'}
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                {productosFiltrados.map(p => {
                  const bajo = p.stock <= (p.stock_minimo ?? 5)
                  const medio = p.stock <= (p.stock_minimo ?? 5) * 2
                  return (
                    <div key={p.id} style={{
                      background: bajo ? 'var(--red-pale)' : medio ? 'var(--gold-pale)' : 'var(--cream)',
                      borderRadius: 'var(--radius)',
                      padding: '14px 16px',
                      border: `1px solid ${bajo ? 'rgba(192,57,43,0.2)' : medio ? 'rgba(200,149,42,0.2)' : 'var(--cream-dark)'}`,
                    }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 6, lineHeight: 1.3 }}>
                        {p.nombre.length > 28 ? p.nombre.slice(0, 28) + '…' : p.nombre}
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700,
                        color: bajo ? 'var(--red-anular)' : medio ? 'var(--gold)' : 'var(--ink)',
                      }}>
                        {p.stock}
                      </div>
                      <div style={{ fontSize: '0.68rem', opacity: 0.5, marginTop: 2 }}>
                        unidades · mín. {p.stock_minimo ?? 5}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Historial */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Historial de movimientos</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            {['', ...TIPOS].map(t => (
              <button
                key={t}
                className={`btn btn-sm ${filtroTipo === t ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFiltroTipo(t)}
              >
                {t || 'Todos'}
              </button>
            ))}
          </div>
        </div>
        <div className="card-body" style={{ paddingTop: 8 }}>
          {loading ? (
            <div className="loading-center">
              <div className="spinner" style={{ width: 26, height: 26 }} />
              <span>Cargando historial…</span>
            </div>
          ) : historialFiltrado.length === 0 ? (
            <div className="empty-state">
              <Archive size={44} />
              <p>No hay movimientos registrados</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Producto</th>
                    <th>Tipo</th>
                    <th className="text-right">Cantidad</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {historialFiltrado.map((h, i) => (
                    <tr key={h.id || i}>
                      <td style={{ fontSize: '0.82rem', opacity: 0.65 }}>{fmtFecha(h.fecha || h.created_at)}</td>
                      <td className="td-nombre">
                        {h.productos?.nombre || `Producto #${h.producto_id}`}
                      </td>
                      <td>
                        <span className={`badge ${
                          h.tipo_movimiento === 'entrada' ? 'badge-green'
                          : h.tipo_movimiento === 'salida' ? 'badge-red'
                          : 'badge-gold'
                        }`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {h.tipo_movimiento === 'entrada' ? <TrendingUp size={11} />
                           : h.tipo_movimiento === 'salida' ? <TrendingDown size={11} />
                           : null}
                          {h.tipo_movimiento}
                        </span>
                      </td>
                      <td className="text-right" style={{ fontWeight: 700 }}>
                        <span style={{ color: h.tipo_movimiento === 'entrada' ? 'var(--sage)' : h.tipo_movimiento === 'salida' ? 'var(--red-anular)' : 'var(--gold)' }}>
                          {h.tipo_movimiento === 'salida' ? '-' : '+'}{h.cantidad}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.83rem', opacity: 0.6 }}>{h.motivo || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal registrar movimiento */}
      {modalOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Registrar movimiento</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleGuardar}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Producto *</label>
                  <select className="form-select" name="producto_id" value={form.producto_id} onChange={handleChange}>
                    <option value="">— Selecciona un producto —</option>
                    {productos.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre} (Stock: {p.stock})</option>
                    ))}
                  </select>
                </div>
                <div className="form-row form-row-2">
                  <div className="form-group">
                    <label className="form-label">Tipo de movimiento *</label>
                    <select className="form-select" name="tipo" value={form.tipo} onChange={handleChange}>
                      <option value="entrada">Entrada</option>
                      <option value="salida">Salida</option>
                      <option value="ajuste">Ajuste</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cantidad *</label>
                    <input className="form-input" type="number" min="1" name="cantidad" value={form.cantidad} onChange={handleChange} placeholder="0" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Motivo / Nota</label>
                  <input className="form-input" name="motivo" value={form.motivo} onChange={handleChange} placeholder="Ej: Compra a proveedor, Devolución de cliente…" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={guardando}>
                  {guardando
                    ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Guardando…</>
                    : 'Registrar movimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
