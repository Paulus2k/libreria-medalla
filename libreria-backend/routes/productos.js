const express  = require("express");
const router   = express.Router();
const supabase = require("../supabaseClient");

router.use((req, res, next) => {
  if (!['POST', 'PUT'].includes(req.method)) return next();
  const p = req.body;
  if (!p || !String(p.nombre || '').trim() || !String(p.categoria || '').trim()) return res.status(400).json({ message: 'Nombre y categoría son obligatorios.' });
  for (const k of ['precio','costo','stock','stock_minimo']) {
    const n = Number(p[k] ?? (k === 'stock_minimo' ? 5 : 0));
    if (!Number.isFinite(n) || n < 0 || (k === 'precio' && n <= 0) || (['stock','stock_minimo'].includes(k) && !Number.isInteger(n))) return res.status(400).json({ message: `Valor inválido: ${k}` });
  }
  if (p.imagen_url) {
    try { const u = new URL(p.imagen_url); if (u.protocol !== 'https:' || u.username || u.password) throw new Error(); }
    catch { return res.status(400).json({ message: 'La imagen debe ser una URL HTTPS pública.' }); }
  }
  next();
});

// GET /productos
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .order("nombre");

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data });
});

// GET /productos/:id
router.get("/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error) return res.status(404).json({ success: false, message: "Producto no encontrado" });
  res.json({ success: true, data });
});

// POST /productos
router.post("/", async (req, res) => {
  const { nombre, descripcion, precio, categoria, stock, stock_minimo, codigo, costo, imagen_url, afecto_iva=true } = req.body;

  if (!nombre || !precio || !categoria)
    return res.status(400).json({ success: false, message: "Faltan campos requeridos: nombre, precio, categoria" });

  const { data, error } = await supabase
    .from("productos")
    .insert([{ nombre, descripcion, precio, categoria, stock: stock || 0, stock_minimo: stock_minimo ?? 5, codigo: codigo || null, costo: Number(costo || 0), imagen_url: imagen_url || null, afecto_iva:!!afecto_iva }])
    .select()
    .single();

  if (error) return res.status(400).json({ success: false, message: error.message });
  res.status(201).json({ success: true, message: "Producto creado", data });
});

// PUT /productos/:id
router.put("/:id", async (req, res) => {
  const { nombre, descripcion, precio, categoria, stock, stock_minimo, codigo, costo, imagen_url, afecto_iva=true } = req.body;

  const { data, error } = await supabase
    .from("productos")
    .update({ nombre, descripcion, precio, categoria, stock, stock_minimo, codigo, costo: Number(costo || 0), imagen_url: imagen_url || null, afecto_iva:!!afecto_iva })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ success: false, message: error.message });
  res.json({ success: true, message: "Producto actualizado", data });
});

// DELETE /productos/:id
router.delete("/:id", async (req, res) => {
  const { error } = await supabase
    .from("productos")
    .delete()
    .eq("id", req.params.id);

  if (error) return res.status(400).json({ success: false, message: error.message });
  res.json({ success: true, message: "Producto eliminado" });
});

// GET /productos/alertas/stock-bajo
router.get("/alertas/stock-bajo", async (req, res) => {
  const { data, error } = await supabase
    .from("productos")
    .select("*")

    .order("stock");

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data: data.filter(p => Number(p.stock) <= Number(p.stock_minimo)) });
});

module.exports = router;

