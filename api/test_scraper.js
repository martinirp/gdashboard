const { getGuildDetails } = require('./src/services/tibiaScraper');

async function test() {
    const data = await getGuildDetails('United');
    console.log(JSON.stringify(data.players.slice(0, 5), null, 2));
}

test();
