// One room = one worker thread running the game's own code with no screen.
// The browser APIs it touches are replaced by harmless stand-ins.
const { parentPort, workerData } = require('worker_threads');

// a stand-in object: any property, call or loop on it works and does nothing
const noop = () => {};
const stub = new Proxy(function () {}, {
  get(t, k) {
    if (k === Symbol.toPrimitive) return () => 0;
    if (k === Symbol.iterator) return function* () {};
    if (k === 'length' || k === 'width' || k === 'height' || k === 'clientWidth' || k === 'clientHeight') return 0;
    if (k === 'then') return undefined;
    if (k === 'matches' || k === 'hidden' || k === 'checked') return false;
    if (k === 'value' || k === 'textContent' || k === 'innerHTML' || k === 'innerText') return '';
    return stub;
  },
  set() { return true; },
  apply() { return stub; },
  construct() { return stub; },
});

const g = globalThis;
g.window = g;
g.__HEADLESS = true;
g.document = stub;
g.navigator = { vibrate: noop, clipboard: stub, userAgent: 'server' };
g.matchMedia = () => ({ matches: false, addEventListener: noop });
g.localStorage = { getItem: () => null, setItem: noop, removeItem: noop };
g.addEventListener = noop; g.removeEventListener = noop;
g.innerWidth = 1280; g.innerHeight = 720; g.devicePixelRatio = 1;
g.screen = stub; g.location = { protocol: 'http:', host: 'server', href: '' };
const TICK = 1000 / 30;
g.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), TICK);
g.THREE = require('three');
// no GPU on the server: the renderer only needs to exist
g.THREE.WebGLRenderer = function () { return stub; };

g.__out = (to, except, m) => parentPort.postMessage({ to, except, s: JSON.stringify(m) });

try {
  (0, eval)(workerData.js);
} catch (e) {
  console.error('game script failed in room', workerData.code, e);
  process.exit(1);
}
g.__room.init(workerData.code);
parentPort.on('message', o => {
  try {
    if (o.k === 'data') g.__room.data(o.id, o.m);
    else if (o.k === 'leave') g.__room.leave(o.id);
  } catch (e) { console.error('room', workerData.code, e); }
});
process.on('uncaughtException', e => console.error('room', workerData.code, e));
