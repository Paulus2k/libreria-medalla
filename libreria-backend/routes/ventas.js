const express  = require("express");
const router   = express.Router();
const supabase = require("../supabaseClient");

// GET /ventas
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("ventas")
    .select(`*, usuarios(nombre), detalle_ventas(*, productos(nombre))`)
    .order("fecha", { ascending: false });

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data });
});

// GET /ventas/:id
router.get("/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("ventas")
    .select(`*, usuarios(nombre), detalle_ventas(*, productos(nombre, precio))`)
    .eq("id", req.params.id)
    .single();

  if (error) return res.status(404).json({ success: false, message: "Venta no encontrada" });
  res.json({ success: true, data });
});

// POST /ventas  — crea venta + detalle en una sola llamada
router.post("/", (req, res) => res.status(410).json({ message: "Registra nuevas ventas desde Catálogo y caja." }));

// PUT /ventas/:id/anular
router.put("/:id/anular", (req, res) => res.status(410).json({ message: "Las ventas anteriores se conservan para consulta. Requieren revisión contable para anularse." }));

module.exports = router;
