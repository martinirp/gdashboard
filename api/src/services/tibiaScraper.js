const axios = require('axios');
const cheerio = require('cheerio');

async function getGuilds(world) {
    const url = `https://www.tibia.com/community/?subtopic=guilds&world=${world}`;
    
    const response = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });

    const html = response.data;
    const $ = cheerio.load(html);
    const guilds = [];

    // Tibia usually places guilds inside tables with class 'TableContent'
    // Let's look for rows inside the Guilds table
    const tableContent = $('.TableContent tbody tr').not(':first-child'); // skip header if exists
    
    // We will attempt a robust extraction
    // Guilds are typically listed with their logo, name, and description.
    
    // Alternatively, there's a specific structure. Let's try to extract from `#guilds` or just generic `b` tags.
    $('div.TableContentContainer').find('tr').each((index, element) => {
        // Skip header rows which contain <th> or specific text
        if ($(element).find('td').first().text().includes('Logo')) {
             return;
        }
        
        const tds = $(element).find('td');
        
        // Rows with guilds usually have 3 columns: Logo, Description, View Button
        if (tds.length === 3) {
            const logoUrl = $(tds[0]).find('img').attr('src');
            
            const textContent = $(tds[1]).html();
            if (!textContent) return;

            const nameElement = $(tds[1]).find('b').first();
            const name = nameElement.text().trim();
            
            if (name) {
                // Description is usually text after <br>
                let description = '';
                const parts = textContent.split('<br>');
                if (parts.length > 1) {
                    description = parts.slice(1).join('<br>').replace(/<[^>]*>?/gm, '').trim();
                }
                
                guilds.push({
                    name,
                    description,
                    logoUrl: logoUrl || null
                });
            }
        }
    });

    return guilds;
}

async function getOnlinePlayersForWorld(world) {
    try {
        const url = `https://www.tibia.com/community/?subtopic=worlds&world=${world}`;
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        const $ = cheerio.load(response.data);
        const onlinePlayers = new Set();
        $('tr.Odd, tr.Even').each((i, el) => {
            const tds = $(el).find('td');
            if (tds.length === 3) {
                const nameElement = $(tds[0]).find('a');
                if (nameElement.length > 0) {
                    const name = nameElement.text().trim().replace(/&nbsp;/g, ' ').replace(/\u00A0/g, ' ');
                    onlinePlayers.add(name);
                }
            }
        });
        return onlinePlayers;
    } catch (e) {
        console.error('Error fetching world players:', e.message);
        return null;
    }
}

async function getGuildDetails(guildName) {
    const url = `https://www.tibia.com/community/?subtopic=guilds&page=view&GuildName=${encodeURIComponent(guildName)}`;
    
    const response = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });

    const html = response.data;
    const $ = cheerio.load(html);
    const players = [];

    // Find the world
    let world = '';
    const text = $('body').text();
    const match = text.match(/The guild was founded on (\w+) on/);
    if (match) world = match[1];

    let onlinePlayersSet = null;
    if (world) {
        onlinePlayersSet = await getOnlinePlayersForWorld(world);
    }

    // Guild players are usually in the second TableContent or one containing 'Rank' header
    $('table.TableContent').find('tr').each((index, element) => {
        const tds = $(element).find('td');
        
        // Skip header rows
        if ($(tds[0]).text().includes('Rank') || tds.length < 6) {
             return;
        }
        
        const rank = $(tds[0]).text().trim();
        const nameElement = $(tds[1]).find('a');
        let name = nameElement.text().trim();
        
        let title = '';
        // Sometimes title is present as Text node after the link: <a href>Name</a> (Title)
        const nameAndTitleHtml = $(tds[1]).html();
        if (nameAndTitleHtml && nameAndTitleHtml.includes('(')) {
            const match = nameAndTitleHtml.match(/\((.*?)\)/);
            if (match) {
                title = match[1];
            }
        }
        
        // If there is no a tag, it might just be text
        if (!name) {
             name = $(tds[1]).text().replace(/\(.*?\)/g, '').trim();
        }

        const vocation = $(tds[2]).text().trim();
        const level = parseInt($(tds[3]).text().trim(), 10);
        const joiningDate = $(tds[4]).text().replace(/&nbsp;/g, ' ').trim();
        const status = $(tds[5]).text().trim();
        let isOnline = $(tds[5]).find('.green').length > 0;
        
        // If we successfully fetched the world page, use it for 100% accurate status
        if (onlinePlayersSet) {
            isOnline = onlinePlayersSet.has(name.replace(/\u00A0/g, ' '));
        }

        players.push({
            rank,
            name,
            title,
            vocation,
            level: isNaN(level) ? null : level,
            joiningDate,
            status: isOnline ? 'online' : 'offline',
            isOnline
        });
    });

    return {
        guildName,
        players
    };
}

async function getKillStatistics(world) {
    const worldParam = world ? `&world=${encodeURIComponent(world)}` : '';
    const url = `https://www.tibia.com/community/?subtopic=killstatistics${worldParam}`;
    
    const response = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });

    const html = response.data;
    const $ = cheerio.load(html);
    const statistics = [];

    // The kill statistics are in rows with class DataRow
    $('tr.DataRow').each((index, element) => {
        const tds = $(element).find('td');
        
        if (tds.length === 5) {
            const race = $(tds[0]).text().trim();
            const lastDayKilledPlayers = parseInt($(tds[1]).text().trim(), 10);
            const lastDayKilledByPlayers = parseInt($(tds[2]).text().trim(), 10);
            const lastWeekKilledPlayers = parseInt($(tds[3]).text().trim(), 10);
            const lastWeekKilledByPlayers = parseInt($(tds[4]).text().trim(), 10);

            statistics.push({
                race,
                lastDay: {
                    killedPlayers: isNaN(lastDayKilledPlayers) ? 0 : lastDayKilledPlayers,
                    killedByPlayers: isNaN(lastDayKilledByPlayers) ? 0 : lastDayKilledByPlayers
                },
                lastWeek: {
                    killedPlayers: isNaN(lastWeekKilledPlayers) ? 0 : lastWeekKilledPlayers,
                    killedByPlayers: isNaN(lastWeekKilledByPlayers) ? 0 : lastWeekKilledByPlayers
                }
            });
        }
    });

    return {
        world: world || 'All Worlds',
        statistics
    };
}

module.exports = {
    getGuilds,
    getGuildDetails,
    getKillStatistics
};
