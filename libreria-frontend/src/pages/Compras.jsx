import React, { useEffect, useState, useMemo } from 'react'
import { ShoppingBag, Plus, Check, Trash2, X, AlertTriangle, Clock, ChevronUp, ChevronDown } from 'lucide-react'
import { productosAPI, inventarioAPI } from '../services/api'
import { useToast } from '../context/ToastContext'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function getToken() { return localStorage.getItem('token') }

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...options.headers,
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `Error ${res.status}`)
  return data
}

const PRIORIDAD_LABEL = { alta: 'Alta', media: 'Media', baja: 'Baja' }
const PRIORIDAD_BADGE = { alta: 'badge-red', media: 'badge-gold', baja: 'badge-green' }
const PRIORIDAD_ORDEN = { alta: 0, media: 1, baja: 2 }

const VACIO_ITEM = { descripcion: '', prioridad: 'media', fecha_limite: '' }

export default function Compras() {
  const { addToast } = useToast()

  // ── Sección automática ──
  const [productosStockBajo, setProductosStockBajo] = useState([])
  const [loadingAuto, setLoadingAuto]               = useState(true)
  const [comprando, setComprando]                   = useState(null)
  const [modalCompra, setModalCompra]               = useState(null) // producto seleccionado
  const [cantidadCompra, setCantidadCompra]         = useState('')
  const [motivoCompra, setMotivoCompra]             = useState('')

  // ── Sección manual ──
  const [items, setItems]           = useState([])
  const [loadingManual, setLoadingManual] = useState(true)
  const [modalOpen, setModalOpen]   = useState(false)
  const [form, setForm]             = useState(VACIO_ITEM)
  const [guardando, setGuardando]   = useState(false)
  const [filtro, setFiltro]         = useState('pendientes') // 'pendientes' | 'completados'

  // ── Cargar datos ──
  async function cargarProductos() {
    setLoadingAuto(true)
    try {
      const d = await productosAPI.getAll()
      const lista = Array.isArray(d) ? d : (d.data || [])
      // Stock bajo = stock <= stock_minimo
      setProductosStockBajo(lista.filter(p => p.stock <= (p.stock_minimo ?? 5)))
    } catch (err) {
      addToast('Error al cargar productos: ' + err.message, 'error')
    } finally {
      setLoadingAuto(false)
    }
  }

  async function cargarItems() {
    setLoadingManual(true)
    try {
      const d = await request('/lista-compras')
      setItems(Array.isArray(d) ? d : (d.data || []))
    } catch (err) {
      addToast('Error al cargar lista: ' + err.message, 'error')
    } finally {
      setLoadingManual(false)
    }
  }

  useEffect(() => {
    cargarProductos()
    cargarItems()
  }, [])

  // ── Automática: registrar compra (movimiento entrada) ──
  async function handleYaCompre(e) {
    e.preventDefault()
    if (!cantidadCompra || parseInt(cantidadCompra) < 1) {
      addToast('Ingresa una cantidad válida', 'error')
      return
    }
    setComprando(modalCompra.id)
    try {
      await inventarioAPI.movimiento({
        producto_id:    modalCompra.id,
        tipo_movimiento: 'entrada',
        cantidad:       parseInt(cantidadCompra),
        motivo:         motivoCompra || `Reposición de stock — ${modalCompra.nombre}`,
      })
      addToast(`Stock de "${modalCompra.nombre}" actualizado`, 'success')
      setModalCompra(null)
      setCantidadCompra('')
      setMotivoCompra('')
      cargarProductos()
    } catch (err) {
      addToast('Error: ' + err.message, 'error')
    } finally {
      setComprando(null)
    }
  }

  // ── Manual: crear item ──
  async function handleCrearItem(e) {
    e.preventDefault()
    if (!form.descripcion.trim()) { addToast('La descripción es obligatoria', 'error'); return }
    setGuardando(true)
    try {
      await request('/lista-compras', {
        method: 'POST',
        body: JSON.stringify({
          descripcion:   form.descripcion.trim(),
          prioridad:     form.prioridad,
          fecha_limite:  form.fecha_limite || null,
        }),
      })
      addToast('Item agregado a la lista', 'success')
      setModalOpen(false)
      setForm(VACIO_ITEM)
      cargarItems()
    } catch (err) {
      addToast('Error: ' + err.message, 'error')
    } finally {
      setGuardando(false)
    }
  }

  // ── Manual: marcar completado/pendiente ──
  async function handleToggleCompletado(item) {
    try {
      await request(`/lista-compras/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ completado: !item.completado }),
      })
      cargarItems()
    } catch (err) {
      addToast('Error: ' + err.message, 'error')
    }
  }

  // ── Manual: eliminar ──
  async function handleEliminar(id) {
    try {
      await request(`/lista-compras/${id}`, { method: 'DELETE' })
      addToast('Item eliminado', 'success')
      cargarItems()
    } catch (err) {
      addToast('Error: ' + err.message, 'error')
    }
  }

  const itemsFiltrados = useMemo(() => {
    const base = filtro === 'completados'
      ? items.filter(i => i.completado)
      : items.filter(i => !i.completado)
    return [...base].sort((a, b) => PRIORIDAD_ORDEN[a.prioridad] - PRIORIDAD_ORDEN[b.prioridad])
  }, [items, filtro])

  const pendientesCount   = items.filter(i => !i.completado).length
  const completadosCount  = items.filter(i => i.completado).length

  function fmtFecha(iso) {
    if (!iso) return null
    return new Date(iso + 'T00:00:00').toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  function diasRestantes(fecha) {
    if (!fecha) return null
    const hoy  = new Date(); hoy.setHours(0,0,0,0)
    const f    = new Date(fecha + 'T00:00:00')
    return Math.ceil((f - hoy) / 86400000)
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">Lista de <span>Compras</span></h2>
          <p className="page-subtitle">
            {productosStockBajo.length} producto{productosStockBajo.length !== 1 ? 's' : ''} con stock bajo · {pendientesCount} tarea{pendientesCount !== 1 ? 's' : ''} pendiente{pendientesCount !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Agregar tarea
        </button>
      </div>

      {/* ══ SECCIÓN AUTOMÁTICA ══ */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} color="var(--gold)" />
            Reposición automática
          </h3>
          <span className="badge badge-gold">{productosStockBajo.length} productos</span>
        </div>
        <div className="card-body" style={{ paddingTop: 8 }}>
          {loadingAuto ? (
            <div className="loading-center" style={{ padding: '30px 0' }}>
              <div className="spinner" style={{ width: 24, height: 24 }} />
              <span>Revisando inventario…</span>
            </div>
          ) : productosStockBajo.length === 0 ? (
            <div className="empty-state" style={{ padding: '36px 0' }}>
              <Check size={40} color="var(--sage)" style={{ opacity: 0.6 }} />
              <p style={{ color: 'var(--sage)', fontWeight: 700, marginTop: 8 }}>¡Todo el stock está en orden!</p>
              <p style={{ marginTop: 4 }}>No hay productos que necesiten reposición.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th className="text-right">Stock actual</th>
                    <th className="text-right">Stock mínimo</th>
                    <th className="text-right">Déficit</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {productosStockBajo.map(p => {
                    const minimo  = p.stock_minimo ?? 5
                    const deficit = minimo - p.stock
                    return (
                      <tr key={p.id}>
                        <td className="td-nombre">{p.nombre}</td>
                        <td><span className="badge badge-gold">{p.categoria || '—'}</span></td>
                        <td className="text-right">
                          <span className="badge badge-red">{p.stock}</span>
                        </td>
                        <td className="text-right" style={{ opacity: 0.6 }}>{minimo}</td>
                        <td className="text-right" style={{ fontWeight: 700, color: 'var(--red-anular)' }}>
                          -{deficit}
                        </td>
                        <td className="text-right">
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => { setModalCompra(p); setCantidadCompra(String(deficit > 0 ? deficit : 1)); setMotivoCompra('') }}
                          >
                            <Check size={13} /> Ya compré
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ══ SECCIÓN MANUAL ══ */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShoppingBag size={18} color="var(--coffee)" />
            Lista manual
          </h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`btn btn-sm ${filtro === 'pendientes' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFiltro('pendientes')}
            >
              Pendientes {pendientesCount > 0 && <span className="badge badge-red" style={{ marginLeft: 4 }}>{pendientesCount}</span>}
            </button>
            <button
              className={`btn btn-sm ${filtro === 'completados' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFiltro('completados')}
            >
              Completados {completadosCount > 0 && <span className="badge badge-green" style={{ marginLeft: 4 }}>{completadosCount}</span>}
            </button>
          </div>
        </div>
        <div className="card-body" style={{ paddingTop: 8 }}>
          {loadingManual ? (
            <div className="loading-center" style={{ padding: '30px 0' }}>
              <div className="spinner" style={{ width: 24, height: 24 }} />
              <span>Cargando lista…</span>
            </div>
          ) : itemsFiltrados.length === 0 ? (
            <div className="empty-state" style={{ padding: '36px 0' }}>
              <ShoppingBag size={40} style={{ opacity: 0.25 }} />
              <p>{filtro === 'completados' ? 'No hay tareas completadas todavía' : 'No hay tareas pendientes'}</p>
              {filtro === 'pendientes' && (
                <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }} onClick={() => setModalOpen(true)}>
                  <Plus size={14} /> Agregar tarea
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {itemsFiltrados.map(item => {
                const dias = diasRestantes(item.fecha_limite)
                return (
                  <div key={item.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 16px',
                    background: item.completado ? 'var(--cream)' : 'var(--white)',
                    border: `1px solid ${item.prioridad === 'alta' && !item.completado ? 'rgba(192,57,43,0.25)' : 'var(--cream-dark)'}`,
                    borderRadius: 'var(--radius)',
                    transition: 'all 0.15s',
                    opacity: item.completado ? 0.65 : 1,
                  }}>
                    {/* Checkbox */}
                    <button
                      onClick={() => handleToggleCompletado(item)}
                      style={{
                        width: 22, height: 22, borderRadius: 6,
                        border: `2px solid ${item.completado ? 'var(--sage)' : 'var(--parchment)'}`,
                        background: item.completado ? 'var(--sage)' : 'transparent',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, transition: 'all 0.15s',
                      }}
                    >
                      {item.completado && <Check size={13} color="white" />}
                    </button>

                    {/* Contenido */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        textDecoration: item.completado ? 'line-through' : 'none',
                        color: item.completado ? 'var(--ink-soft)' : 'var(--ink)',
                      }}>
                        {item.descripcion}
                      </div>
                      {item.fecha_limite && (
                        <div style={{
                          fontSize: '0.75rem',
                          marginTop: 3,
                          color: dias !== null && dias < 0 ? 'var(--red-anular)' : dias !== null && dias <= 2 ? 'var(--gold)' : 'var(--ink-soft)',
                          opacity: item.completado ? 0.5 : 0.8,
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          <Clock size={11} />
                          {fmtFecha(item.fecha_limite)}
                          {dias !== null && !item.completado && (
                            <span style={{ fontWeight: 700 }}>
                              {dias < 0 ? ` · Vencido hace ${Math.abs(dias)}d` : dias === 0 ? ' · Hoy' : ` · ${dias}d restantes`}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Badge prioridad */}
                    <span className={`badge ${PRIORIDAD_BADGE[item.prioridad]}`}>
                      {PRIORIDAD_LABEL[item.prioridad]}
                    </span>

                    {/* Eliminar */}
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => handleEliminar(item.id)}
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ══ MODAL: registrar compra automática ══ */}
      {modalCompra && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalCompra(null)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3 className="modal-title">Registrar entrada de stock</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setModalCompra(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleYaCompre}>
              <div className="modal-body">
                <div style={{
                  padding: '12px 16px', background: 'var(--cream)', borderRadius: 'var(--radius)',
                  marginBottom: 18, border: '1px solid var(--cream-dark)',
                }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{modalCompra.nombre}</div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.55, marginTop: 2 }}>
                    Stock actual: <strong>{modalCompra.stock}</strong> · Mínimo: <strong>{modalCompra.stock_minimo ?? 5}</strong>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Cantidad comprada *</label>
                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    value={cantidadCompra}
                    onChange={e => setCantidadCompra(e.target.value)}
                    placeholder="¿Cuántas unidades compraste?"
                    autoFocus
                  />
                  {cantidadCompra && (
                    <span style={{ fontSize: '0.78rem', opacity: 0.55, marginTop: 4, display: 'block' }}>
                      Nuevo stock: {modalCompra.stock + parseInt(cantidadCompra || 0)} unidades
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Nota / motivo (opcional)</label>
                  <input
                    className="form-input"
                    value={motivoCompra}
                    onChange={e => setMotivoCompra(e.target.value)}
                    placeholder={`Reposición de stock — ${modalCompra.nombre}`}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalCompra(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={comprando === modalCompra.id}>
                  {comprando === modalCompra.id
                    ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Guardando…</>
                    : <><Check size={15} /> Confirmar entrada</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL: agregar tarea manual ══ */}
      {modalOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3 className="modal-title">Nueva tarea</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCrearItem}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Descripción *</label>
                  <input
                    className="form-input"
                    value={form.descripcion}
                    onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                    placeholder="Ej: Llamar a proveedor, pedir cotización de libros…"
                    autoFocus
                  />
                </div>
                <div className="form-row form-row-2">
                  <div className="form-group">
                    <label className="form-label">Prioridad</label>
                    <select
                      className="form-select"
                      value={form.prioridad}
                      onChange={e => setForm(f => ({ ...f, prioridad: e.target.value }))}
                    >
                      <option value="alta">🔴 Alta</option>
                      <option value="media">🟡 Media</option>
                      <option value="baja">🟢 Baja</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fecha límite (opcional)</label>
                    <input
                      className="form-input"
                      type="date"
                      value={form.fecha_limite}
                      onChange={e => setForm(f => ({ ...f, fecha_limite: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={guardando}>
                  {guardando
                    ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Guardando…</>
                    : <><Plus size={15} /> Agregar tarea</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}