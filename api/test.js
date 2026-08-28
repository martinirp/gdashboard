const axios = require('axios');
const cheerio = require('cheerio');

(async () => {
    try {
        const url = 'https://www.tibia.com/community/?subtopic=killstatistics&world=Ferobra';
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const $ = cheerio.load(response.data);
        console.log('Total trs:', $('tr').length);
        console.log('Total tr.DataRow:', $('tr').filter((i, el) => $(el).attr('class') && $(el).attr('class').includes('DataRow')).length);
        const firstDataRow = $('tr').filter((i, el) => $(el).attr('class') && $(el).attr('class').includes('DataRow')).first();
        console.log('tds in first DataRow:', firstDataRow.find('td').length);
    } catch (error) {
        console.error('Error:', error);
    }
})();
