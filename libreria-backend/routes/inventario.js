const express  = require("express");
const router   = express.Router();
const supabase = require("../supabaseClient");

// GET /inventario/historial
router.get("/historial", async (req, res) => {
  const { data, error } = await supabase
    .from("historial_inventario")
    .select(`*, productos(nombre), usuarios(nombre)`)
    .order("fecha", { ascending: false });

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data });
});

// POST /inventario/movimiento — entrada, salida o ajuste manual
router.post("/movimiento", async (req, res) => {
  const { producto_id, usuario_id, tipo_movimiento, cantidad, motivo } = req.body;

  if (!producto_id || !tipo_movimiento || !cantidad)
    return res.status(400).json({ success: false, message: "Faltan campos requeridos" });

  // Obtener stock actual
  const { data: producto, error: errProd } = await supabase
    .from("productos")
    .select("stock")
    .eq("id", producto_id)
    .single();

  if (errProd) return res.status(404).json({ success: false, message: "Producto no encontrado" });

  // Calcular nuevo stock
  let nuevoStock = producto.stock;
  if (tipo_movimiento === "entrada")  nuevoStock += parseInt(cantidad);
  if (tipo_movimiento === "salida")   nuevoStock -= parseInt(cantidad);
  if (tipo_movimiento === "ajuste")   nuevoStock  = parseInt(cantidad);

  if (nuevoStock < 0)
    return res.status(400).json({ success: false, message: "Stock insuficiente para esta salida" });

  // Actualizar stock
  const { error: errStock } = await supabase
    .from("productos")
    .update({ stock: nuevoStock })
    .eq("id", producto_id);

  if (errStock) return res.status(400).json({ success: false, message: errStock.message });

  // Registrar en historial
  const { data, error } = await supabase
    .from("historial_inventario")
    .insert([{ producto_id, usuario_id, tipo_movimiento, cantidad: parseInt(cantidad), motivo }])
    .select()
    .single();

  if (error) return res.status(400).json({ success: false, message: error.message });

  res.status(201).json({ success: true, message: "Movimiento registrado", data, stock_actual: nuevoStock });
});

module.exports = router;