require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/ping', (_req, res) => res.json({ ok: true }));

app.use('/status',   require('./routes/status'));
app.use('/printers', require('./routes/printers'));
app.use('/print',   require('./routes/print'));

const port = parseInt(process.env.PORT || '9100', 10);
app.listen(port, '127.0.0.1', () => {
  console.log(`nexus-print-bridge listening on http://127.0.0.1:${port}`);
});
