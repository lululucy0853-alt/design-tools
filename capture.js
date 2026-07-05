// 粘 URL → 抓 <title>+meta 描述 → 追加一行进 inbox/inbox.md。
// 用法: node tools/capture.js <URL> [备注]   (python 版见 capture.py;本机 python 是商店空壳,用这个)
const https = require('https'), http = require('http'), fs = require('fs'), path = require('path');
const INBOX = path.join(__dirname, '..', 'inbox', 'inbox.md');
const url = process.argv[2];
const note = process.argv.slice(3).join(' ').trim();
if (!url) { console.log('用法: node tools/capture.js <URL> [备注]'); process.exit(1); }
function unescape(s){ return s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim(); }
function fetch(u, cb, redirects=0){
  const lib = u.startsWith('http://') ? http : https;
  const req = lib.get(u, {headers:{'User-Agent':'Mozilla/5.0'}, rejectUnauthorized:false, timeout:30000}, res=>{
    if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location && redirects<5){
      res.resume(); return fetch(new URL(res.headers.location, u).href, cb, redirects+1);
    }
    let data=''; res.setEncoding('utf8'); res.on('data',d=>data+=d); res.on('end',()=>cb(null,data));
  });
  req.on('error', e=>cb(e)); req.on('timeout', ()=>{ req.destroy(); cb(new Error('timeout')); });
}
fetch(url, (err, body)=>{
  let title='', desc='';
  if (!err && body){
    const mt = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i); if (mt) title = unescape(mt[1]);
    const md = body.match(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["']/i); if (md) desc = unescape(md[1]);
  }
  const tag = err ? `(抓取失败:${err.message})` : (note || title || desc || '(无标题)');
  const line = `- [${new Date().toISOString().slice(0,10)}] ${url} — ${tag}`;
  fs.appendFileSync(INBOX, '\n'+line+'\n', 'utf8');
  console.log('[captured]', line);
});
