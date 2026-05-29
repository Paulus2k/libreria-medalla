const express  = require("express");
const router   = express.Router();
const supabase = require("../supabaseClient");

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
  const { nombre, descripcion, precio, categoria, stock, stock_minimo, codigo } = req.body;

  if (!nombre || !precio || !categoria)
    return res.status(400).json({ success: false, message: "Faltan campos requeridos: nombre, precio, categoria" });

  const { data, error } = await supabase
    .from("productos")
    .insert([{ nombre, descripcion, precio, categoria, stock: stock || 0, stock_minimo: stock_minimo || 5, codigo: codigo || null }])
    .select()
    .single();

  if (error) return res.status(400).json({ success: false, message: error.message });
  res.status(201).json({ success: true, message: "Producto creado", data });
});

// PUT /productos/:id
router.put("/:id", async (req, res) => {
  const { nombre, descripcion, precio, categoria, stock, stock_minimo, codigo } = req.body;

  const { data, error } = await supabase
    .from("productos")
    .update({ nombre, descripcion, precio, categoria, stock, stock_minimo, codigo })
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
    .filter("stock", "lte", supabase.raw("stock_minimo"))
    .order("stock");

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data });
});

module.exports = router;