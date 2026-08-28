# Ako dostať appku online (krok za krokom)

Cieľ: susedka dostane jeden odkaz (napr. `https://karty.tvojadomena.sk`),
otvorí ho v prehliadači a appka funguje. API kľúč pritom ostáva schovaný na
serveri.

Máš dve cesty. **A) je najjednoduchšia, ak nemáš vlastný server.**
**B) je najlepšia, ak už nejaký server/VPS prevádzkuješ** (appka je vždy
zapnutá, žiadne čakanie).

---

## Najprv: API kľúč a poistka proti nákladom (5 minút, treba pri oboch cestách)

1. Choď na **console.anthropic.com** → prihlás sa / vytvor účet.
2. Vľavo **API Keys** → **Create Key** → skopíruj si ho (začína `sk-ant-…`).
   Uvidíš ho len raz, ulož si ho.
3. **Nastav si strop nákladov**, aby ťa nič neprekvapilo:
   **Settings → Limits (alebo Billing → Usage limits)** → nastav mesačný limit,
   napr. 5 €. Nad limit už appka jednoducho nebude fungovať — nemôže ťa to
   „vyžrať".

Tip: appka je predvolene na modeli `claude-sonnet-5`. Ak chceš čo najnižšiu
cenu, neskôr môžeš dať `claude-haiku-4-5-20251001` (viď premennú `MODEL`
nižšie).

---

## Cesta A — Render.com (bez vlastného servera)

Render vie zobrať kód z GitHubu a sám ho spustí. HTTPS dá automaticky.

### 1. Nahraj kód na GitHub
- Vytvor si účet na **github.com** (ak nemáš).
- **New repository** → daj mu meno (napr. `karty`) → **Create**.
- Na stránke repozitára klikni **Add file → Upload files** a nahraj obsah
  tohto priečinka (`server.js`, priečinok `public`, `README.md`). `.env`
  **nenahrávaj** — kľúč zadáš inak. → **Commit changes**.

### 2. Spusti na Render
- Účet na **render.com** → **New +** → **Web Service**.
- Prepoj svoj GitHub a vyber repozitár `karty`.
- Nastavenia:
  - **Runtime:** Node
  - **Build Command:** nechaj prázdne (netreba)
  - **Start Command:** `node server.js`
  - **Instance type:** Free (viď poznámku o „prebúdzaní" nižšie), alebo
    Starter (~7 $/mes) pre appku vždy zapnutú.
- **Environment → Add Environment Variable:**
  - Key: `ANTHROPIC_API_KEY`  Value: tvoj kľúč `sk-ant-…`
  - (voliteľne) Key: `MODEL`  Value: `claude-haiku-4-5-20251001`
  - (voliteľne) Key: `PASSPHRASE`  Value: nejaké heslo (viď nižšie)
- **Create Web Service.** Po chvíli dostaneš adresu tvaru
  `https://karty-xxxx.onrender.com` — **tú pošli susedke.**

> **Poznámka o Free pláne:** zadarmo appka po ~15 min nečinnosti „zaspí" a pri
> ďalšom otvorení sa 30–60 s prebúdza (stránka chvíľu nič nerobí). Pre
> dôchodkyňu to môže byť mätúce. Ak chceš, aby to bolo vždy okamžité, zvoľ
> Starter plán, alebo použi Cestu B na vlastnom serveri.

---

## Cesta B — Vlastný server / VPS (vždy zapnuté, odporúčané ak ho máš)

Na serveri s Node 18+:

```bash
# 1. skopíruj priečinok karty-online na server (scp / git)
cd karty-online

# 2. spusti natrvalo cez pm2
npm i -g pm2
ANTHROPIC_API_KEY=sk-ant-... pm2 start server.js --name karty
pm2 save && pm2 startup     # aby to nabehlo aj po reštarte

# appka teraz beží na porte 8787
```

Pred to daj reverznú proxy s HTTPS. Príklad **Caddy** (Caddyfile):

```
karty.tvojadomena.sk {
    reverse_proxy localhost:8787
}
```

Caddy vybaví HTTPS certifikát sám. Odkaz `https://karty.tvojadomena.sk`
pošli susedke. Hotovo.

Premenné (`MODEL`, `PASSPHRASE`, `PORT`) nastav do prostredia procesu rovnako
ako `ANTHROPIC_API_KEY` (v pm2 napr. cez `ecosystem.config.js` alebo `--env`).

---

## Heslo (voliteľné)

Ak nechceš, aby ti cudzí človek cez odkaz míňal kľúč, nastav premennú
`PASSPHRASE`. Potom server odmietne čítanie kariet bez správneho hesla.
Keďže appka heslo zatiaľ sama nepýta, najjednoduchšie je nechať `PASSPHRASE`
prázdne a odkaz proste nikde nezverejňovať. (Ak by si chcel, doplním do appky
aj políčko na heslo.)

---

## Overenie, že to beží
1. Otvor odkaz v prehliadači.
2. Vlož ľubovoľnú snímku hry (Ctrl+V) → **Prečítať karty**.
3. Ak sa objaví krok 2 s figúrkami, všetko funguje. Ak vyskočí červená hláška,
   skontroluj v Render/serveri, či je `ANTHROPIC_API_KEY` správne nastavený.

## Čo poslať susedke
- Odkaz (URL).
- Jednu vetu: *„Odfoť obrazovku (Print Screen), otvor tento odkaz, stlač
  Ctrl+V, potom Prečítať karty — a klikaj ĎALEJ."*
