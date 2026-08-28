const { getGuildDetails } = require('./src/services/tibiaScraper');
const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
    const url = `https://www.tibia.com/community/?subtopic=guilds&page=view&GuildName=United`;
    const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(response.data);
    
    // find world
    let world = '';
    const text = $('#guilds .BoxContent').text() || $('body').text();
    const match = text.match(/The guild was founded on (\w+) on/);
    if (match) world = match[1];
    
    console.log("World found:", world);
}

test();
