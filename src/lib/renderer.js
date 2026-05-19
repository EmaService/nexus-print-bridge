const { ThermalPrinter, PrinterTypes, CharacterSet } = require('node-thermal-printer');
const { read }     = require('./config');
const { printRaw } = require('./win-print');

async function renderAndPrint(job) {
  const config      = read();
  const printerName = job.printer    || config.printerName;
  const paperWidth  = job.width      || config.paperWidth || 58;
  const charCols    = paperWidth >= 80 ? 48 : 32;

  if (!printerName) {
    throw new Error('No hay impresora seleccionada. Ve a Configuración → Impresora.');
  }

  const printer = new ThermalPrinter({
    type:                  PrinterTypes.EPSON,
    interface:             'tcp://127.0.0.1:0',
    characterSet:          CharacterSet.PC858_EURO,
    removeSpecialCharacters: false,
    lineCharacter:         '-',
    width:                 charCols,
  });

  printer.clear();

  for (const el of (job.ticket || [])) {
    await processElement(printer, el, charCols);
  }

  const buffer = printer.getBuffer();
  if (!buffer || buffer.length === 0) {
    throw new Error('El ticket generó un buffer vacío');
  }

  await printRaw(printerName, buffer);
  return { ok: true, bytes: buffer.length, printer: printerName };
}

async function processElement(printer, el, charCols) {
  switch (el.type) {

    case 'text': {
      applyAlign(printer, el.align);
      printer.bold(!!el.bold);
      if (el.size === 'double')      { printer.setTextDoubleHeight(); }
      else if (el.size === 'wide')   { printer.setTextDoubleWidth(); }
      else if (el.size === 'tall')   { printer.setTextDoubleHeight(); }
      else                           { printer.setTextNormal(); }
      printer.println(sanitize(el.value || ''));
      printer.bold(false);
      printer.setTextNormal();
      break;
    }

    case 'row': {
      printer.bold(!!el.bold);
      printer.leftRight(sanitize(String(el.left || '')), sanitize(String(el.right || '')));
      printer.bold(false);
      break;
    }

    case 'table': {
      if (!Array.isArray(el.rows) || el.rows.length === 0) break;
      const isHeader = el.header !== false;
      el.rows.forEach((row, rowIdx) => {
        const cells = row.map((c) => sanitize(String(c ?? '')));
        const colCount = cells.length;

        if (colCount === 2) {
          printer.tableCustom([
            { text: cells[0], align: 'LEFT',  width: 0.55 },
            { text: cells[1], align: 'RIGHT', width: 0.45 },
          ]);
        } else if (colCount === 3) {
          printer.tableCustom([
            { text: cells[0], align: 'LEFT',  width: 0.12 },
            { text: cells[1], align: 'LEFT',  width: 0.58 },
            { text: cells[2], align: 'RIGHT', width: 0.30 },
          ]);
        } else {
          const w = parseFloat((1 / colCount).toFixed(2));
          printer.tableCustom(cells.map((c, i) => ({
            text: c, width: w,
            align: i === colCount - 1 ? 'RIGHT' : 'LEFT',
          })));
        }

        if (rowIdx === 0 && isHeader && el.rows.length > 1) {
          printer.drawLine();
        }
      });
      break;
    }

    case 'line': {
      printer.drawLine();
      break;
    }

    case 'feed': {
      const lines = el.lines || 1;
      for (let i = 0; i < lines; i++) printer.newLine();
      break;
    }

    case 'qr': {
      if (!el.value) break;
      printer.alignCenter();
      await printer.printQR(el.value, {
        cellSize:   el.size       || 6,
        correction: el.correction || 'M',
        model:      el.model      || 2,
      });
      break;
    }

    case 'image': {
      if (!el.src) break;
      try {
        const base64 = el.src.replace(/^data:image\/\w+;base64,/, '');
        const buf    = Buffer.from(base64, 'base64');
        printer.alignCenter();
        await printer.printImageBuffer(buf);
      } catch (e) {
        console.warn('No se pudo imprimir imagen:', e.message);
      }
      break;
    }

    case 'cut': {
      printer.cut();
      break;
    }

    case 'bold': {
      printer.bold(el.value !== false);
      break;
    }

    case 'align': {
      applyAlign(printer, el.value);
      break;
    }

    default:
      console.warn(`[renderer] Elemento desconocido: ${el.type}`);
  }
}

function applyAlign(printer, align) {
  if (align === 'center')      printer.alignCenter();
  else if (align === 'right')  printer.alignRight();
  else                         printer.alignLeft();
}

function sanitize(str) {
  return String(str)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .normalize('NFC');
}

module.exports = { renderAndPrint };
