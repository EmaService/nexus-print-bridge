const path = require('path');
const fs   = require('fs');
const os   = require('os');

const exeDir = path.dirname(process.execPath);
const envPath = path.join(exeDir, '.env');

if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else {
  require('dotenv').config();
}

require('./index');
