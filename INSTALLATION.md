# Guide d'installation — Tempo MCP (Enterprise)

> Ce guide couvre le déploiement complet du MCP Tempo dans votre organisation.
> Il est destiné à deux audiences : l'**administrateur** qui installe le serveur,
> et les **utilisateurs** qui configurent Claude Desktop sur leur poste.

---

## Partie 1 — Installation du serveur (Administrateur IT)

### 1.1 Créer l'application OAuth dans Tempo

1. Connectez-vous à Jira Cloud en tant qu'administrateur Tempo
2. Allez dans **Tempo → Settings → API Integration → OAuth Clients**
3. Cliquez sur **Create new OAuth client**
4. Renseignez :
   - **Name** : `Tempo MCP`
   - **Redirect URI** : URL de votre serveur + `/oauth/callback`
     - Railway : `https://votre-app.up.railway.app/oauth/callback` *(disponible après déploiement)*
     - Autre hébergement : `https://tempo-mcp.votreentreprise.com/oauth/callback`
5. Copiez le **Client ID** et le **Client Secret** générés

---

### Option A — Déploiement Railway (recommandé)

Railway est une plateforme cloud qui déploie automatiquement depuis GitHub via Docker.

#### Prérequis
- Compte Railway (railway.app)
- Repo GitHub/GitLab contenant le projet

#### Étapes

**1. Créer le projet Railway**

1. Connectez-vous sur [railway.app](https://railway.app)
2. Cliquez sur **New Project → Deploy from GitHub**
3. Sélectionnez le repo `mcp-tempo`
4. Railway détecte le `Dockerfile` automatiquement et lance le build

**2. Récupérer l'URL publique**

Une fois déployé, Railway vous attribue une URL publique :
```
https://mcp-tempo-production.up.railway.app
```
Notez cette URL — elle sera nécessaire pour les étapes suivantes.

**3. Configurer les variables d'environnement**

Dans Railway → votre projet → **Variables**, ajoutez :

| Variable | Valeur | Obligatoire |
|----------|--------|------------|
| `TEMPO_CLIENT_ID` | Client ID copié à l'étape 1.1 | ✅ |
| `TEMPO_CLIENT_SECRET` | Client Secret copié à l'étape 1.1 | ✅ |
| `OAUTH_REDIRECT_URI` | `https://votre-app.up.railway.app/oauth/callback` | ✅ |
| `PUBLIC_URL` | `https://votre-app.up.railway.app` | ✅ |
| `JIRA_URL` | `https://votre-org.atlassian.net` | ✅ |

> `PORT` est injecté automatiquement par Railway — ne pas le définir manuellement.
>
> Le serveur refuse de démarrer si une variable obligatoire est absente ou si `PUBLIC_URL` n'est pas une URL http(s) valide. Consultez les logs Railway en cas d'échec au démarrage.

**4. Mettre à jour Tempo avec l'URL définitive**

Retournez dans Tempo OAuth Clients et mettez à jour le **Redirect URI** avec l'URL Railway.

**5. Vérifier le déploiement**

```
GET https://votre-app.up.railway.app/health
→ { "status": "ok", "service": "tempo-mcp" }
```

---

### Option B — Déploiement sur VM / serveur dédié

#### Prérequis
- Node.js ≥ 18
- Git

#### Étapes

**1. Cloner et builder**

```bash
git clone <url-du-repo> mcp-tempo
cd mcp-tempo
npm install
npm run build
```

**2. Configurer les variables d'environnement**

```bash
cp .env.example .env
```

Éditez `.env` :

```env
# Obligatoires — le serveur refuse de démarrer sans elles
TEMPO_CLIENT_ID=<client-id>
TEMPO_CLIENT_SECRET=<client-secret>
OAUTH_REDIRECT_URI=https://votre-serveur.com/oauth/callback
PUBLIC_URL=https://votre-serveur.com
JIRA_URL=https://votre-org.atlassian.net

# Optionnels
PORT=3000
# TEMPO_TOKEN_URL=https://api.tempo.io/oauth/token  # ne définir que si Tempo change son endpoint
```

**3. Démarrer avec PM2 (production)**

```bash
npm install -g pm2
pm2 start dist/server.js --name tempo-mcp
pm2 save
pm2 startup   # démarrage automatique au reboot
```

**4. Vérification**

```
GET https://votre-serveur.com/health
→ { "status": "ok", "service": "tempo-mcp" }
```

---

### 1.2 Communiquer aux utilisateurs

Transmettez à chaque collaborateur :
- L'**URL du serveur MCP** : `https://votre-serveur.com/mcp`
- Ce guide (Partie 2)

C'est tout — aucune clé de session, aucun fichier de configuration supplémentaire à distribuer.

---

## Partie 2 — Configuration poste utilisateur (Claude Desktop)

### Prérequis poste

- **Claude Desktop** installé
- **Node.js ≥ 18** installé → [nodejs.org](https://nodejs.org/)
  *(nécessaire pour `npx mcp-remote` — pas besoin de cloner le projet)*

---

### Étape 1 — Configurer Claude Desktop

Ouvrez le fichier de configuration Claude Desktop :

- **Windows** : `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS** : `~/Library/Application Support/Claude/claude_desktop_config.json`

> Si le fichier n'existe pas, créez-le.

Ajoutez (ou fusionnez) la configuration suivante :

```json
{
  "mcpServers": {
    "tempo": {
      "command": "npx",
      "args": ["mcp-remote", "https://votre-serveur.com/mcp"]
    }
  }
}
```

Remplacez `https://votre-serveur.com/mcp` par l'URL communiquée par votre administrateur.

**Exemple concret :**

```json
{
  "mcpServers": {
    "tempo": {
      "command": "npx",
      "args": ["mcp-remote", "https://mcp-tempo-production.up.railway.app/mcp"]
    }
  }
}
```

Sauvegardez le fichier.

---

### Étape 2 — Première connexion (OAuth)

1. Redémarrez complètement **Claude Desktop**
2. Au premier démarrage, une fenêtre de navigateur s'ouvre automatiquement
3. Connectez-vous avec votre compte **Jira / Tempo**
4. Autorisez l'application **Tempo MCP**
5. La fenêtre se ferme — la connexion est établie

> Les tokens OAuth sont stockés automatiquement par `mcp-remote` dans `~/.mcp-auth/` sur votre poste.
> Le refresh est géré automatiquement — vous n'aurez plus à vous reconnecter.

---

### Étape 3 — Vérifier la connexion

1. Dans Claude Desktop, cliquez sur l'icône **🔌** (outils) en bas de la zone de saisie
2. Vérifiez que **tempo** apparaît dans la liste des outils disponibles
3. Testez avec une question comme :
   > *"Quels sont mes worklogs de la semaine dernière ?"*

---

## Renouveler sa session

Si la connexion Tempo est perdue (token expiré ou révoqué) :

1. Supprimez le cache local : `~/.mcp-auth/` (dossier caché)
2. Redémarrez Claude Desktop
3. La fenêtre d'autorisation s'ouvre à nouveau automatiquement

---

## Résolution des problèmes fréquents

| Symptôme | Cause probable | Solution |
|----------|----------------|----------|
| Serveur ne démarre pas | Variable d'environnement manquante ou `PUBLIC_URL` invalide | Consulter les logs — toutes les variables requises doivent être définies |
| Fenêtre OAuth ne s'ouvre pas | Node.js / npx non disponible | Vérifier `node --version` et `npx --version` |
| `Could not attach to MCP server` | Serveur non démarré ou URL incorrecte | Vérifier `/health` sur l'URL du serveur |
| Autorisation OAuth échoue | `OAUTH_REDIRECT_URI` incorrect | L'URI doit correspondre exactement à celle enregistrée dans Tempo |
| Tempo absent des outils | Claude Desktop non redémarré | Quitter complètement et relancer |
| `Token exchange failed (404)` | URL token Tempo incorrecte | Définir `TEMPO_TOKEN_URL` dans les variables serveur |
| Cache OAuth bloqué | Token corrompu dans `~/.mcp-auth/` | Supprimer `~/.mcp-auth/` et se réauthentifier |
