const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const venvPythonMac = path.join(rootDir, '.venv', 'bin', 'python3');
const venvPythonWin = path.join(rootDir, '.venv', 'Scripts', 'python.exe');

let pythonCmd = 'python3';
if (fs.existsSync(venvPythonMac)) {
  pythonCmd = venvPythonMac;
} else if (fs.existsSync(venvPythonWin)) {
  pythonCmd = venvPythonWin;
} else {
  pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
}

const host = process.env.HOST || '0.0.0.0';
const port = process.env.PORT || '8000';
const env = { ...process.env, PYTHONPATH: rootDir };

console.log(`\n=================================================================`);
console.log(`🚀 Starting RailOptima FastAPI Backend (${host}:${port})...`);
console.log(`Executable: ${pythonCmd}`);
console.log(`=================================================================\n`);

const uvicornArgs = ['-m', 'uvicorn', 'app.main:app', '--host', host, '--port', String(port)];

if (process.env.NODE_ENV !== 'production' && !process.env.RENDER) {
  uvicornArgs.push('--reload');
}

const child = spawn(pythonCmd, uvicornArgs, {
  cwd: __dirname,
  env: env,
  stdio: 'inherit'
});

child.on('error', (err) => {
  console.error('❌ Failed to start backend server:', err.message);
});
