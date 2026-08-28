const axios = require('axios');
const db = require('../db/database');

async function getConfig(guildName) {
    const row = await db.get(`SELECT * FROM guild_alerts WHERE guild_name = ?`, [guildName]);
    if (row) {
        return {
            guild: row.guild_name,
            enabled: !!row.enabled,
            threshold: row.threshold || 0,
            intervalMinutes: row.interval_minutes || 10,
            webhookUrl: row.webhook_url || '',
            lastAlertCount: row.last_alert_count
        };
    }
    return { guild: guildName, enabled: true, threshold: 0, intervalMinutes: 10, webhookUrl: '', lastAlertCount: null };
}

async function saveConfig(guildName, { enabled, threshold, intervalMinutes, webhookUrl }) {
    await db.run(`INSERT INTO guild_alerts (guild_name, enabled, threshold, interval_minutes, webhook_url)
                  VALUES (?, ?, ?, ?, ?)
                  ON CONFLICT(guild_name) DO UPDATE SET
                    enabled = excluded.enabled,
                    threshold = excluded.threshold,
                    interval_minutes = excluded.interval_minutes,
                    webhook_url = excluded.webhook_url`,
      [guildName, enabled ? 1 : 0, parseInt(threshold, 10) || 0, parseInt(intervalMinutes, 10) || 10, webhookUrl || '']);
    return getConfig(guildName);
}

async function recordLogin(guildName, playerName) {
    await db.run(`INSERT INTO login_events (guild_name, player_name, logged_at) VALUES (?, ?, ?)`,
        [guildName, playerName, Date.now()]);
}

async function fireAlert(guildName, loginCount, intervalMinutes) {
    const triggeredAt = Date.now();
    await db.run(`INSERT INTO alert_log (guild_name, online_count, triggered_at) VALUES (?, ?, ?)`,
        [guildName, loginCount, triggeredAt]);

    const config = await getConfig(guildName);
    if (config.webhookUrl) {
        try {
            await axios.post(config.webhookUrl, {
                content: `🚨 **${guildName}**: **${loginCount} logins** nos últimos **${intervalMinutes} min** — possível masslog!`
            });
        } catch (e) {
            console.error(`[Alerts] Webhook falhou para ${guildName}:`, e.message);
        }
    }

    return triggeredAt;
}

// Conta quantos jogadores conectaram nos últimos intervalMinutes
async function countLoginsInWindow(guildName, intervalMinutes) {
    const since = Date.now() - intervalMinutes * 60000;
    const row = await db.get(`SELECT COUNT(*) AS n FROM login_events WHERE guild_name = ? AND logged_at > ?`,
        [guildName, since]);
    return row ? row.n : 0;
}

// Detecta masslog: ignora quem já estava online e conta apenas logins recentes.
// Dispara 1x por "rajada" (quando cruza de < X para >= X) e só re-dispara
// depois que a janela cai abaixo de X e uma nova rajada acontece.
async function checkAndFire(guildName) {
    try {
        const config = await getConfig(guildName);
        if (!config.enabled || !config.threshold || config.threshold <= 0) return false;

        const count = await countLoginsInWindow(guildName, config.intervalMinutes);

        if (count < config.threshold) {
            if (config.lastAlertCount !== null) {
                await db.run(`UPDATE guild_alerts SET last_alert_count = NULL WHERE guild_name = ?`, [guildName]);
            }
            return false;
        }

        if (config.lastAlertCount === null || config.lastAlertCount < config.threshold) {
            await db.run(`UPDATE guild_alerts SET last_alert_count = ? WHERE guild_name = ?`,
                [count, guildName]);
            await fireAlert(guildName, count, config.intervalMinutes);
            console.log(`[Alerts] ${guildName}: ${count} logins em ${config.intervalMinutes}min (X=${config.threshold}) -> ALERTA MASSLOG`);
            return true;
        }
        return false;
    } catch (e) {
        console.error(`[Alerts] Erro ao checar ${guildName}:`, e.message);
        return false;
    }
}

async function getLatestSince(id) {
    return db.all(`SELECT id, guild_name, online_count, triggered_at FROM alert_log WHERE id > ? ORDER BY id ASC`,
        [parseInt(id, 10) || 0]);
}

module.exports = {
    getConfig,
    saveConfig,
    recordLogin,
    checkAndFire,
    getLatestSince
};