# tempo-mcp

Serveur MCP (Model Context Protocol) pour **Tempo Timesheets** et **Tempo Capacity Planner** (Atlassian Cloud).

Permet à Claude Desktop d'interagir avec Tempo en langage naturel :
> *"Saisis 2h sur YEL-241 pour aujourd'hui, account 510119"*
> *"Montre-moi les worklogs de la semaine pour mon équipe"*
> *"Crée un plan de 5 jours sur INFRA pour Alice en juin"*

---

## Architecture

```
Claude Desktop
    │  stdio
    ▼
mcp-remote (npx)                ← gère OAuth + stockage local des tokens (~/.mcp-auth/)
    │  Streamable HTTP + Bearer token
    ▼
tempo-mcp  (src/server.ts)      ← ce projet — stateless, aucun stockage de tokens
    │  Bearer token
    ▼
api.tempo.io/4
```

- **Stateless** : le serveur ne stocke aucun token. mcp-remote gère le cycle de vie OAuth côté client
- **Secrets protégés** : `TEMPO_CLIENT_SECRET` ne quitte jamais le serveur
- **Multi-utilisateurs** : chaque session MCP est isolée en mémoire (map `sessionId → token`)
- **Sécurisé** : rate limiting, helmet, cookie HttpOnly, validation des redirect URIs

---

## Structure du projet

```
mcp-tempo/
├── src/
│   ├── server.ts             ← Serveur Express (OAuth proxy + MCP endpoint)
│   ├── config.ts             ← Validation et accès aux variables d'environnement
│   ├── context.ts            ← AsyncLocalStorage — token par session MCP
│   ├── tempo-client.ts       ← Client HTTP Tempo API v4
│   └── tools/
│       ├── timesheets.ts     ← Outils Timesheets (worklogs, approbations, comptes)
│       └── capacity-planner.ts ← Outils Capacity Planner (plans, équipes)
├── dist/                     ← Compilé TypeScript (npm run build)
├── Dockerfile                ← Build multi-stage pour Railway / Docker
├── .env.example              ← Modèle de configuration
├── INSTALLATION.md           ← Guide d'installation entreprise
├── package.json
└── tsconfig.json
```

---

## Prérequis

| Outil | Version minimale |
|-------|-----------------|
| Node.js | 18+ |
| npm | 9+ |
| Claude Desktop | Toute version récente |
| Compte Tempo | Admin ou permission OAuth |

---

## Installation locale (développement)

```bash
git clone <repo-url> mcp-tempo
cd mcp-tempo
npm install
cp .env.example .env
# Éditer .env avec vos valeurs
npm run build
npm start
```

---

## Variables d'environnement

| Variable | Obligatoire | Description |
|----------|------------|-------------|
| `TEMPO_CLIENT_ID` | ✅ | Client ID de l'application OAuth Tempo |
| `TEMPO_CLIENT_SECRET` | ✅ | Client Secret de l'application OAuth Tempo |
| `OAUTH_REDIRECT_URI` | ✅ | URI de callback enregistrée dans Tempo (doit correspondre exactement) |
| `PUBLIC_URL` | ✅ | URL publique du serveur — doit commencer par `https://` ou `http://` |
| `JIRA_URL` | ✅ | URL de votre instance Jira Cloud (ex: `https://votre-org.atlassian.net`) |
| `PORT` | ❌ | Port d'écoute (défaut : `3000` — Railway l'injecte automatiquement) |
| `TEMPO_TOKEN_URL` | ❌ | URL du token endpoint Tempo (défaut : `https://api.tempo.io/oauth/token`) |

> Le serveur refuse de démarrer si une variable obligatoire est absente ou si `PUBLIC_URL` n'est pas une URL valide.
>
> Aucune variable de stockage de tokens — le serveur est entièrement stateless.

---

## Déploiement Railway

```bash
# 1. Pusher le code sur GitHub
# 2. Créer un projet Railway → Deploy from GitHub
# 3. Railway détecte le Dockerfile automatiquement
# 4. Renseigner les variables dans Railway → Variables
# 5. Récupérer l'URL publique Railway et mettre à jour PUBLIC_URL et OAUTH_REDIRECT_URI
```

Pas de volume nécessaire — le serveur ne persiste aucune donnée.

---

## Endpoints HTTP

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/.well-known/oauth-authorization-server` | Découverte OAuth (RFC 8414) |
| `POST` | `/oauth/register` | Enregistrement dynamique client (RFC 7591) |
| `GET` | `/oauth/authorize` | Redirection vers Tempo (injection `client_id` + `jira_url`) |
| `GET` | `/oauth/callback` | Relais du code d'autorisation vers mcp-remote |
| `POST` | `/oauth/token` | Proxy d'échange / refresh de token vers Tempo |
| `ALL` | `/mcp` | Endpoint MCP Streamable HTTP |

---

## Configuration Claude Desktop

**File → Settings → Developer → Edit Config** :

```json
{
  "mcpServers": {
    "tempo": {
      "command": "npx",
      "args": ["mcp-remote", "https://votre-app.up.railway.app/mcp"]
    }
  }
}
```

Remplacer l'URL par celle de votre serveur Railway (ou `http://localhost:3000/mcp` en local).

**Première connexion** : Claude Desktop ouvre automatiquement le navigateur pour la page d'autorisation Tempo. Après validation, la connexion est établie et le refresh des tokens est géré automatiquement par mcp-remote.

---

## Outils MCP disponibles

### Timesheets

| Outil | Description |
|-------|-------------|
| `get_worklogs` | Liste les worklogs sur une plage de dates (filtres projet, issue) |
| `get_user_worklogs` | Worklogs d'un utilisateur par son `accountId` |
| `create_worklog` | Crée un worklog (supporte `attributes` pour les comptes de facturation) |
| `update_worklog` | Met à jour un worklog existant |
| `delete_worklog` | Supprime un worklog |
| `get_timesheet_status` | Statut d'approbation de la feuille de temps d'un utilisateur |
| `submit_timesheet` | Soumet la feuille de temps pour approbation |
| `get_work_attributes` | Liste les attributs personnalisés configurés dans Tempo |
| `search_accounts` | Recherche les comptes de facturation Tempo |

### Capacity Planner

| Outil | Description |
|-------|-------------|
| `search_plans` | Recherche des plans (filtres utilisateur, dates, issue/projet) |
| `get_user_plans` | Plans affectés à un utilisateur |
| `create_plan` | Crée un plan d'allocation de capacité |
| `update_plan` | Met à jour un plan existant |
| `delete_plan` | Supprime un plan |
| `get_teams` | Liste les équipes Tempo |
| `get_team_members` | Membres d'une équipe |

---

## Notes API Tempo v4

- **Issue ID vs clé** : l'API Tempo v4 requiert l'`issueId` entier, pas la clé texte (`PROJ-123`).
  Pour convertir : `GET {JIRA_URL}/rest/api/3/issue/PROJ-123?fields=id`
- **Pagination** : tous les endpoints de liste supportent `limit` (max 5000) et `offset`
- **Plans** : gérés par utilisateur (`accountId`) — les plans d'équipe ne sont pas disponibles en v4
- **Attributs de worklog** : utilisez `get_work_attributes` pour connaître les clés exactes de votre instance

---

## Commandes

```bash
npm run build   # Compiler TypeScript → dist/
npm start       # Démarrer le serveur
npm run dev     # Compilation watch
```

---

## Sécurité

| Mécanisme | Description |
|-----------|-------------|
| **Secret protégé** | `TEMPO_CLIENT_SECRET` ne quitte jamais le serveur — mcp-remote reçoit un secret éphémère aléatoire (`PROXY_CLIENT_SECRET`) |
| **grant_type whitelist** | Seuls `authorization_code` et `refresh_token` sont acceptés sur `/oauth/token` |
| **Validation redirect URI** | Seules les URIs `http://localhost` et `http://127.0.0.1` sont acceptées — protection open-redirect |
| **Cookie HttpOnly** | L'état OAuth est stocké dans un cookie `HttpOnly; SameSite=Lax` (+ `Secure` en HTTPS) |
| **Rate limiting** | 30 req/min sur les endpoints OAuth, 120 req/min sur `/mcp` |
| **Session TTL** | Les sessions MCP inactives depuis plus de 4h sont purgées automatiquement (protection DoS) |
| **Headers de sécurité** | `helmet` injecte `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, etc. |
| **Validation des env vars** | Le serveur refuse de démarrer si une variable requise est absente ou si `PUBLIC_URL` est invalide |

---

## Dépannage

| Symptôme | Cause | Solution |
|----------|-------|----------|
| Fenêtre OAuth ne s'ouvre pas | mcp-remote non installé | Vérifier que Node.js et npx sont disponibles |
| `Could not attach to MCP server` | Serveur non démarré ou URL incorrecte | Vérifier `/health` sur le serveur |
| Autorisation OAuth échoue | `OAUTH_REDIRECT_URI` incorrect | Vérifier que l'URI correspond exactement à Tempo |
| Tempo absent des outils | Claude Desktop non redémarré | Quitter complètement et relancer |
| `Token exchange failed (404)` | URL token Tempo incorrecte | Définir `TEMPO_TOKEN_URL` dans les variables |
| `unsupported_grant_type` | Client envoie un grant type non supporté | Seuls `authorization_code` et `refresh_token` sont acceptés |
| Serveur refuse de démarrer | Variable d'environnement manquante ou `PUBLIC_URL` invalide | Vérifier les logs de démarrage — toutes les variables requises doivent être définies |
| Cache OAuth bloqué | Token corrompu dans `~/.mcp-auth/` | Supprimer `~/.mcp-auth/` et se réauthentifier |
