// Run a frozen survival-playtest.mjs with each Worker hosted in its own Node process.
// node tools/survival-playtest-processes.mjs <runner.mjs> [runner options]

import { fork } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { createRequire, syncBuiltinESMExports } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const launcher = fileURLToPath(import.meta.url);
const threads = createRequire(import.meta.url)('node:worker_threads');
const NativeWorker = threads.Worker;

export class ProcessWorker extends EventEmitter {
  #child;
  #closed;

  constructor(url) {
    super();
    this.#child = fork(launcher, ['--playtest-worker', url.href], {
      serialization: 'advanced', stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
    });
    this.#child.on('message', (result) => this.emit('message', result));
    this.#child.on('error', (error) => this.emit('error', error));
    this.#closed = new Promise((done) => this.#child.once('close', (code) => {
      done(code);
      this.emit('exit', code);
    }));
  }

  postMessage(job) {
    this.#child.send(job, (error) => {
      if (error) this.emit('error', error);
    });
  }

  terminate() {
    if (this.#child.connected) this.#child.send(null, (error) => {
      if (error) this.#child.kill();
    });
    return this.#closed;
  }
}

function hostWorker(url) {
  const worker = new NativeWorker(new URL(url));
  process.on('message', (job) => {
    if (job === null) worker.terminate();
    else worker.postMessage(job);
  });
  process.on('disconnect', () => worker.terminate());
  worker.on('message', (result) => {
    if (process.connected) process.send(result);
  });
  worker.on('error', (error) => console.error(error));
  worker.on('exit', (code) => {
    process.exitCode = code;
    if (process.connected) process.disconnect();
  });
}

if (process.argv[1] && resolve(process.argv[1]) === launcher) {
  const [, , entry, url] = process.argv;
  if (entry === '--playtest-worker') {
    hostWorker(url);
  } else {
    if (!entry) throw new Error('Specify a frozen survival-playtest.mjs path followed by its options');
    const runner = pathToFileURL(resolve(entry));
    process.argv.splice(1, 1);
    threads.Worker = ProcessWorker;
    syncBuiltinESMExports();
    await import(runner.href);
  }
}
