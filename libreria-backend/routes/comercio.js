const router = require('express').Router();
const db = require('../supabaseClient');
const { todas, ventasUnificadas } = require('../lib/ventasUnificadas');
router.use(require('../middleware/auth'));
router.get('/historial', async (req,res) => {
  try { res.json({data:await ventasUnificadas(db)}); }
  catch(e){res.status(400).json({message:e.message});}
});
router.get('/facturas', async (req, res) => {
  try { const data=await todas(db,'comercio_facturas');res.json({data:data.sort((a,b)=>new Date(b.fecha)-new Date(a.fecha))}); }
  catch(e){res.status(400).json({message:e.message});}
});
router.post('/facturas', async (req, res) => {
  const { data, error } = await db.rpc('comercio_vender', { pedido: {...req.body,vendedora:req.usuario.nombre||'Vendedora'}, vendedor: String(req.usuario.id) });
  if (error) return res.status(400).json({ message: error.message });
  res.status(201).json({ data });
});
router.put('/facturas/:id/anular', async (req, res) => {
  const { data, error } = await db.rpc('comercio_anular', { factura_id: req.params.id });
  if (error) return res.status(400).json({ message: error.message });
  res.json({ data });
});
router.post('/importar', async (req, res) => {
  if (!Array.isArray(req.body.filas) || !req.body.filas.length || req.body.filas.length > 1000)
    return res.status(400).json({ message: 'Carga entre 1 y 1000 productos por archivo.' });
  for (const p of req.body.filas) {
    if (!p || ['codigo','nombre','categoria'].some(k => typeof p[k] !== 'string' || !p[k].trim() || p[k].length > 200)) return res.status(400).json({ message: 'Código, nombre y categoría son obligatorios (máximo 200 caracteres).' });
    for (const k of ['precio','costo','stock','stock_minimo']) {
      const n = Number(p[k]);
      if (p[k] === '' || p[k] == null || !Number.isFinite(n) || n < 0 || n > 99999999 || (k === 'precio' && n === 0) || (['stock','stock_minimo'].includes(k) && !Number.isInteger(n))) return res.status(400).json({ message: `Valor inválido en ${p.codigo}: ${k}` });
    }
  }
  const { data, error } = await db.rpc('comercio_importar_contable', { filas: req.body.filas, referencia: String(req.body.archivo || 'CSV').slice(0, 200), vendedor: String(req.usuario.id),contrapartida:req.body.contrapartida||null });
  if (error) return res.status(400).json({ message: error.message });
  res.json({ data });
});
module.exports = router;

