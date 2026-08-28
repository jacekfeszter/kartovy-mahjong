// Kartový mahjong — pomocník (online verzia)
// Malý server bez závislostí: servíruje appku (public/index.html)
// a bezpečne proxuje čítanie kariet cez Anthropic API.
// Vyžaduje Node 18+ (má vstavaný fetch).

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const PORT       = process.env.PORT || 8787;
const API_KEY    = process.env.ANTHROPIC_API_KEY;         // POVINNÉ
const MODEL      = process.env.MODEL || 'claude-sonnet-5';// dá sa prepnúť (haiku = lacnejšie, opus = najpresnejšie)
const PASSPHRASE = process.env.PASSPHRASE || '';          // nepovinné: jednoduché heslo pred appku
const MAX_BODY   = 8 * 1024 * 1024;                       // 8 MB strop na obrázok

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!API_KEY) {
  console.error('CHYBA: nie je nastavená premenná ANTHROPIC_API_KEY.');
  process.exit(1);
}

const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const SUITS = ['H','D','C','S'];

const PROMPT =
`Na obrázku je hracia doska hry s hracími kartami usporiadanými do mriežky (riadky pod sebou, karty vedľa seba).
Prečítaj VŠETKY karty. Vráť IBA platný JSON, bez akéhokoľvek iného textu a bez značiek markdown.
Schéma: {"rows":[[{"r":"8","s":"D"},{"r":"9","s":"S"}], ... ]}
"r" (hodnota) je jedna z: A,2,3,4,5,6,7,8,9,10,J,Q,K.
"s" (farba) je jedna z: H = srdce (červená), D = káro (červená), C = kríže (čierna), S = piky (čierna).
Zachovaj presné poradie: v každom riadku zľava doprava, riadky zhora nadol.
Každý riadok obrázka = jedno pole v "rows".`;

function parseGrid(text) {
  let t = String(text).replace(/```json/gi, '').replace(/```/g, '').trim();
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a) t = t.slice(a, b + 1);
  let obj; try { obj = JSON.parse(t); } catch { return []; }
  const rows = obj.rows || obj.grid || [];
  return rows.map(row => (row || []).map(c => {
    let r = String(c.r ?? c.rank ?? '').toUpperCase().trim();
    if (r === '1' || r === '0') r = '10';
    let s = String(c.s ?? c.suit ?? '').toUpperCase().trim()[0];
    if (!RANKS.includes(r) || !SUITS.includes(s)) return null;
    return { rank: r, suit: s };
  }).filter(Boolean)).filter(row => row.length);
}

function send(res, code, body, type = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end((typeof body === 'string' || Buffer.isBuffer(body)) ? body : JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  // Appka (index.html hľadáme v public/ aj v koreni)
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    for (const p of [path.join(__dirname, 'public', 'index.html'), path.join(__dirname, 'index.html')]) {
      try {
        const html = await readFile(p);
        return send(res, 200, html, 'text/html; charset=utf-8');
      } catch { /* skus dalsie umiestnenie */ }
    }
    return send(res, 500, 'index.html sa nenašiel', 'text/plain; charset=utf-8');
  }

  // Čítanie kariet
  if (req.method === 'POST' && req.url === '/api/read-cards') {
    let size = 0; const chunks = []; let aborted = false;
    req.on('data', d => {
      size += d.length;
      if (size > MAX_BODY) { aborted = true; req.destroy(); return; }
      chunks.push(d);
    });
    req.on('end', async () => {
      if (aborted) return;
      try {
        const { image, mime, passphrase } = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (PASSPHRASE && passphrase !== PASSPHRASE) return send(res, 401, { error: 'Nesprávne heslo.' });
        if (!image || !/^image\//.test(mime || '')) return send(res, 400, { error: 'Chýba platný obrázok.' });

        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: MODEL,
            max_tokens: 1200,
            messages: [{ role: 'user', content: [
              { type: 'image', source: { type: 'base64', media_type: mime, data: image } },
              { type: 'text', text: PROMPT }
            ]}]
          })
        });

        if (!r.ok) {
          const detail = (await r.text()).slice(0, 400);
          return send(res, 502, { error: 'Čítanie kariet zlyhalo.', detail });
        }
        const data = await r.json();
        const txt = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
        return send(res, 200, { rows: parseGrid(txt) });
      } catch (e) {
        return send(res, 500, { error: 'Neočakávaná chyba na serveri.', detail: String(e).slice(0, 200) });
      }
    });
    return;
  }

  send(res, 404, 'Nenájdené', 'text/plain; charset=utf-8');
});

server.listen(PORT, () => {
  console.log(`Kartový pomocník beží na http://localhost:${PORT}`);
  console.log(`Model: ${MODEL}${PASSPHRASE ? ' | heslo zapnuté' : ''}`);
});
