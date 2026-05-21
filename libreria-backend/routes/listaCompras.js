const express  = require('express')
const router   = express.Router()
const supabase = require('../supabaseClient')

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('lista_compras')
    .select('*')
    .order('completado')
    .order('created_at', { ascending: false })
  if (error) return res.status(500).json({ success: false, message: error.message })
  res.json({ success: true, data })
})

router.post('/', async (req, res) => {
  const { descripcion, prioridad, fecha_limite } = req.body
  if (!descripcion) return res.status(400).json({ success: false, message: 'Descripción requerida' })
  const { data, error } = await supabase
    .from('lista_compras')
    .insert([{ descripcion, prioridad: prioridad || 'media', fecha_limite: fecha_limite || null }])
    .select().single()
  if (error) return res.status(400).json({ success: false, message: error.message })
  res.status(201).json({ success: true, data })
})

router.put('/:id', async (req, res) => {
  const { completado, descripcion, prioridad, fecha_limite } = req.body
  const campos = {}
  if (completado !== undefined) campos.completado = completado
  if (descripcion !== undefined) campos.descripcion = descripcion
  if (prioridad   !== undefined) campos.prioridad   = prioridad
  if (fecha_limite !== undefined) campos.fecha_limite = fecha_limite
  const { data, error } = await supabase
    .from('lista_compras')
    .update(campos)
    .eq('id', req.params.id)
    .select().single()
  if (error) return res.status(400).json({ success: false, message: error.message })
  res.json({ success: true, data })
})

router.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('lista_compras').delete().eq('id', req.params.id)
  if (error) return res.status(400).json({ success: false, message: error.message })
  res.json({ success: true, message: 'Item eliminado' })
})

module.exports = router