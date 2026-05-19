const express = require('express');
const { listPrinters } = require('../lib/win-print');
const auth = require('../lib/auth');

const router = express.Router();

router.get('/printers', auth, (req, res) => {
  try {
    const printers = listPrinters();
    res.json({ printers });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/ps-check', (req, res) => {
  const { execSync } = require('child_process');
  try {
    execSync('powershell -NoProfile -Command "Write-Output ok"', { encoding: 'utf8' });
    res.json({ powershell: true });
  } catch (e) {
    res.json({ powershell: false, error: e.message });
  }
});

module.exports = router;
