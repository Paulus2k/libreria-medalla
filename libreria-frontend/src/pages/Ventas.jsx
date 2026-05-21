import React, { useEffect, useState, useMemo } from 'react'
import { Plus, Minus, Trash2, ShoppingCart, X, Search, AlertCircle, User } from 'lucide-react'
import { ventasAPI, productosAPI, clientesAPI } from '../services/api'
import { useToast } from '../context/ToastContext'

function fmt(n) {
  return Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })
}

function fmtFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-GT', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

export default function Ventas() {
  const { addToast } = useToast()
  const [tab, setTab] = useState('nueva')

  // Nueva venta
  const [productos, setProductos]     = useState([])
  const [carrito, setCarrito]         = useState([])
  const [busqueda, setBusqueda]       = useState('')
  const [registrando, setRegistrando] = useState(false)
  const [metodoPago, setMetodoPago]   = useState('efectivo')
  const [clienteNombre, setClienteNombre]       = useState('')
  const [clienteId, setClienteId]               = useState(null)
  const [clientes, setClientes]                 = useState([])
  const [busquedaClienteNueva, setBusquedaClienteNueva] = useState('')
  const [montoRecibido, setMontoRecibido]       = useState('')

  // Historial
  const [ventas, setVentas]               = useState([])
  const [loadingVentas, setLoadingVentas] = useState(true)
  const [ventaDetalle, setVentaDetalle]   = useState(null)
  const [anulando, setAnulando]           = useState(null)
  const [busquedaCliente, setBusquedaCliente] = useState('')

 useEffect(() => {
    clientesAPI.getAll().then(d => setClientes(Array.isArray(d) ? d : (d.data || []))).catch(() => {})
    productosAPI.getAll()
      .then(d => setProductos(Array.isArray(d) ? d : (d.data || [])))
      .catch(() => {})
  }, [])

  async function cargarVentas() {
    setLoadingVentas(true)
    try {
      const d = await ventasAPI.getAll()
      const lista = Array.isArray(d) ? d : (d.data || [])
      setVentas([...lista].sort((a, b) => new Date(b.fecha || b.created_at) - new Date(a.fecha || a.created_at)))
    } catch (err) {
      addToast('Error al cargar ventas: ' + err.message, 'error')
    } finally {
      setLoadingVentas(false)
    }
  }

  useEffect(() => {
    if (tab === 'historial') cargarVentas()
  }, [tab])

  const productosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase()
    return productos.filter(p =>
      p.stock > 0 &&
      (p.nombre?.toLowerCase().includes(q) || p.codigo?.toLowerCase().includes(q))
    )
  }, [productos, busqueda])

  // Ventas filtradas por nombre de cliente
  const ventasFiltradas = useMemo(() => {
    if (!busquedaCliente.trim()) return ventas
    const q = busquedaCliente.toLowerCase()
    return ventas.filter(v => v.cliente_nombre?.toLowerCase().includes(q))
  }, [ventas, busquedaCliente])

  function agregarAlCarrito(producto) {
    setCarrito(prev => {
      const existe = prev.find(i => i.producto.id === producto.id)
      if (existe) {
        if (existe.cantidad >= producto.stock) {
          addToast('No hay más stock disponible', 'error')
          return prev
        }
        return prev.map(i => i.producto.id === producto.id
          ? { ...i, cantidad: i.cantidad + 1 } : i)
      }
      return [...prev, { producto, cantidad: 1 }]
    })
    setBusqueda('')
  }

  function cambiarCantidad(productoId, delta) {
    setCarrito(prev => prev.map(i => {
      if (i.producto.id !== productoId) return i
      const nueva = i.cantidad + delta
      if (nueva < 1) return i
      if (nueva > i.producto.stock) { addToast('Stock insuficiente', 'error'); return i }
      return { ...i, cantidad: nueva }
    }))
  }

  function quitarDelCarrito(productoId) {
    setCarrito(prev => prev.filter(i => i.producto.id !== productoId))
  }

  const total = useMemo(() =>
    carrito.reduce((acc, i) => acc + i.cantidad * Number(i.producto.precio), 0),
    [carrito]
  )

  const cambio = useMemo(() => {
    if (metodoPago !== 'efectivo') return null
    const recibido = parseFloat(montoRecibido)
    if (isNaN(recibido) || recibido < total) return null
    return recibido - total
  }, [montoRecibido, total, metodoPago])

  async function handleRegistrarVenta() {
    if (carrito.length === 0) { addToast('Agrega al menos un producto', 'error'); return }
    if (metodoPago === 'efectivo' && montoRecibido && parseFloat(montoRecibido) < total) {
      addToast('El monto recibido es menor al total', 'error'); return
    }
    setRegistrando(true)
    try {
      await ventasAPI.create({
        metodo_pago:    metodoPago,
        cliente_nombre: clienteNombre.trim() || null,
        cliente_id:     clienteId || null,
        monto_recibido: metodoPago === 'efectivo' && montoRecibido ? parseFloat(montoRecibido) : null,
        cambio:         cambio,
        items: carrito.map(i => ({
          producto_id:     i.producto.id,
          cantidad:        i.cantidad,
          precio_unitario: i.producto.precio,
        })),
      })
      addToast('Venta registrada correctamente', 'success')
      setCarrito([])
      setMetodoPago('efectivo')
            setClienteNombre('')
      setClienteId(null)
      setBusquedaClienteNueva('')
      setMontoRecibido('')
      productosAPI.getAll().then(d => setProductos(Array.isArray(d) ? d : (d.data || []))).catch(() => {})
    } catch (err) {
      addToast('Error al registrar venta: ' + err.message, 'error')
    } finally {
      setRegistrando(false)
    }
  }

  async function handleAnular(venta) {
    setAnulando(venta.id)
    try {
      await ventasAPI.anular(venta.id)
      addToast('Venta anulada correctamente', 'success')
      setVentaDetalle(null)
      cargarVentas()
    } catch (err) {
      addToast('Error al anular: ' + err.message, 'error')
    } finally {
      setAnulando(null)
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">Módulo de <span>Ventas</span></h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn ${tab === 'nueva' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('nueva')}>
            <Plus size={15} /> Nueva venta
          </button>
          <button className={`btn ${tab === 'historial' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('historial')}>
            Historial
          </button>
        </div>
      </div>

      {/* ── NUEVA VENTA ── */}
      {tab === 'nueva' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <h3 className="card-title">Agregar productos</h3>
              </div>
              <div className="card-body">
                {/* Nombre cliente */}
                <div className="form-group" style={{ marginBottom: 16, position: 'relative' }}>
                  <label className="form-label">Cliente (opcional)</label>
                  <div className="search-input-wrap">
                    <User size={15} />
                    <input
                      className="form-input"
                      placeholder="Buscar cliente registrado o escribir nombre…"
                      value={busquedaClienteNueva}
                      onChange={e => {
                        setBusquedaClienteNueva(e.target.value)
                        setClienteNombre(e.target.value)
                        setClienteId(null)
                      }}
                    />
                    {clienteId && <span style={{ fontSize: '0.75rem', color: 'var(--sage)', marginLeft: 8, whiteSpace: 'nowrap' }}>✓ registrado</span>}
                  </div>
                  {busquedaClienteNueva && !clienteId && (() => {
                    const q = busquedaClienteNueva.toLowerCase()
                    const matches = clientes.filter(c => c.nombre?.toLowerCase().includes(q)).slice(0, 5)
                    if (matches.length === 0) return null
                    return (
                      <div style={{
                        position: 'absolute', zIndex: 10, left: 0, right: 0,
                        border: '1px solid var(--cream-dark)', borderRadius: 'var(--radius)',
                        background: 'var(--white)', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      }}>
                        {matches.map(c => (
                          <button key={c.id} type="button" onClick={() => {
                            setClienteNombre(c.nombre)
                            setClienteId(c.id)
                           setBusquedaClienteNueva(c.nombre)
                          }} style={{
                            width: '100%', padding: '10px 16px', border: 'none',
                            background: 'var(--white)', cursor: 'pointer', textAlign: 'left',
                            borderBottom: '1px solid var(--cream)', fontSize: '0.875rem',
                          }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'var(--white)'}
                          >
                            <span style={{ fontWeight: 700 }}>{c.nombre}</span>
                            {c.telefono && <span style={{ opacity: 0.5, marginLeft: 8, fontSize: '0.78rem' }}>{c.telefono}</span>}
                          </button>
                        ))}
                      </div>
                    )
                  })()}
                </div>

                {/* Buscador productos */}
                <div className="search-input-wrap" style={{ marginBottom: 16 }}>
                  <Search size={16} />
                  <input
                    className="form-input"
                    placeholder="Buscar producto por nombre o código…"
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                  />
                </div>

                {busqueda && (
                  <div style={{
                    border: '1px solid var(--cream-dark)', borderRadius: 'var(--radius)',
                    overflow: 'hidden', maxHeight: 300, overflowY: 'auto',
                  }}>
                    {productosFiltrados.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--ink-soft)', opacity: 0.5, fontSize: '0.875rem' }}>
                        Sin resultados
                      </div>
                    ) : (
                      productosFiltrados.slice(0, 8).map(p => (
                        <button key={p.id} onClick={() => agregarAlCarrito(p)} style={{
                          width: '100%', display: 'flex', justifyContent: 'space-between',
                          alignItems: 'center', padding: '12px 16px', border: 'none',
                          background: 'var(--white)', cursor: 'pointer',
                          borderBottom: '1px solid var(--cream)', textAlign: 'left', gap: 12,
                        }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'var(--white)'}
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--ink)' }}>{p.nombre}</div>
                            <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>Stock: {p.stock}</div>
                          </div>
                          <div style={{ fontWeight: 700, color: 'var(--gold)', whiteSpace: 'nowrap' }}>
                            Q {fmt(p.precio)}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {carrito.length === 0 ? (
                  <div className="empty-state" style={{ padding: '40px 0' }}>
                    <ShoppingCart size={40} />
                    <p>Busca y agrega productos a la venta</p>
                  </div>
                ) : (
                  <div style={{ marginTop: busqueda ? 16 : 0 }}>
                    {carrito.map(({ producto, cantidad }) => (
                      <div key={producto.id} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 0', borderBottom: '1px solid var(--cream)',
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{producto.nombre}</div>
                          <div style={{ fontSize: '0.78rem', opacity: 0.5 }}>Q {fmt(producto.precio)} c/u</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button className="btn btn-secondary btn-icon btn-sm" onClick={() => cambiarCantidad(producto.id, -1)}><Minus size={13} /></button>
                          <span style={{ fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{cantidad}</span>
                          <button className="btn btn-secondary btn-icon btn-sm" onClick={() => cambiarCantidad(producto.id, 1)}><Plus size={13} /></button>
                        </div>
                        <div style={{ fontWeight: 700, minWidth: 72, textAlign: 'right' }}>Q {fmt(cantidad * producto.precio)}</div>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => quitarDelCarrito(producto.id)}><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Panel de pago */}
          <div className="card" style={{ position: 'sticky', top: 24 }}>
            <div className="card-header"><h3 className="card-title">Resumen</h3></div>
            <div className="card-body">
              <div style={{ marginBottom: 16 }}>
                {carrito.map(({ producto, cantidad }) => (
                  <div key={producto.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem', padding: '4px 0', color: 'var(--ink-soft)' }}>
                    <span>{producto.nombre} × {cantidad}</span>
                    <span>Q {fmt(cantidad * producto.precio)}</span>
                  </div>
                ))}
              </div>

              <hr className="divider" />

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem' }}>Total</span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.4rem', color: 'var(--gold)' }}>
                  Q {fmt(total)}
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Método de pago</label>
                <select className="form-select" value={metodoPago} onChange={e => { setMetodoPago(e.target.value); setMontoRecibido('') }}>
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="transferencia">Transferencia</option>
                </select>
              </div>

              {/* Cambio — solo en efectivo */}
              {metodoPago === 'efectivo' && (
                <div className="form-group" style={{ marginTop: 12 }}>
                  <label className="form-label">Monto recibido (Q)</label>
                  <input
                    className="form-input"
                    type="number"
                    min={total}
                    step="0.01"
                    placeholder={fmt(total)}
                    value={montoRecibido}
                    onChange={e => setMontoRecibido(e.target.value)}
                  />
                  {montoRecibido && (
                    <div style={{
                      marginTop: 10, padding: '10px 14px',
                      background: cambio !== null ? 'var(--cream)' : 'var(--red-pale)',
                      borderRadius: 'var(--radius)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                        {cambio !== null ? 'Cambio' : 'Monto insuficiente'}
                      </span>
                      {cambio !== null && (
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--sage)' }}>
                          Q {fmt(cambio)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              <button
                className="btn btn-primary"
                onClick={handleRegistrarVenta}
                disabled={registrando || carrito.length === 0}
                style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: '0.95rem', marginTop: 12 }}
              >
                {registrando
                  ? <><span className="spinner" style={{ width: 15, height: 15, borderWidth: 2 }} /> Registrando…</>
                  : 'Registrar venta'}
              </button>

              {carrito.length > 0 && (
                <button className="btn btn-ghost" onClick={() => setCarrito([])} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
                  Limpiar carrito
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORIAL ── */}
      {tab === 'historial' && (
        <div className="card">
          {/* Búsqueda por cliente */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--cream)' }}>
            <div className="search-input-wrap">
              <User size={15} />
              <input
                className="form-input"
                placeholder="Buscar por nombre de cliente…"
                value={busquedaCliente}
                onChange={e => setBusquedaCliente(e.target.value)}
              />
            </div>
          </div>

          {loadingVentas ? (
            <div className="loading-center">
              <div className="spinner" style={{ width: 28, height: 28 }} />
              <span>Cargando historial…</span>
            </div>
          ) : ventasFiltradas.length === 0 ? (
            <div className="empty-state">
              <ShoppingCart size={48} />
              <p>No hay ventas registradas</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Método</th>
                    <th className="text-right">Total</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {ventasFiltradas.map(v => (
                    <tr key={v.id}>
                      <td style={{ fontSize: '0.82rem' }}>{fmtFecha(v.fecha || v.created_at)}</td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <User size={13} style={{ opacity: 0.4 }} />
                          {v.cliente_nombre || <span style={{ opacity: 0.35, fontStyle: 'italic' }}>Sin nombre</span>}
                        </span>
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>{v.metodo_pago || '—'}</td>
                      <td className="text-right" style={{ fontWeight: 700 }}>Q {fmt(v.total)}</td>
                      <td>
                        <span className={`badge ${v.estado === 'anulada' ? 'badge-red' : 'badge-green'}`}>
                          {v.estado || 'completada'}
                        </span>
                      </td>
                      <td className="text-right">
                        <button className="btn btn-ghost btn-sm" onClick={() => setVentaDetalle(v)}>Ver detalle</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal detalle venta */}
      {ventaDetalle && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setVentaDetalle(null)}>
          <div className="modal modal-wide">
            <div className="modal-header">
              <h3 className="modal-title">Detalle de venta</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setVentaDetalle(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: 24, marginBottom: 20, flexWrap: 'wrap' }}>
                <div>
                  <div className="form-label">Fecha</div>
                  <div>{fmtFecha(ventaDetalle.fecha || ventaDetalle.created_at)}</div>
                </div>
                <div>
                  <div className="form-label">Cliente</div>
                  <div>{ventaDetalle.cliente_nombre || <span style={{ opacity: 0.4, fontStyle: 'italic' }}>Sin nombre</span>}</div>
                </div>
                <div>
                  <div className="form-label">Método de pago</div>
                  <div style={{ textTransform: 'capitalize' }}>{ventaDetalle.metodo_pago || '—'}</div>
                </div>
                {ventaDetalle.monto_recibido && (
                  <div>
                    <div className="form-label">Monto recibido</div>
                    <div>Q {fmt(ventaDetalle.monto_recibido)}</div>
                  </div>
                )}
                {ventaDetalle.cambio != null && (
                  <div>
                    <div className="form-label">Cambio</div>
                    <div style={{ color: 'var(--sage)', fontWeight: 700 }}>Q {fmt(ventaDetalle.cambio)}</div>
                  </div>
                )}
                <div>
                  <div className="form-label">Estado</div>
                  <span className={`badge ${ventaDetalle.estado === 'anulada' ? 'badge-red' : 'badge-green'}`}>
                    {ventaDetalle.estado || 'completada'}
                  </span>
                </div>
                <div>
                  <div className="form-label">Total</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--gold)' }}>
                    Q {fmt(ventaDetalle.total)}
                  </div>
                </div>
              </div>

              {ventaDetalle.detalle_ventas?.length > 0 && (
                <>
                  <hr className="divider" />
                  <h4 style={{ fontFamily: 'var(--font-display)', marginBottom: 12 }}>Productos</h4>
                  <table>
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th className="text-right">Cant.</th>
                        <th className="text-right">Precio</th>
                        <th className="text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ventaDetalle.detalle_ventas.map((d, i) => (
                        <tr key={i}>
                          <td>{d.productos?.nombre || d.producto_id}</td>
                          <td className="text-right">{d.cantidad}</td>
                          <td className="text-right">Q {fmt(d.precio_unitario)}</td>
                          <td className="text-right" style={{ fontWeight: 700 }}>Q {fmt(d.cantidad * d.precio_unitario)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {ventaDetalle.estado !== 'anulada' && (
                <div style={{
                  marginTop: 20, padding: '14px 16px', background: 'var(--red-pale)',
                  borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center',
                  gap: 10, fontSize: '0.85rem', color: 'var(--red-anular)',
                }}>
                  <AlertCircle size={16} />
                  Anular esta venta revertirá el stock de los productos.
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setVentaDetalle(null)}>Cerrar</button>
              {ventaDetalle.estado !== 'anulada' && (
                <button className="btn btn-danger" onClick={() => handleAnular(ventaDetalle)} disabled={anulando === ventaDetalle.id}>
                  {anulando === ventaDetalle.id
                    ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Anulando…</>
                    : 'Anular venta'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
