const { spawnSync } = require('child_process');
const path = require('path');

const isWin = process.platform === 'win32';
const script = isWin
  ? { cmd: 'powershell', args: ['-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'build-android.ps1')] }
  : { cmd: 'bash', args: [path.join(__dirname, 'build-android.sh')] };

const res = spawnSync(script.cmd, script.args, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
process.exit(res.status ?? 0);
