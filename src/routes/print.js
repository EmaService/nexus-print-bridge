const router = require('express').Router();
const { renderAndPrint } = require('../lib/renderer');
const { read }           = require('../lib/config');

router.post('/', async (req, res) => {
  if (!req.body || !Array.isArray(req.body.ticket)) {
    return res.status(400).json({ error: 'Body inválido. Esperado: { ticket: [] }' });
  }
  try {
    const result = await renderAndPrint(req.body);
    res.json(result);
  } catch (err) {
    console.error('[print] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/test', async (req, res) => {
  const config = read();
  const job = {
    width: config.paperWidth || 58,
    ticket: [
      { type: 'text',  value: 'NEXUS PRINT BRIDGE', bold: true, size: 'double', align: 'center' },
      { type: 'text',  value: 'Sistema de impresion termica', align: 'center' },
      { type: 'line' },
      { type: 'row',   left: 'Impresora:', right: config.printerName || 'N/A' },
      { type: 'row',   left: 'Papel:',     right: `${config.paperWidth || 58}mm` },
      { type: 'row',   left: 'Version:',   right: require('../../package.json').version },
      { type: 'line' },
      { type: 'table', rows: [
        ['Can', 'Producto',         'Total'],
        ['2',   'Llanta 185/65R15', '$3,400'],
        ['1',   'Alineacion',       '$399'],
      ]},
      { type: 'line' },
      { type: 'row',   left: 'TOTAL:', right: '$3,799', bold: true },
      { type: 'feed',  lines: 1 },
      { type: 'text',  value: 'Escanea para facturar:', align: 'center' },
      { type: 'qr',    value: 'https://nexus-erp.vercel.app', size: 5 },
      { type: 'text',  value: 'Si imprimio bien: EXITO', align: 'center' },
      { type: 'feed',  lines: 2 },
      { type: 'cut' },
    ],
  };

  try {
    const result = await renderAndPrint(job);
    res.json(result);
  } catch (err) {
    console.error('[print/test] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
