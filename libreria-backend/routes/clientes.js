const express  = require("express");
const router   = express.Router();
const supabase = require("../supabaseClient");

// GET /clientes
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("clientes")
    .select("*, ventas(id, total, fecha, estado)")
    .order("nombre");
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data });
});

// POST /clientes
router.post("/", async (req, res) => {
  const { nombre, telefono, correo } = req.body;
  if (!nombre) return res.status(400).json({ success: false, message: "Nombre requerido" });
  const { data, error } = await supabase
    .from("clientes")
    .insert([{ nombre, telefono, correo }])
    .select().single();
  if (error) return res.status(400).json({ success: false, message: error.message });
  res.status(201).json({ success: true, data });
});

// PUT /clientes/:id
router.put("/:id", async (req, res) => {
  const { nombre, telefono, correo } = req.body;
  const { data, error } = await supabase
    .from("clientes")
    .update({ nombre, telefono, correo })
    .eq("id", req.params.id)
    .select().single();
  if (error) return res.status(400).json({ success: false, message: error.message });
  res.json({ success: true, data });
});

// DELETE /clientes/:id
router.delete("/:id", async (req, res) => {
  const { error } = await supabase.from("clientes").delete().eq("id", req.params.id);
  if (error) return res.status(400).json({ success: false, message: error.message });
  res.json({ success: true, message: "Cliente eliminado" });
});

module.exports = router;