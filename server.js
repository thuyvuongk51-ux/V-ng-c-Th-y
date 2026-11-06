// Game server for "Phi Vụ Hoàn Hảo".
// Serves the game page and runs every room's match in its own worker thread,
// so players' browsers only send input and draw what the server reports.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Worker } = require('worker_threads');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 10000;
const MAX_ROOMS = +process.env.MAX_ROOMS || 6;
const PAGE = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');

// the page learns it is served by this server and talks WebSocket instead of peer-to-peer
const SERVED = PAGE.replace('<head>', '<head>\n<script>window.PVHH_WS=(location.protocol==="https:"?"wss://":"ws://")+location.host+"/ws";</script>');
const a = PAGE.indexOf('<script>\n(()=>{') + '<script>\n'.length, b = PAGE.lastIndexOf('})();\n</script>') + '})();\n'.length;
const GAME_JS = PAGE.slice(a, b);

const server = http.createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200, { 'content-type': 'text/plain' }); res.end('ok ' + rooms.size + ' phòng'); return; }
  if (req.url === '/' || req.url.startsWith('/?') || req.url === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' }); res.end(SERVED); return;
  }
  res.writeHead(404); res.end();
});

const rooms = new Map();   // code -> {worker, socks: Map(id -> ws), empty}
let nextId = 1;
const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => { let c; do { c = Array.from({ length: 5 }, () => ABC[Math.floor(Math.random() * ABC.length)]).join(''); } while (rooms.has(c)); return c; };

function makeRoom() {
  const code = newCode();
  const worker = new Worker(path.join(__dirname, 'room.js'), { workerData: { code, js: GAME_JS } });
  const room = { code, worker, socks: new Map(), empty: Date.now() };
  worker.on('message', o => {
    if (o.to) { const ws = room.socks.get(o.to); if (ws && ws.readyState === 1) ws.send(o.s); return; }
    for (const [id, ws] of room.socks) if (id !== o.except && ws.readyState === 1) ws.send(o.s);
  });
  worker.on('error', e => { console.error('room', code, e); closeRoom(room); });
  worker.on('exit', () => closeRoom(room));
  rooms.set(code, room);
  console.log('room open', code, 'rooms', rooms.size);
  return room;
}
function closeRoom(room) {
  if (!rooms.has(room.code)) return;
  rooms.delete(room.code);
  for (const ws of room.socks.values()) try { ws.close(); } catch (e) {}
  room.worker.terminate();
  console.log('room closed', room.code, 'rooms', rooms.size);
}
// rooms nobody is in for a minute are shut down
setInterval(() => { for (const r of rooms.values()) if (!r.socks.size && Date.now() - r.empty > 60000) closeRoom(r); }, 15000);

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 64 * 1024 });
wss.on('connection', ws => {
  const id = 'p' + (nextId++);
  let room = null;
  ws.isAlive = true; ws.on('pong', () => ws.isAlive = true);
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (!room) {
      const name = String(m.name || 'Người chơi').slice(0, 12);
      if (m.t === 'create') {
        if (rooms.size >= MAX_ROOMS) { ws.send(JSON.stringify({ t: 'nojoin', msg: 'Máy chủ đang đủ phòng, thử lại sau ít phút.' })); return; }
        room = makeRoom();
      } else if (m.t === 'join') {
        room = rooms.get(String(m.code || '').toUpperCase());
        if (!room) { ws.send(JSON.stringify({ t: 'nojoin', msg: 'Không tìm thấy phòng ' + m.code + '. Kiểm tra lại mã.' })); return; }
      } else return;
      room.socks.set(id, ws);
      ws.send(JSON.stringify({ t: 'you', id, code: room.code }));
      room.worker.postMessage({ k: 'data', id, m: { t: 'hello', name } });
      return;
    }
    room.worker.postMessage({ k: 'data', id, m });
  });
  ws.on('close', () => {
    if (!room) return;
    room.socks.delete(id); if (!room.socks.size) room.empty = Date.now();
    room.worker.postMessage({ k: 'leave', id });
  });
});
// drop sockets that stopped answering (closed tabs, lost Wi-Fi)
setInterval(() => wss.clients.forEach(ws => { if (!ws.isAlive) return ws.terminate(); ws.isAlive = false; ws.ping(); }), 20000);

server.listen(PORT, () => console.log('Phi Vụ Hoàn Hảo server on port', PORT));
