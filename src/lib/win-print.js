const { execSync, exec } = require('child_process');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

const PS_PRINT_SCRIPT = `
param($PrinterName, $FilePath)
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class RawPrint {
    [DllImport("winspool.drv", CharSet=CharSet.Auto, SetLastError=true)]
    public static extern bool OpenPrinter(string n, out IntPtr h, IntPtr d);
    [DllImport("winspool.drv")] public static extern bool ClosePrinter(IntPtr h);
    [DllImport("winspool.drv", CharSet=CharSet.Auto, SetLastError=true)]
    public static extern bool StartDocPrinter(IntPtr h, int lvl, ref DOC_INFO_1 di);
    [DllImport("winspool.drv")] public static extern bool EndDocPrinter(IntPtr h);
    [DllImport("winspool.drv")] public static extern bool StartPagePrinter(IntPtr h);
    [DllImport("winspool.drv")] public static extern bool EndPagePrinter(IntPtr h);
    [DllImport("winspool.drv")] public static extern bool WritePrinter(IntPtr h, IntPtr b, int c, out int w);
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Auto)]
    public struct DOC_INFO_1 { public string pDocName; public string pOutputFile; public string pDatatype; }
    public static bool Send(string printer, byte[] bytes) {
        IntPtr hPrinter;
        if (!OpenPrinter(printer, out hPrinter, IntPtr.Zero)) { Console.Error.WriteLine("OpenPrinter err="+System.Runtime.InteropServices.Marshal.GetLastWin32Error()); return false; }
        var di = new DOC_INFO_1 { pDocName="ESC/POS", pDatatype="RAW" };
        if (!StartDocPrinter(hPrinter, 1, ref di)) { Console.Error.WriteLine("StartDocPrinter err="+System.Runtime.InteropServices.Marshal.GetLastWin32Error()); ClosePrinter(hPrinter); return false; }
        StartPagePrinter(hPrinter);
        IntPtr ptr = System.Runtime.InteropServices.Marshal.AllocCoTaskMem(bytes.Length);
        System.Runtime.InteropServices.Marshal.Copy(bytes, 0, ptr, bytes.Length);
        int written; bool ok = WritePrinter(hPrinter, ptr, bytes.Length, out written);
        if (!ok) { Console.Error.WriteLine("WritePrinter err="+System.Runtime.InteropServices.Marshal.GetLastWin32Error()+" written="+written); }
        System.Runtime.InteropServices.Marshal.FreeCoTaskMem(ptr);
        EndPagePrinter(hPrinter); EndDocPrinter(hPrinter); ClosePrinter(hPrinter);
        return ok;
    }
}
"@
$bytes = [System.IO.File]::ReadAllBytes($FilePath)
$ok = [RawPrint]::Send($PrinterName, $bytes)
if ($ok) { exit 0 } else { exit 1 }
`;

function printRaw(printerName, buffer) {
  return new Promise((resolve, reject) => {
    const tmpBin = path.join(os.tmpdir(), `escpos_${Date.now()}.bin`);
    const tmpPs  = path.join(os.tmpdir(), `rawprint_${Date.now()}.ps1`);

    fs.writeFileSync(tmpBin, buffer);
    fs.writeFileSync(tmpPs, PS_PRINT_SCRIPT, 'utf8');

    const cmd = `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${tmpPs}" -PrinterName "${printerName}" -FilePath "${tmpBin}"`;

    exec(cmd, (err, stdout, stderr) => {
      try { fs.unlinkSync(tmpBin); } catch {}
      try { fs.unlinkSync(tmpPs);  } catch {}

      if (err) return reject(new Error(stderr || err.message));
      resolve({ ok: true });
    });
  });
}

function listPrinters() {
  const cmd = `powershell -NoProfile -Command "Get-WmiObject Win32_Printer | Select-Object Name,Default,PrinterStatus,PortName | ConvertTo-Json -Compress"`;
  const output = execSync(cmd, { encoding: 'utf8' });
  const raw = JSON.parse(output);
  const list = Array.isArray(raw) ? raw : [raw];

  return list.map((p) => ({
    name:      p.Name,
    isDefault: p.Default === true,
    status:    p.PrinterStatus === 3 ? 'READY' : 'UNKNOWN',
    portName:  p.PortName || null,
    isThermal: isThermalByName(p.Name),
  }));
}

function isThermalByName(name) {
  const lower = (name || '').toLowerCase();
  return ['thermal','pos','58mm','80mm','xprinter','xp-','epson tm',
          'star','bixolon','rongta','zkteco','gprinter','generic text',
          'receipt','escpos'].some((k) => lower.includes(k));
}

module.exports = { printRaw, listPrinters };
