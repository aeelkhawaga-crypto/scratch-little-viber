/*
 * Start the webpack development server and the local Hugging Face proxy
 * together so `npm start` provides the complete Vibe Coding development
 * environment.
 */
const path = require('path');
const {spawn} = require('child_process');

const proxy = spawn(process.execPath, [
    path.join(__dirname, '..', 'src', 'lib', 'hf-proxy-server.js')
], {stdio: 'inherit'});

const webpack = spawn(process.execPath, [
    path.join(__dirname, '..', 'node_modules', 'webpack', 'bin', 'webpack.js'),
    'serve'
], {stdio: 'inherit'});

let shuttingDown = false;

const shutdown = code => {
    if (shuttingDown) return;
    shuttingDown = true;
    if (!proxy.killed) proxy.kill('SIGTERM');
    if (!webpack.killed) webpack.kill('SIGTERM');
    process.exitCode = typeof code === 'number' ? code : 0;
};

proxy.on('exit', code => {
    if (!shuttingDown && code) shutdown(code);
});

webpack.on('exit', code => {
    if (!shuttingDown) shutdown(code || 0);
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
