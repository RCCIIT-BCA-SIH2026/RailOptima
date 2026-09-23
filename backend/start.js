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

const env = { ...process.env, PYTHONPATH: rootDir };

console.log(`\n=================================================================`);
console.log(`🚀 Starting RailOptima FastAPI Backend (http://127.0.0.1:8000)...`);
console.log(`Executable: ${pythonCmd}`);
console.log(`=================================================================\n`);

const child = spawn(pythonCmd, ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000', '--reload'], {
  cwd: __dirname,
  env: env,
  stdio: 'inherit'
});

child.on('error', (err) => {
  console.error('❌ Failed to start backend server:', err.message);
});
