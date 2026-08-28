const axios = require('axios');
const cheerio = require('cheerio');

async function getOnlinePlayers(world) {
    const url = `https://www.tibia.com/community/?subtopic=worlds&world=${world}`;
    const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const $ = cheerio.load(response.data);
    const onlinePlayers = new Set();

    // The online players are in a table with class TableContent
    $('tr.Odd, tr.Even').each((i, el) => {
        const tds = $(el).find('td');
        if (tds.length === 3) {
            // tds[0] is Name
            const nameElement = $(tds[0]).find('a');
            if (nameElement.length > 0) {
                const name = nameElement.text().trim().replace(/&nbsp;/g, ' ');
                onlinePlayers.add(name);
            }
        }
    });

    return onlinePlayers;
}

getOnlinePlayers('Ferobra').then(players => {
    console.log(`Players online in Ferobra: ${players.size}`);
    console.log(Array.from(players).slice(0, 5));
});
