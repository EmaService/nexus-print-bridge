const router = require('express').Router();
const { listPrinters, printRaw } = require('../lib/win-print');
const { read, write }            = require('../lib/config');

router.get('/', (req, res) => {
  try {
    const printers = listPrinters();
    const config   = read();
    res.json({
      printers,
      selected:   config.printerName  || null,
      paperWidth: config.paperWidth   || 58,
    });
  } catch (err) {
    res.status(500).json({ error: `Error al listar impresoras: ${err.message}` });
  }
});

router.post('/select', (req, res) => {
  const { printerName, paperWidth } = req.body;
  if (!printerName) return res.status(400).json({ error: 'printerName requerido' });

  const available = listPrinters().map((p) => p.name);
  if (!available.includes(printerName)) {
    return res.status(404).json({
      error: `Impresora "${printerName}" no encontrada`,
      available,
    });
  }

  write({ printerName, paperWidth: paperWidth || 58 });
  res.json({ ok: true, printerName, paperWidth: paperWidth || 58 });
});

module.exports = router;
