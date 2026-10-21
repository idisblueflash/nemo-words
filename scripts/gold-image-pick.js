#!/usr/bin/env node
// The image-pick gold set (data/gold/image-pick/): a local page to label grids, and a
// report on the labels so far.
//
//   node scripts/gold-image-pick.js            → http://localhost:8791 (label round 1)
//   node scripts/gold-image-pick.js --round 2  → label again into labels.r2.json
//   node scripts/gold-image-pick.js report     → counts, problems, self-agreement
//
// The page never shows the earlier pick (the cell cropped for the card), so it can't
// pull the label toward it. Each change is saved at once.
// Grid PNGs are gitignored, so in a worktree they come from the main checkout
// (or from GOLD_IMG_DIR).
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { labelProblems, cellsWith, okSet, summarize } = require('./lib/gold-image-pick');

const ROOT = path.join(__dirname, '..');
const DIR = process.env.GOLD_DIR || path.join(ROOT, 'data', 'gold', 'image-pick');
const PORT = Number(process.env.PORT) || 8791;
const FILE_RE = /^[A-Za-z0-9'._-]+\.png$/;

function imageDir() {
  if (process.env.GOLD_IMG_DIR) return process.env.GOLD_IMG_DIR;
  const own = path.join(ROOT, 'images', 'mnemonic');
  if (fs.existsSync(own) && fs.readdirSync(own).some((f) => f.endsWith('.grid.png'))) return own;
  const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: ROOT, encoding: 'utf8' }).trim();
  return path.join(path.dirname(common), 'images', 'mnemonic');
}

const labelsFile = (round) => path.join(DIR, round === 1 ? 'labels.json' : `labels.r${round}.json`);
const readJson = (f, empty) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : empty);
const readGrids = () => readJson(path.join(DIR, 'grids.json'), []);

function report() {
  const grids = readGrids();
  const labels = readJson(labelsFile(1), {});
  const s = summarize(grids, labels);
  const lines = [
    `labeled ${s.labeled} of ${s.grids} grids (dev ${s.bySplit.dev}, test ${s.bySplit.test})`,
    `no good cell (all weak or wrong): ${s.noneGood}`,
    `mean ok-set size: ${s.meanOk.toFixed(1)} cells; mean weak: ${s.meanWeak.toFixed(1)} cells; mean wrong: ${s.meanWrong.toFixed(1)} cells`,
    `earlier pick (the card's crop) on ${s.earlier.compared} grids: same best ${s.earlier.sameBest}, in ok set ${s.earlier.inOk}, marked wrong ${s.earlier.markedWrong}`,
  ];
  const r2 = readJson(labelsFile(2), null);
  if (r2) {
    const both = grids.filter((g) => !labelProblems(labels[g.id]).length && !labelProblems(r2[g.id]).length);
    const same = both.filter((g) => cellsWith(labels[g.id], 'best')[0] === cellsWith(r2[g.id], 'best')[0]).length;
    const inOk = both.filter((g) => okSet(labels[g.id]).includes(cellsWith(r2[g.id], 'best')[0])).length;
    lines.push(`round 2 on ${both.length} grids: same best ${same}, round-2 best in round-1 ok set ${inOk}`);
  }
  const open = grids.filter((g) => labels[g.id] && labelProblems(labels[g.id]).length);
  for (const g of open) lines.push(`- ${g.id} ${g.word}: ${labelProblems(labels[g.id]).join('; ')}`);
  console.log(lines.join('\n'));
}

function serve(round) {
  const imgDir = imageDir();
  const file = labelsFile(round);
  http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const send = (code, type, body) => { res.writeHead(code, { 'content-type': type }); res.end(body); };
    if (url.pathname === '/') return send(200, 'text/html; charset=utf-8', PAGE);
    if (url.pathname === '/data.json') {
      // Leave out earlierPick: the page must not show it.
      const grids = readGrids().map(({ earlierPick, ...g }) => g);
      const guide = fs.readFileSync(path.join(DIR, 'guidelines.md'), 'utf8');
      const version = (guide.match(/\(v(\d+)\)/) || [])[1] || '?';
      return send(200, 'application/json', JSON.stringify({ round, version, grids, labels: readJson(file, {}) }));
    }
    if (url.pathname.startsWith('/grid/')) {
      const name = decodeURIComponent(url.pathname.slice(6));
      const img = path.join(imgDir, name);
      if (!FILE_RE.test(name) || !fs.existsSync(img)) return send(404, 'text/plain', 'no grid');
      return send(200, 'image/png', fs.readFileSync(img));
    }
    if (url.pathname === '/label' && req.method === 'POST') {
      let body = '';
      req.on('data', (d) => (body += d));
      req.on('end', () => {
        const { id, label } = JSON.parse(body);
        if (!readGrids().some((g) => g.id === id)) return send(400, 'text/plain', 'unknown grid');
        const labels = readJson(file, {});
        labels[id] = { ...label, at: new Date().toISOString() };
        fs.writeFileSync(file, JSON.stringify(labels, null, 2) + '\n');
        send(200, 'application/json', JSON.stringify({ problems: labelProblems(labels[id]) }));
      });
      return;
    }
    send(404, 'text/plain', 'not found');
  }).listen(PORT, () => console.log(`gold-set labeling (round ${round}): http://localhost:${PORT}\nimages: ${imgDir}\nlabels: ${file}`));
}

const PAGE = `<!doctype html><html><head><meta charset="utf-8"><title>Gold set: image pick</title>
<style>
:root{--bg:#faf8f4;--fg:#222;--muted:#777;--line:#ddd;--best:#1a7f37;--ok:#5aa6e8;--weak:#b08900;--wrong:#d1242f}
body{margin:0;font:15px/1.4 system-ui,sans-serif;background:var(--bg);color:var(--fg);display:flex;height:100vh}
nav{width:190px;border-right:1px solid var(--line);overflow:auto;padding:8px}
nav div{padding:4px 6px;border-radius:4px;cursor:pointer;display:flex;justify-content:space-between}
nav div.on{background:#e8e2d6} .dot{font-size:11px;color:var(--muted)} .dot.done{color:var(--best)}
main{flex:1;overflow:auto;padding:16px 24px}
.cols{display:flex;gap:24px;align-items:flex-start}
.left{flex:0 0 auto;width:min(720px,calc(100vh - 150px))}
.right{flex:1;min-width:260px;max-width:420px}
h2{margin:0 0 4px} .story{font-size:18px;margin-bottom:10px} .meta{color:var(--muted);font-size:13px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.cell{position:relative;aspect-ratio:1;background-size:300% 300%;border:4px solid transparent;border-radius:6px;cursor:pointer}
.cell .n{position:absolute;top:4px;left:6px;background:#fff9;padding:0 5px;border-radius:3px;font-weight:600}
.cell .m{position:absolute;bottom:4px;right:6px;color:#fff;padding:1px 6px;border-radius:3px;font-weight:600}
.cell.best{border-color:var(--best)} .cell.best .m{background:var(--best)}
.cell.ok{border-color:var(--ok)} .cell.ok .m{background:var(--ok)}
.cell.weak{border-color:var(--weak)} .cell.weak .m{background:var(--weak)}
.cell.wrong{border-color:var(--wrong)} .cell.wrong .m{background:var(--wrong)}
.cell.wrong{opacity:.7}
.notes input,.reason textarea{width:100%;box-sizing:border-box;padding:6px;font:inherit}
.reason textarea{min-height:8em;resize:vertical}
.notes label{display:block;margin-top:6px}
.problems{color:var(--wrong);margin-top:8px} .saved{color:var(--best)}
.help{color:var(--muted);font-size:13px;margin:6px 0 10px}
.legend{position:sticky;top:8px;z-index:1;background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:8px 10px;font-size:13px;margin-bottom:10px}
.legend div{margin:3px 0} .legend b{display:inline-block;min-width:44px;color:#fff;padding:0 5px;border-radius:3px;text-align:center;margin-right:6px}
button{font:inherit;padding:4px 12px}
</style></head><body><nav id="nav"></nav><main id="main"></main>
<script>
const ORDER=[undefined,'ok','best','weak','wrong'];
let D, cur=0;
fetch('/data.json').then(r=>r.json()).then(d=>{D=d;draw();});
const lab=id=>D.labels[id]||(D.labels[id]={cells:{},notes:{},reason:''});
function draw(){
  const nav=document.getElementById('nav');
  nav.innerHTML='<div class="meta">round '+D.round+' · guidelines v'+D.version+'</div>'+D.grids.map((g,i)=>{
    const l=D.labels[g.id], done=l&&l.reason&&Object.keys(l.cells).length===9&&Object.values(l.cells).filter(m=>m==='best').length===(Object.values(l.cells).some(m=>m==='best'||m==='ok')?1:0);
    return '<div class="'+(i===cur?'on':'')+'" onclick="go('+i+')"><span>'+g.id+' '+g.word+'</span><span class="dot '+(done?'done':'')+'">'+(done?'●':'○')+'</span></div>';}).join('');
  const g=D.grids[cur], l=lab(g.id);
  let h='<h2>'+g.word+'</h2><div class="meta">'+g.id+' · '+g.split+' · batch '+g.batch+'</div><div class="story">'+g.story+'</div>';
  h+='<div class="cols"><div class="left"><div class="grid">';
  for(let c=1;c<=9;c++){const r=Math.floor((c-1)/3), k=(c-1)%3, m=l.cells[c]||'';
    h+='<div class="cell '+m+'" onclick="mark('+c+')" style="background-image:url(/grid/'+encodeURIComponent(g.grid)+');background-position:'+(k*50)+'% '+(r*50)+'%"><span class="n">'+c+'</span>'+(m?'<span class="m">'+m+'</span>':'')+'</div>';}
  h+='</div></div><div class="right"><div class="legend">'+
    '<div><b style="background:var(--best)">best</b>the one cell for the card</div>'+
    '<div><b style="background:var(--ok)">ok</b>you would accept it too</div>'+
    '<div><b style="background:var(--weak)">weak</b>not wrong, but you would not use it</div>'+
    '<div><b style="background:var(--wrong)">wrong</b>a clear error (write why)</div></div><div class="help">Click a cell (or press 1–9) to cycle: ok → best → weak → wrong → no mark. Mark all 9 cells. One best per grid.</div><div class="notes">';
  for(let c=1;c<=9;c++) if(l.cells[c]==='wrong'||l.cells[c]==='weak') h+='<label>Why is '+c+' '+l.cells[c]+'?'+(l.cells[c]==='weak'?' (optional)':'')+' <input value="'+(l.notes[c]||'').replace(/"/g,'&quot;')+'" oninput="note('+c+',this.value)"></label>';
  h+='</div>';
  h+='<div class="reason">Reason (why the best cell wins over the next one):<textarea id="reason" oninput="reason(this.value)">'+(l.reason||'').replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</textarea></div>';
  h+='<div id="st" class="problems"></div><p><button onclick="go(cur-1)">← back</button> <button onclick="go(cur+1)">next →</button></p></div></div>';
  document.getElementById('main').innerHTML=h;
  status();
}
function mark(c){const l=lab(D.grids[cur].id), next=ORDER[(ORDER.indexOf(l.cells[c])+1)%ORDER.length];
  if(next==='best'){for(const k in l.cells) if(l.cells[k]==='best') l.cells[k]='ok';}
  if(next) l.cells[c]=next; else delete l.cells[c];
  if(next!=='wrong'&&next!=='weak') delete l.notes[c];
  save(true);}
function note(c,v){lab(D.grids[cur].id).notes[c]=v; save();}
function reason(v){lab(D.grids[cur].id).reason=v; save();}
let t; let lastProblems=[];
function save(redraw){const g=D.grids[cur], l=lab(g.id); l.guidelines='v'+D.version; clearTimeout(t);
  if(redraw) draw();
  t=setTimeout(()=>fetch('/label',{method:'POST',body:JSON.stringify({id:g.id,label:l})}).then(r=>r.json()).then(r=>{lastProblems=r.problems;status(true);}),redraw?0:400);}
function status(saved){const s=document.getElementById('st'); if(!s) return;
  s.className=lastProblems.length?'problems':'saved';
  s.textContent=saved?(lastProblems.length?'saved · still open: '+lastProblems.join('; '):'saved · complete'):'';}
function go(i){if(i<0||i>=D.grids.length) return; cur=i; lastProblems=[]; draw();}
document.addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA') return;
  if(e.key>='1'&&e.key<='9') mark(Number(e.key));
  if(e.key==='ArrowRight') go(cur+1); if(e.key==='ArrowLeft') go(cur-1);});
</script></body></html>`;

const args = process.argv.slice(2);
if (args[0] === 'report') report();
else {
  const i = args.indexOf('--round');
  const round = i >= 0 ? Number(args[i + 1]) : 1;
  if (!Number.isInteger(round) || round < 1) { console.error('--round takes 1, 2, …'); process.exit(2); }
  serve(round);
}
