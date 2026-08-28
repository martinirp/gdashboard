const cron = require('node-cron');
const { getGuildDetails } = require('./tibiaScraper');
const { recordLogin, checkAndFire } = require('./alertService');
const db = require('../db/database');

// Guilds que já foram "baselineadas" após o start — evita contar como login
// quem já estava online quando o tracker subiu.
const baselined = new Set();

async function syncGuild(guildName) {
    try {
        console.log(`[Tracker] Syncing guild: ${guildName}`);
        const details = await getGuildDetails(guildName);
        if (!details || !details.players) return;

        const now = Date.now();
        const isFirstSync = !baselined.has(guildName);

        for (const player of details.players) {
            // Check if player exists in DB
            const session = await db.get(`SELECT * FROM player_sessions WHERE player_name = ?`, [player.name]);

            if (player.isOnline) {
                if (!session) {
                    // Novo jogador, insere online
                    await db.run(`INSERT INTO player_sessions (player_name, guild_name, login_time, is_online) VALUES (?, ?, ?, ?)`,
                        [player.name, guildName, now, 1]);
                    if (!isFirstSync) await recordLogin(guildName, player.name);
                } else if (!session.is_online) {
                    // Jogador estava off e conectou agora -> LOGIN
                    await db.run(`UPDATE player_sessions SET is_online = 1, login_time = ?, guild_name = ? WHERE player_name = ?`,
                        [now, guildName, player.name]);
                    if (!isFirstSync) await recordLogin(guildName, player.name);
                } else {
                    // Continua online; garante guild_name atualizado
                    if (session.guild_name !== guildName) {
                        await db.run(`UPDATE player_sessions SET guild_name = ? WHERE player_name = ?`, [guildName, player.name]);
                    }
                }
            } else {
                if (session && session.is_online) {
                    // Jogador deslogou
                    await db.run(`UPDATE player_sessions SET is_online = 0 WHERE player_name = ?`, [player.name]);
                }
            }
        }

        if (isFirstSync) baselined.add(guildName);

        const onlineCount = details.players.filter(p => p.isOnline).length;
        console.log(`[Tracker] ${guildName}: ${onlineCount}/${details.players.length} online`);
        await checkAndFire(guildName);
    } catch (error) {
        console.error(`[Tracker] Error syncing guild ${guildName}:`, error.message);
    }
}

async function startTracker() {
    console.log('[Tracker] Starting background worker...');

    // Reset online status on startup to avoid stale "online for X hours" bugs from previous runs
    try {
        await db.run('UPDATE player_sessions SET is_online = 0');
        console.log('[Tracker] Reset all online sessions for startup.');
    } catch (e) {
        console.error('[Tracker] Error resetting sessions:', e.message);
    }

    // Run every minute
    cron.schedule('* * * * *', async () => {
        try {
            const trackedGuilds = await db.all(`SELECT name FROM tracked_guilds`);
            for (const guild of trackedGuilds) {
                await syncGuild(guild.name);
                // Add a small delay between guilds to avoid spamming Tibia's servers
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } catch (error) {
            console.error('[Tracker] Cron error:', error.message);
        }
    });
}

module.exports = {
    syncGuild,
    startTracker
};