const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function getToken() {
  return localStorage.getItem('token')
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }
  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  } catch (networkError) {
    throw new Error('No se pudo conectar al servidor')
  }
  if (res.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    window.location.href = '/login'
    throw new Error('Inicia sesión nuevamente.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || data.message || `Error ${res.status}`)
  return data
}

export const authAPI = {
  login:    (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  registro: (nombre, email, password, rol) => request('/auth/registro', { method: 'POST', body: JSON.stringify({ nombre, email, password, rol }) }),
}

export const productosAPI = {
  subirImagen: (archivo) => {
    const body = new FormData()
    body.append('imagen', archivo)
    return request('/productos/imagen', { method: 'POST', body })
  },
  getAll:  ()         => request('/productos'),
  create:  (data)     => request('/productos', { method: 'POST', body: JSON.stringify(data) }),
  update:  (id, data) => request(`/productos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete:  (id)       => request(`/productos/${id}`, { method: 'DELETE' }),
}

export const categoriasAPI = {
  getAll:  ()       => request('/categorias'),
  create:  (nombre) => request('/categorias', { method: 'POST', body: JSON.stringify({ nombre }) }),
  delete:  (id)     => request(`/categorias/${id}`, { method: 'DELETE' }),
}

export const ventasAPI = {
  getAll:  ()     => request('/ventas'),
  create:  (data) => request('/ventas', { method: 'POST', body: JSON.stringify(data) }),
  anular:  (id)   => request(`/ventas/${id}/anular`, { method: 'PUT' }),
}

export const inventarioAPI = {
  getHistorial: ()     => request('/inventario/historial'),
  movimiento:   (data) => request('/inventario/movimiento', { method: 'POST', body: JSON.stringify(data) }),
}

export const reportesAPI = {
  resumen:              () => request('/reportes/resumen'),
  ventasPorDia:         () => request('/reportes/ventas-por-dia'),
  productosMasVendidos: () => request('/reportes/productos-mas-vendidos'),
}

export const proveedoresAPI = {
  restaurar:id=>request(`/proveedores/${id}/restaurar`,{method:'PUT'}),
  updatePago:(id,data)=>request('/proveedores/pagos/'+id,{method:'PUT',body:JSON.stringify(data)}),
  getAll:        (archivados=false) => request('/proveedores'+(archivados?'?archivados=1':'')),
  create:        (data)       => request('/proveedores', { method: 'POST', body: JSON.stringify(data) }),
  update:        (id, data)   => request(`/proveedores/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete:        (id)         => request(`/proveedores/${id}`, { method: 'DELETE' }),
  getPagos:      (id)         => request(`/proveedores/${id}/pagos`),
  getTodosPagos: ()           => request('/proveedores/pagos/todos'),
  createPago:    (id, data)   => request(`/proveedores/${id}/pagos`, { method: 'POST', body: JSON.stringify(data) }),
  marcarPagado:  (pagoId,data) => request(`/proveedores/pagos/${pagoId}/marcar-pagado`, { method: 'PUT',body:JSON.stringify(data) }),
  deletePago:    (pagoId)     => request(`/proveedores/pagos/${pagoId}`, { method: 'DELETE' }),
}

export const clientesAPI = {
  getAll:  ()         => request('/clientes'),
  create:  (data)     => request('/clientes', { method: 'POST', body: JSON.stringify(data) }),
  update:  (id, data) => request(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete:  (id)       => request(`/clientes/${id}`, { method: 'DELETE' }),
}

export const comercioAPI = {
  historial:()=>request('/comercio/historial'),
  facturas: () => request('/comercio/facturas'),
  vender: data => request('/comercio/facturas', { method: 'POST', body: JSON.stringify(data) }),
  anular: id => request(`/comercio/facturas/${id}/anular`, { method: 'PUT' }),
  importar: data => request('/comercio/importar', { method: 'POST', body: JSON.stringify(data) }),
}

export const contabilidadAPI={
 get:()=>request('/contabilidad'),
 apertura:data=>request('/contabilidad/apertura',{method:'POST',body:JSON.stringify(data)}),
 asiento:data=>request('/contabilidad/asientos',{method:'POST',body:JSON.stringify(data)}),
 abonar:data=>request('/contabilidad/abonos',{method:'POST',body:JSON.stringify(data)}),
}


