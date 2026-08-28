const express = require('express');
const cors = require('cors');
const path = require('path');
const { getGuilds, getGuildDetails, getKillStatistics } = require('./services/tibiaScraper');
const { startTracker } = require('./services/tracker');
const auth = require('./services/auth');
const db = require('./db/database');

const app = express();
const PORT = process.env.PORT || 4000;
const BASE = (process.env.BASE_PATH || '').replace(/\/$/, '');
const AUTH_USER = process.env.AUTH_USER || 'admin';
const AUTH_PASS = process.env.AUTH_PASS || 'admin';
const FRONTEND_DIR = path.resolve(__dirname, '../../frontend');

app.use(cors());
app.use(express.json());

// Start the background tracker
startTracker();

// ── API (sob prefixo BASE + /api) ───────────────────────────────────────────
const api = express.Router();

api.post('/login', (req, res) => {
    const { user, password } = req.body || {};
    const token = auth.login(user, password, AUTH_USER, AUTH_PASS);
    if (!token) {
        return res.status(401).json({ success: false, error: 'Credenciais inválidas' });
    }
    res.json({ success: true, token });
});

api.post('/logout', (req, res) => {
    const token = (req.headers.authorization || '').replace(/^Bearer /i, '');
    auth.logout(token);
    res.json({ success: true });
});

api.use((req, res, next) => {
    const token = (req.headers.authorization || '').replace(/^Bearer /i, '');
    if (!auth.verify(token)) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
    }
    next();
});

// ── ALERT CONFIG ────────────────────────────────────────────────────────────
api.get('/alerts', async (req, res) => {
    try {
        const trackedGuilds = await db.all(`SELECT name FROM tracked_guilds ORDER BY name`);
        const alertService = require('./services/alertService');
        const configs = [];
        for (const g of trackedGuilds) {
            configs.push(await alertService.getConfig(g.name));
        }
        res.json({ success: true, alerts: configs });
    } catch (error) {
        console.error('Error listing alerts:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

api.post('/alerts', async (req, res) => {
    try {
        const { guild, enabled, threshold, intervalMinutes, webhookUrl } = req.body;
        if (!guild) return res.status(400).json({ success: false, error: 'guild is required' });
        const alertService = require('./services/alertService');
        const config = await alertService.saveConfig(guild, {
            enabled: enabled !== false,
            threshold: parseInt(threshold, 10) || 0,
            intervalMinutes: parseInt(intervalMinutes, 10) || 10,
            webhookUrl: webhookUrl || ''
        });
        res.json({ success: true, alert: config });
    } catch (error) {
        console.error('Error saving alert config:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

api.get('/alerts/latest', async (req, res) => {
    try {
        const alertService = require('./services/alertService');
        const events = await alertService.getLatestSince(req.query.since || 0);
        res.json({ success: true, events });
    } catch (error) {
        console.error('Error fetching alert events:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ── GUILDS ──────────────────────────────────────────────────────────────────
api.get('/guilds/:world', async (req, res) => {
    try {
        const world = req.params.world;
        const guilds = await getGuilds(world);
        res.json({ success: true, world, guilds });
    } catch (error) {
        console.error('Error fetching guilds:', error.message);
        res.status(500).json({ success: false, error: 'Failed to fetch guilds for the specified world.' });
    }
});

api.get('/guilds/:world/:guildName', async (req, res) => {
    try {
        const guildName = req.params.guildName;
        const guildDetails = await getGuildDetails(guildName);

        // Enrich with database session data
        for (const player of guildDetails.players) {
            const session = await db.get(`SELECT login_time FROM player_sessions WHERE player_name = ? AND is_online = 1`, [player.name]);
            if (session && player.isOnline) {
                player.loginTime = new Date(session.login_time).toISOString();
                player.onlineDurationMinutes = Math.floor((Date.now() - session.login_time) / 60000);
            } else {
                player.loginTime = null;
                player.onlineDurationMinutes = 0;
            }
        }

        res.json({ success: true, world: req.params.world, guild: guildDetails });
    } catch (error) {
        console.error('Error fetching guild details:', error.message);
        res.status(500).json({ success: false, error: 'Failed to fetch details for the specified guild.' });
    }
});

api.post('/tracking/guild', async (req, res) => {
    try {
        const { guildName } = req.body;
        if (!guildName) {
            return res.status(400).json({ success: false, error: 'guildName is required' });
        }

        await db.run(`INSERT OR IGNORE INTO tracked_guilds (name, added_at) VALUES (?, ?)`, [guildName, Date.now()]);

        const { syncGuild } = require('./services/tracker');
        syncGuild(guildName);

        res.json({ success: true, message: `Guild ${guildName} is now being tracked. Initial sync started.` });
    } catch (error) {
        console.error('Error adding tracked guild:', error.message);
        res.status(500).json({ success: false, error: 'Failed to add guild to tracking list.' });
    }
});

api.delete('/tracking/guild/:guildName', async (req, res) => {
    try {
        const guildName = req.params.guildName;
        if (!guildName) {
            return res.status(400).json({ success: false, error: 'guildName is required' });
        }

        await db.run(`DELETE FROM tracked_guilds WHERE name = ?`, [guildName]);
        await db.run(`DELETE FROM guild_alerts WHERE guild_name = ?`, [guildName]);

        res.json({ success: true, message: `Guild ${guildName} removed from tracking.` });
    } catch (error) {
        console.error('Error removing tracked guild:', error.message);
        res.status(500).json({ success: false, error: 'Failed to remove guild from tracking list.' });
    }
});

api.get('/united', async (req, res) => {
    try {
        const guildName = 'United';
        const guildDetails = await getGuildDetails(guildName);

        for (const player of guildDetails.players) {
            const session = await db.get(`SELECT login_time FROM player_sessions WHERE player_name = ? AND is_online = 1`, [player.name]);
            if (session && player.isOnline) {
                player.loginTime = new Date(session.login_time).toISOString();
                player.onlineDurationMinutes = Math.floor((Date.now() - session.login_time) / 60000);
            } else {
                player.loginTime = null;
                player.onlineDurationMinutes = 0;
            }
        }

        res.json({ success: true, world: 'Ferobra', guild: guildDetails });
    } catch (error) {
        console.error('Error fetching United guild details:', error.message);
        res.status(500).json({ success: false, error: 'Failed to fetch details for the United guild.' });
    }
});

// ── KILL STATISTICS ─────────────────────────────────────────────────────────
api.get('/killstatistics/:world', async (req, res) => {
    try {
        const world = req.params.world;
        const stats = await getKillStatistics(world);
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('Error fetching kill statistics for world:', error.message);
        res.status(500).json({ success: false, error: 'Failed to fetch kill statistics for the specified world.' });
    }
});

app.use(BASE + '/api', api);

// ── FRONTEND (arquivos estáticos sob o mesmo prefixo) ───────────────────────
app.use(BASE || '/', express.static(FRONTEND_DIR));

app.listen(PORT, () => {
    console.log(`GDashboard rodando em http://localhost:${PORT}${BASE}`);
    console.log(`   Base path : '${BASE || '/'}'`);
    console.log(`   Frontend  : ${FRONTEND_DIR}`);
    console.log(`   Login     : ${AUTH_USER} / (definida em AUTH_PASS)`);
});