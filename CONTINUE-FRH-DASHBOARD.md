# FRH Dashboard - Istruzioni per continuare

## Problema
La pagina `/frh` funziona sulla preview URL (es. `*.onde-surf.pages.dev/frh`) ma NON sul dominio custom `onde.surf/frh` - restituisce 307 redirect a `/login`.

## Causa probabile
La variabile d'ambiente `AUTH_URL` in Cloudflare Pages potrebbe essere impostata a un valore sbagliato (o al dominio Vercel).

## Come risolvere

### 1. Aggiorna AUTH_URL in Cloudflare
1. Vai su https://dash.cloudflare.com
2. Workers & Pages → `onde-surf` → Settings → Environment variables
3. Trova `AUTH_URL` (Production)
4. Clicca Edit/Rotate
5. Imposta: `https://onde.surf`
6. Salva

### 2. Rideploya
```bash
cd /Users/mattiapetrucciani/CascadeProjects/Onde/apps/surfboard
npm run build:cf
npx wrangler pages deploy .vercel/output/static --project-name=onde-surf --branch=main --commit-dirty=true
```

### 3. Verifica
```bash
curl -I https://onde.surf/frh
# Deve restituire HTTP 200, non 307
```

## File modificati in questo task
- `src/app/frh/page.tsx` - Dashboard FRH Agents (nuovo)
- `src/middleware.ts` - Aggiunto `/frh` a publicRoutes
- `src/app/page.tsx` - Aggiunto link a FRH Agents

## Note tecniche
- Il middleware ha già `/frh` nei publicRoutes
- La pagina funziona perfettamente sulla preview URL
- Il problema è solo sul dominio custom
- NextAuth richiede AUTH_URL corretto per custom domains
