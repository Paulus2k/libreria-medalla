const express  = require("express");
const router   = express.Router();
const supabase = require("../supabaseClient");

// ── PROVEEDORES ──

// GET /proveedores
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("proveedores")
    .select("*")
    .order("nombre");
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data });
});

// POST /proveedores
router.post("/", async (req, res) => {
  const { nombre, correo, telefono, locacion } = req.body;
  if (!nombre) return res.status(400).json({ success: false, message: "Nombre requerido" });
  const { data, error } = await supabase
    .from("proveedores")
    .insert([{ nombre, correo, telefono, locacion }])
    .select()
    .single();
  if (error) return res.status(400).json({ success: false, message: error.message });
  res.status(201).json({ success: true, data });
});

// PUT /proveedores/:id
router.put("/:id", async (req, res) => {
  const { nombre, correo, telefono, locacion } = req.body;
  const { data, error } = await supabase
    .from("proveedores")
    .update({ nombre, correo, telefono, locacion })
    .eq("id", req.params.id)
    .select()
    .single();
  if (error) return res.status(400).json({ success: false, message: error.message });
  res.json({ success: true, data });
});

// DELETE /proveedores/:id
router.delete("/:id", async (req, res) => {
  const { error } = await supabase.from("proveedores").delete().eq("id", req.params.id);
  if (error) return res.status(400).json({ success: false, message: error.message });
  res.json({ success: true, message: "Proveedor eliminado" });
});

// ── PAGOS ──

// GET /proveedores/:id/pagos
router.get("/:id/pagos", async (req, res) => {
  const { data, error } = await supabase
    .from("pagos_proveedores")
    .select("*")
    .eq("proveedor_id", req.params.id)
    .order("fecha_pago");
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data });
});

// GET /proveedores/pagos/todos — todos los pagos con info del proveedor
router.get("/pagos/todos", async (req, res) => {
  const { data, error } = await supabase
    .from("pagos_proveedores")
    .select("*, proveedores(nombre)")
    .order("fecha_pago");
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data });
});

// POST /proveedores/:id/pagos
router.post("/:id/pagos", async (req, res) => {
  const { monto, fecha_pago, notas } = req.body;
  if (!monto || !fecha_pago)
    return res.status(400).json({ success: false, message: "Monto y fecha son requeridos" });
  const { data, error } = await supabase
    .from("pagos_proveedores")
    .insert([{ proveedor_id: req.params.id, monto, fecha_pago, notas, estado: "pendiente" }])
    .select()
    .single();
  if (error) return res.status(400).json({ success: false, message: error.message });
  res.status(201).json({ success: true, data });
});

// PUT /proveedores/pagos/:pagoId/marcar-pagado
router.put("/pagos/:pagoId/marcar-pagado", async (req, res) => {
  const { data, error } = await supabase
    .from("pagos_proveedores")
    .update({ estado: "pagado" })
    .eq("id", req.params.pagoId)
    .select()
    .single();
  if (error) return res.status(400).json({ success: false, message: error.message });
  res.json({ success: true, data });
});

// DELETE /proveedores/pagos/:pagoId
router.delete("/pagos/:pagoId", async (req, res) => {
  const { error } = await supabase.from("pagos_proveedores").delete().eq("id", req.params.pagoId);
  if (error) return res.status(400).json({ success: false, message: error.message });
  res.json({ success: true, message: "Pago eliminado" });
});

module.exports = router;