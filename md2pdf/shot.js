// shot.js <htmlPath> <outPng> [cssWidth=620] [scale=2]
// 用 Node 自带 WebSocket 驱动 Edge headless(CDP),按内容真实高度整页截图。
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const htmlPath = process.argv[2];
const outPng = process.argv[3];
const cssWidth = parseInt(process.argv[4] || "620", 10);
const scale = parseFloat(process.argv[5] || "2");
const PORT = 9000 + Math.floor(Math.random() * 800);

const fileUrl = "file:///" + path.resolve(htmlPath).replace(/\\/g, "/");
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "edgeshot-"));

const edge = spawn(EDGE, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  "--hide-scrollbars", "--remote-debugging-port=" + PORT,
  "--user-data-dir=" + profile, fileUrl,
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    }).on("error", reject);
  });
}

async function findPageTarget() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await getJson(`http://127.0.0.1:${PORT}/json/list`);
      const t = list.find((x) => x.type === "page" && x.webSocketDebuggerUrl);
      if (t) return t;
    } catch (e) {}
    await sleep(250);
  }
  throw new Error("no page target");
}

function cdp(ws) {
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? reject(new Error(m.error.message)) : resolve(m.result);
    } else if (m.method) {
      listeners.forEach((fn) => fn(m));
    }
  });
  return {
    send: (method, params = {}) =>
      new Promise((resolve, reject) => {
        const myId = ++id;
        pending.set(myId, { resolve, reject });
        ws.send(JSON.stringify({ id: myId, method, params }));
      }),
    on: (fn) => listeners.push(fn),
  };
}

(async () => {
  const target = await findPageTarget();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res) => (ws.onopen = res));
  const c = cdp(ws);

  await c.send("Page.enable");
  await c.send("Runtime.enable");
  // 强制视口宽度,缩放清晰度
  await c.send("Emulation.setDeviceMetricsOverride", {
    width: cssWidth, height: 900, deviceScaleFactor: scale, mobile: false,
  });
  // 给字体/排版留时间
  await sleep(900);

  const metrics = await c.send("Page.getLayoutMetrics");
  const size = metrics.cssContentSize || metrics.contentSize;
  const height = Math.ceil(size.height);

  const shot = await c.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: cssWidth, height, scale: 1 },
  });
  fs.writeFileSync(outPng, Buffer.from(shot.data, "base64"));
  console.log("OK", outPng, cssWidth + "x" + height, "@" + scale + "x");

  ws.close();
  edge.kill();
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {}
  process.exit(0);
})().catch((e) => { console.error("ERR", e.message); edge.kill(); process.exit(1); });
