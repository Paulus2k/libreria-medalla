require("dotenv").config();
const express = require("express");
const cors    = require("cors");

if (!process.env.JWT_SECRET) throw new Error("Configura JWT_SECRET en el backend.");
const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors())
app.use(express.json({ limit: "2mb" }));
app.use("/comercio", require("./routes/comercio"));

// ── Rutas ──
app.use("/auth",       require("./routes/auth"));
app.use(require("./middleware/auth"));
app.use('/contabilidad', require('./routes/contabilidad'));
app.use("/productos",  require("./routes/productos"));
app.use("/ventas",     require("./routes/ventas"));
app.use("/inventario", require("./routes/inventario"));
app.use("/reportes",    require("./routes/reportes"));
app.use("/categorias",  require("./routes/categorias"));
app.use("/proveedores", require("./routes/proveedores"));
app.use("/clientes", require("./routes/clientes"));
app.use('/lista-compras', require('./routes/listaCompras'))

// ── 404 ──
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Ruta ${req.method} ${req.path} no encontrada` });
});

app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));

