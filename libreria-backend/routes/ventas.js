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
router.post("/", async (req, res) => {
  const { usuario_id, items } = req.body;
  // items: [{ producto_id, cantidad, precio_unitario }]

  if (!items || items.length === 0)
    return res.status(400).json({ success: false, message: "La venta debe tener al menos un producto" });

  // Calcular total
  const total = items.reduce((sum, i) => sum + i.cantidad * i.precio_unitario, 0);

  // Insertar venta
  const { cliente_nombre, cliente_id, metodo_pago, monto_recibido, cambio } = req.body

  const { data: venta, error: errVenta } = await supabase
    .from("ventas")
    .insert([{
      usuario_id,
      total:          parseFloat(total.toFixed(2)),
      cliente_nombre: cliente_nombre || null,
      cliente_id:     cliente_id || null,
      metodo_pago:    metodo_pago || 'efectivo',
      monto_recibido: monto_recibido || null,
      cambio:         cambio || null,
    }])
    .select()
    .single();

  if (errVenta) return res.status(400).json({ success: false, message: errVenta.message });

  // Insertar detalle
  const detalle = items.map(i => ({
    venta_id:        venta.id,
    producto_id:     i.producto_id,
    cantidad:        i.cantidad,
    precio_unitario: i.precio_unitario,
    subtotal:        parseFloat((i.cantidad * i.precio_unitario).toFixed(2))
  }));

  const { error: errDetalle } = await supabase.from("detalle_ventas").insert(detalle);

  if (errDetalle) return res.status(400).json({ success: false, message: errDetalle.message });

  res.status(201).json({ success: true, message: "Venta registrada", data: venta });
});

// PUT /ventas/:id/anular
router.put("/:id/anular", async (req, res) => {
  const { data, error } = await supabase
    .from("ventas")
    .update({ estado: "anulada" })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ success: false, message: error.message });
  res.json({ success: true, message: "Venta anulada", data });
});

module.exports = router;