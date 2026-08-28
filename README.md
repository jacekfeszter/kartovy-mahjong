# Kartový mahjong — pomocník (online)

Malá webová appka: susedka otvorí odkaz, vloží snímku hry (Ctrl+V) a appka
jej krok po kroku ukáže, ktoré karty brať. API kľúč drží server, do
prehliadača sa nikdy nedostane.

## Čo je vnútri
- `server.js` — server bez závislostí (Node 18+). Servíruje appku a bezpečne
  proxuje čítanie kariet cez Anthropic. Kľúč sa nikdy neposiela do prehliadača.
- `public/index.html` — samotná appka (riešiteľ beží v prehliadači).
- `.env.example` — vzor premenných prostredia.

## Rýchly štart (lokálne / VPS)
```bash
export ANTHROPIC_API_KEY=sk-ant-...
node server.js
```
Otvor `http://localhost:8787`. Potrebný je Node 18+ (kvôli vstavanému `fetch`).

## Nasadenie na hosting (aby to susedka otvorila cez odkaz)
Funguje na čomkoľvek, čo spustí Node. Bez build kroku.

**Render / Railway / Fly.io a pod.:**
1. Nahraj tento priečinok ako repo.
2. Start command: `node server.js`
3. Nastav premennú prostredia `ANTHROPIC_API_KEY` (a voliteľne `MODEL`, `PASSPHRASE`).
4. Platforma dá appke HTTPS adresu — tú pošli susedke.

**Vlastný VPS (napr. za nginx/caddy):**
- Spusti `node server.js` (ideálne cez `pm2` alebo systemd), premenné nastav v prostredí.
- Daj pred to reverzný proxy s HTTPS.

> HTTPS je dôležité: vkladanie obrázka cez Ctrl+V prehliadače povoľujú len na
> `https://` alebo `http://localhost`. Hostingy vyššie dávajú HTTPS automaticky.

## Nastavenie
Všetko cez premenné prostredia (viď `.env.example`):
- `ANTHROPIC_API_KEY` — povinné.
- `MODEL` — predvolene `claude-sonnet-5`. Pre nižšiu cenu skús
  `claude-haiku-4-5-20251001`, pre vyššiu presnosť `claude-opus-4-8`.
  (Aktuálny presný názov modelu si over vo svojej Anthropic konzole.)
- `PORT` — predvolene `8787`.
- `PASSPHRASE` — ak vyplníš, server odmietne čítanie bez správneho hesla.
  Užitočné, ak nechceš, aby endpoint hocikto zneužil. Pre súkromný odkaz
  netreba.

## Náklady
Platí sa len za čítanie kariet (jedno volanie modelu na jednu snímku).
Pri Sonnet/Haiku ide rádovo o centy za snímku. Riešiteľ je zadarmo — beží
v prehliadači.

## Pravidlá hry (čo appka rieši)
- Berie sa iba karta z ľavého alebo pravého okraja riadka.
- Každá ďalšia karta sa musí zhodovať s predošlou buď hodnotou, alebo farbou.
- Solver hľadá najdlhší možný reťazec; keď sa dá, vyčistí celú dosku.

## Zmena vzhľadu / textov
Všetko je v `public/index.html` (jeden súbor, po slovensky). Farby sú CSS
premenné hore v `:root`.
