// md → 带中文字体样式的 HTML。用法: node md2html.js <input.md> <output.html>
// 之后用 Edge 无头打印成 PDF(见全局 CLAUDE.md「导出」规则)。
const fs = require('fs');
const path = require('path');
const src = process.argv[2];
const outPath = process.argv[3];
let md = fs.readFileSync(src, 'utf8');
const mdDir = path.dirname(src);

function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function slug(h){return h.trim().replace(/\s+/g,'-');}
function inline(s){
  s = esc(s);
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function(m,alt,isrc){ try{ var abs=path.resolve(mdDir,isrc); var buf=fs.readFileSync(abs); var ext=isrc.split('.').pop().toLowerCase(); var mime=ext==='svg'?'image/svg+xml':ext==='png'?'image/png':(ext==='jpg'||ext==='jpeg')?'image/jpeg':'application/octet-stream'; return '<img alt="'+alt+'" src="data:'+mime+';base64,'+buf.toString('base64')+'" style="max-width:100%;display:block;margin:12px auto;border:1px solid #eadfd9;border-radius:6px;">'; }catch(e){ return '[图缺失:'+isrc+']'; } });
  s = s.replace(/\[\[#([^\]|]+)\|([^\]]+)\]\]/g, function(m,h,a){return '<a href="#'+slug(h)+'">'+a+'</a>';});
  s = s.replace(/\[\[#([^\]]+)\]\]/g, function(m,h){return '<a href="#'+slug(h)+'">'+h+'</a>';});
  s = s.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2');
  s = s.replace(/\[\[([^\]]+)\]\]/g, '$1');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  return s;
}

const lines = md.split(/\r?\n/);
let html = [];
let i = 0;
while (i < lines.length) {
  let line = lines[i];
  if (/^```/.test(line)) {
    let buf = []; i++;
    while (i < lines.length && !/^```/.test(lines[i])) { buf.push(esc(lines[i])); i++; }
    i++;
    html.push('<pre><code>' + buf.join('\n') + '</code></pre>');
    continue;
  }
  if (/^---+\s*$/.test(line)) { html.push('<hr>'); i++; continue; }
  let h = line.match(/^(#{1,6})\s+(.*)$/);
  if (h) { let lv = h[1].length; html.push('<h' + lv + ' id="' + slug(h[2]) + '">' + inline(h[2]) + '</h' + lv + '>'); i++; continue; }
  if (/\|/.test(line) && i + 1 < lines.length && /\|/.test(lines[i+1]) && /^\s*\|?[\s:]*-{2,}/.test(lines[i+1])) {
    let header = line; let rows = []; i += 2;
    while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim() !== '') { rows.push(lines[i]); i++; }
    const cells = r => r.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(c => c.trim());
    let t = '<table><thead><tr>' + cells(header).map(c => '<th>' + inline(c) + '</th>').join('') + '</tr></thead><tbody>';
    for (const r of rows) { t += '<tr>' + cells(r).map(c => '<td>' + inline(c) + '</td>').join('') + '</tr>'; }
    t += '</tbody></table>';
    html.push(t); continue;
  }
  if (/^>\s?/.test(line)) {
    let buf = [];
    while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(inline(lines[i].replace(/^>\s?/, ''))); i++; }
    html.push('<blockquote>' + buf.join('<br>') + '</blockquote>'); continue;
  }
  if (/^\s*[-*]\s+/.test(line)) {
    let buf = [];
    while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { buf.push('<li>' + inline(lines[i].replace(/^\s*[-*]\s+/, '')) + '</li>'); i++; }
    html.push('<ul>' + buf.join('') + '</ul>'); continue;
  }
  if (/^\s*\d+\.\s+/.test(line)) {
    let buf = [];
    while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { buf.push('<li>' + inline(lines[i].replace(/^\s*\d+\.\s+/, '')) + '</li>'); i++; }
    html.push('<ol>' + buf.join('') + '</ol>'); continue;
  }
  if (line.trim() === '') { i++; continue; }
  html.push('<p>' + inline(line) + '</p>'); i++;
}

const css = `
@page { size: A4; margin: 15mm 16mm; }
* { box-sizing: border-box; }
body { font-family: "Microsoft YaHei","Segoe UI",sans-serif; color:#1c1c1c; line-height:1.55; font-size:13px; margin:0; }
h1{font-size:24px;border-bottom:2px solid #D85A30;padding-bottom:6px;margin-bottom:0;}
h1 + p{font-size:17px;color:#993C1D;font-weight:500;margin:8px 0 14px;}
h2{font-size:16px;color:#993C1D;margin-top:16px;margin-bottom:6px;border-bottom:1px solid #eadfd9;padding-bottom:3px;}
h3{font-size:14px;margin-top:14px;margin-bottom:4px;}
table{border-collapse:collapse;width:100%;margin:10px 0;font-size:12px;}
th,td{border:1px solid #d9cfc9;padding:6px 8px;text-align:left;vertical-align:top;}
th{background:#FAECE7;}
code{background:#f3efe9;padding:1px 5px;border-radius:4px;font-size:12px;}
pre{background:#f6f2ec;padding:10px 12px;border-radius:6px;overflow:auto;}
pre code{background:none;padding:0;font-family:Consolas,"Microsoft YaHei",monospace;white-space:pre;}
blockquote{border-left:3px solid #D85A30;margin:14px 0;padding:10px 14px;color:#555;background:#fbf6f3;}
a{color:#993C1D;text-decoration:none;}
p{margin:6px 0;}
ul,ol{padding-left:22px;margin:6px 0;}
li{margin:4px 0;}
hr{border:none;border-top:1px solid #e5ddd6;margin:16px 0;}
table,pre,blockquote,h1,h2{page-break-inside:avoid;}
`;

const out = '<!DOCTYPE html><html lang="zh"><head><meta charset="utf-8"><style>' + css + '</style></head><body>' + html.join('\n') + '</body></html>';
fs.writeFileSync(outPath, out, 'utf8');
console.log('HTML written: ' + outPath);
