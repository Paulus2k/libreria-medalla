import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { TrendingUp, Package, ShoppingBag, AlertTriangle } from 'lucide-react'
import { reportesAPI } from '../services/api'

function fmt(n) {
  return Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [resumen, setResumen] = useState(null)
  const [ventasDia, setVentasDia] = useState([])
  const [topProductos, setTopProductos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function cargar() {
      try {
        const [r, v, p] = await Promise.all([
          reportesAPI.resumen(),
          reportesAPI.ventasPorDia(),
          reportesAPI.productosMasVendidos(),
        ])
        setResumen(r.data || r)
        // Normalizar fechas para el gráfico
        const dias = Array.isArray(v) ? v : (v.data || [])
        setVentasDia(dias.map(d => ({
          ...d,
          fecha: d.fecha ? new Date(d.fecha).toLocaleDateString('es-GT', { day: '2-digit', month: 'short' }) : d.fecha,
          total: Number(d.total || 0),
        })))
        setTopProductos(Array.isArray(p) ? p : (p.data || []))
      } catch (err) {
        console.error('Error cargando reportes:', err)
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [])

  const kpis = resumen ? [
    {
      label: 'Ventas hoy',
      value: `Q ${fmt(resumen.ventas_hoy || resumen.ventasHoy)}`,
      icon: TrendingUp,
      variant: 'gold',
    },
    {
      label: 'Ventas este mes',
      value: `Q ${fmt(resumen.ventas_mes || resumen.ventasMes)}`,
      icon: ShoppingBag,
      variant: 'coffee',
    },
    {
      label: 'Productos activos',
      value: resumen.total_productos || resumen.totalProductos || 0,
      icon: Package,
      variant: 'sage',
    },
   {
      label: 'Stock medio',
      value: resumen.productos_medio_stock || resumen.productosMedioStock || 0,
      icon: AlertTriangle,
      variant: 'gold',
      onClick: () => navigate('/inventario?filtro=medio'),
    },
    {
      label: 'Stock bajo',
      value: resumen.productos_bajo_stock || resumen.productosBajoStock || 0,
      icon: AlertTriangle,
      variant: 'red',
      onClick: () => navigate('/inventario?filtro=bajo'),
    },
  ] : []

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-center">
          <div className="spinner" style={{ width: 32, height: 32 }} />
          <span>Cargando reportes…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">Dashboard <span>general</span></h2>
          <p className="page-subtitle">
            {new Date().toLocaleDateString('es-GT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
     {kpis.map((k, i) => (
          <div key={i} className="kpi-card" onClick={k.onClick}
            style={{ cursor: k.onClick ? 'pointer' : 'default' }}>
            <div className={`kpi-icon ${k.variant}`}>
              <k.icon size={22} />
            </div>
            <div>
              <div className="kpi-value">{k.value}</div>
              <div className="kpi-label">{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 8 }}>

        {/* Ventas por día */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Ventas por día</h3>
          </div>
          <div className="card-body">
            {ventasDia.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 0' }}>
                <p>Sin datos de ventas todavía</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={ventasDia} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c8952a" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#c8952a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--cream-dark)" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: 'var(--ink-soft)', opacity: 0.5 }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--ink-soft)', opacity: 0.5 }} tickFormatter={v => `Q${v}`} />
                  <Tooltip
                    formatter={(v) => [`Q ${fmt(v)}`, 'Total']}
                    contentStyle={{ fontFamily: 'var(--font-body)', fontSize: 13, borderRadius: 8, border: '1px solid var(--cream-dark)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="var(--gold)"
                    strokeWidth={2.5}
                    fill="url(#colorVentas)"
                    dot={{ fill: 'var(--gold)', r: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Productos más vendidos */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Productos más vendidos</h3>
          </div>
          <div className="card-body">
            {topProductos.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 0' }}>
                <p>Sin datos de productos todavía</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={topProductos.slice(0, 6)}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--cream-dark)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--ink-soft)', opacity: 0.5 }} />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    width={110}
                    tick={{ fontSize: 11, fill: 'var(--ink-soft)' }}
                    tickFormatter={v => v?.length > 14 ? v.slice(0, 14) + '…' : v}
                  />
                  <Tooltip
                    formatter={(v) => [v, 'Unidades']}
                    contentStyle={{ fontFamily: 'var(--font-body)', fontSize: 13, borderRadius: 8, border: '1px solid var(--cream-dark)' }}
                  />
                  <Bar dataKey="total_vendido" fill="var(--coffee-light)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Resumen adicional si hay datos */}
      {resumen && (
        <div style={{ marginTop: 20 }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Resumen del período</h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
                {[
                  { label: 'Total de ventas (mes)', value: `Q ${fmt(resumen.ventas_mes || resumen.ventasMes)}` },
                  { label: 'Número de transacciones', value: resumen.num_ventas || resumen.numVentas || '—' },
                  { label: 'Ticket promedio', value: `Q ${fmt(resumen.ticket_promedio || resumen.ticketPromedio)}` },
                ].map((item, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: '12px 0' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--gold)' }}>
                      {item.value}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', opacity: 0.55, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
