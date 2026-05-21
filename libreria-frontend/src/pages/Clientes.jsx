import React, { useEffect, useState, useMemo } from 'react'
import { Plus, Edit2, Trash2, X, Search, Users, Phone, Mail, ShoppingBag, TrendingUp, Clock } from 'lucide-react'
import { clientesAPI } from '../services/api'
import { useToast } from '../context/ToastContext'

function fmt(n) {
  return Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })
}
function fmtFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' })
}

const VACIO = { nombre: '', telefono: '', correo: '' }

export default function Clientes() {
  const { addToast } = useToast()
  const [clientes, setClientes]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [busqueda, setBusqueda]         = useState('')
  const [modalOpen, setModalOpen]       = useState(false)
  const [editando, setEditando]         = useState(null)
  const [form, setForm]                 = useState(VACIO)
  const [guardando, setGuardando]       = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [detalle, setDetalle]           = useState(null)
  const [ordenar, setOrdenar]           = useState('nombre') // nombre | mas_compras | sin_actividad

  async function cargar() {
    setLoading(true)
    try {
      const d = await clientesAPI.getAll()
      setClientes(Array.isArray(d) ? d : (d.data || []))
    } catch (err) {
      addToast('Error al cargar clientes: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  // Calcular stats por cliente
  const clientesConStats = useMemo(() => {
    return clientes.map(c => {
      const ventasCompletas = (c.ventas || []).filter(v => v.estado !== 'anulada')
      const totalComprado   = ventasCompletas.reduce((s, v) => s + parseFloat(v.total || 0), 0)
      const numCompras      = ventasCompletas.length
      const ultimaCompra    = ventasCompletas.length
        ? ventasCompletas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0].fecha
        : null
      const diasSinComprar  = ultimaCompra
        ? Math.floor((Date.now() - new Date(ultimaCompra)) / (1000 * 60 * 60 * 24))
        : null
      return { ...c, totalComprado, numCompras, ultimaCompra, diasSinComprar }
    })
  }, [clientes])

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase()
    let lista = q
      ? clientesConStats.filter(c =>
          c.nombre?.toLowerCase().includes(q) ||
          c.telefono?.includes(q) ||
          c.correo?.toLowerCase().includes(q))
      : [...clientesConStats]

    if (ordenar === 'mas_compras')    lista.sort((a, b) => b.totalComprado - a.totalComprado)
    if (ordenar === 'sin_actividad')  lista.sort((a, b) => (b.diasSinComprar ?? -1) - (a.diasSinComprar ?? -1))
    if (ordenar === 'nombre')         lista.sort((a, b) => a.nombre.localeCompare(b.nombre))
    return lista
  }, [clientesConStats, busqueda, ordenar])

  function abrirNuevo() { setEditando(null); setForm(VACIO); setModalOpen(true) }
  function abrirEditar(c) {
    setEditando(c)
    setForm({ nombre: c.nombre || '', telefono: c.telefono || '', correo: c.correo || '' })
    setModalOpen(true)
  }

  async function handleGuardar(e) {
    e.preventDefault()
    if (!form.nombre.trim()) { addToast('El nombre es obligatorio', 'error'); return }
    setGuardando(true)
    try {
      if (editando) {
        await clientesAPI.update(editando.id, form)
        addToast('Cliente actualizado', 'success')
      } else {
        await clientesAPI.create(form)
        addToast('Cliente creado', 'success')
      }
      setModalOpen(false)
      cargar()
    } catch (err) {
      addToast('Error: ' + err.message, 'error')
    } finally {
      setGuardando(false)
    }
  }

  async function handleEliminar(id) {
    try {
      await clientesAPI.delete(id)
      addToast('Cliente eliminado', 'success')
      setConfirmDelete(null)
      cargar()
    } catch (err) {
      addToast('Error: ' + err.message, 'error')
    }
  }

  const topCliente    = useMemo(() => [...clientesConStats].sort((a, b) => b.totalComprado - a.totalComprado)[0], [clientesConStats])
  const sinActividad  = useMemo(() => clientesConStats.filter(c => c.diasSinComprar !== null && c.diasSinComprar > 30).length, [clientesConStats])

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">Módulo de <span>Clientes</span></h2>
          <p className="page-subtitle">{clientes.length} clientes registrados</p>
        </div>
        <button className="btn btn-primary" onClick={abrirNuevo}>
          <Plus size={16} /> Nuevo cliente
        </button>
      </div>

      {/* KPIs rápidos */}
      {clientesConStats.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.5, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cliente frecuente</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem' }}>{topCliente?.nombre || '—'}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.55, marginTop: 2 }}>Q {fmt(topCliente?.totalComprado)} en compras</div>
          </div>
          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.5, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sin actividad +30 días</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.8rem', color: sinActividad > 0 ? 'var(--gold)' : 'var(--sage)' }}>{sinActividad}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.55, marginTop: 2 }}>clientes inactivos</div>
          </div>
          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.5, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total clientes</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.8rem' }}>{clientes.length}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.55, marginTop: 2 }}>registrados en el sistema</div>
          </div>
        </div>
      )}

      {/* Búsqueda y ordenamiento */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ padding: '14px 20px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-input-wrap" style={{ flex: 1, minWidth: 200 }}>
            <Search size={15} />
            <input className="form-input" placeholder="Buscar por nombre, teléfono o correo…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[['nombre', 'A–Z'], ['mas_compras', 'Más compras'], ['sin_actividad', 'Sin actividad']].map(([val, label]) => (
              <button key={val} className={`btn btn-sm ${ordenar === val ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setOrdenar(val)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        {loading ? (
          <div className="loading-center"><div className="spinner" style={{ width: 28, height: 28 }} /><span>Cargando…</span></div>
        ) : filtrados.length === 0 ? (
          <div className="empty-state"><Users size={48} /><p>No hay clientes registrados</p></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Contacto</th>
                  <th className="text-right">Compras</th>
                  <th className="text-right">Total gastado</th>
                  <th>Última compra</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(c => (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setDetalle(c)}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{c.nombre}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {c.telefono && <span style={{ opacity: 0.65 }}><Phone size={11} style={{ marginRight: 4 }} />{c.telefono}</span>}
                        {c.correo   && <span style={{ opacity: 0.65 }}><Mail  size={11} style={{ marginRight: 4 }} />{c.correo}</span>}
                      </div>
                    </td>
                    <td className="text-right" style={{ fontWeight: 700 }}>{c.numCompras}</td>
                    <td className="text-right" style={{ fontWeight: 700, color: 'var(--gold)' }}>Q {fmt(c.totalComprado)}</td>
                    <td>
                      {c.ultimaCompra ? (
                        <span style={{ fontSize: '0.82rem', color: c.diasSinComprar > 30 ? 'var(--gold)' : 'var(--ink-soft)' }}>
                          {fmtFecha(c.ultimaCompra)}
                          {c.diasSinComprar > 30 && <span style={{ marginLeft: 6, fontSize: '0.75rem', color: 'var(--gold)' }}>({c.diasSinComprar}d)</span>}
                        </span>
                      ) : <span style={{ opacity: 0.35, fontSize: '0.82rem', fontStyle: 'italic' }}>Sin compras</span>}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => abrirEditar(c)}><Edit2 size={14} /></button>
                        <button className="btn btn-danger btn-icon btn-sm" onClick={() => setConfirmDelete(c)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal crear/editar */}
      {modalOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3 className="modal-title">{editando ? 'Editar cliente' : 'Nuevo cliente'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleGuardar}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nombre *</label>
                  <input className="form-input" placeholder="Nombre completo" value={form.nombre}
                    onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
                </div>
                <div className="form-row form-row-2">
                  <div className="form-group">
                    <label className="form-label">Teléfono</label>
                    <input className="form-input" placeholder="5555-0000" value={form.telefono}
                      onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Correo</label>
                    <input className="form-input" type="email" placeholder="correo@ejemplo.com" value={form.correo}
                      onChange={e => setForm(p => ({ ...p, correo: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={guardando}>
                  {guardando ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Guardando…</> : editando ? 'Guardar cambios' : 'Crear cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal detalle */}
      {detalle && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDetalle(null)}>
          <div className="modal modal-wide">
            <div className="modal-header">
              <h3 className="modal-title">{detalle.nombre}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setDetalle(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 20 }}>
                {detalle.telefono && <div><div className="form-label">Teléfono</div><div>{detalle.telefono}</div></div>}
                {detalle.correo   && <div><div className="form-label">Correo</div><div>{detalle.correo}</div></div>}
                <div><div className="form-label">Total comprado</div><div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--gold)' }}>Q {fmt(detalle.totalComprado)}</div></div>
                <div><div className="form-label">Nº de compras</div><div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem' }}>{detalle.numCompras}</div></div>
              </div>
              {detalle.ventas?.length > 0 && (
                <>
                  <hr className="divider" />
                  <h4 style={{ fontFamily: 'var(--font-display)', marginBottom: 12 }}>Historial de compras</h4>
                  <table>
                    <thead><tr><th>Fecha</th><th className="text-right">Total</th><th>Estado</th></tr></thead>
                    <tbody>
                      {[...detalle.ventas].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).map(v => (
                        <tr key={v.id}>
                          <td style={{ fontSize: '0.83rem' }}>{fmtFecha(v.fecha)}</td>
                          <td className="text-right" style={{ fontWeight: 700 }}>Q {fmt(v.total)}</td>
                          <td><span className={`badge ${v.estado === 'anulada' ? 'badge-red' : 'badge-green'}`}>{v.estado || 'completada'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDetalle(null)}>Cerrar</button>
              <button className="btn btn-ghost" onClick={() => { setDetalle(null); abrirEditar(detalle) }}>Editar</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar eliminar */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setConfirmDelete(null)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3 className="modal-title">¿Eliminar cliente?</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setConfirmDelete(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem' }}>
                ¿Deseas eliminar a <strong>"{confirmDelete.nombre}"</strong>? Su historial de ventas no se borrará.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => handleEliminar(confirmDelete.id)}><Trash2 size={15} /> Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}