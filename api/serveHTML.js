const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

module.exports = async (req, res) => {
    const filePath = path.join(__dirname, 'playingFRAME.html');

    try {  
      fs.readFile(filePath, 'utf8', (err, html) => {
            if (err) {
                res.status(500).send('Error reading HTML file');
                return;
            }
            const htmlWithMetadata = html
                .replace('<!--API_KEY-->', apiKey)
        

            res.setHeader('Content-Type', 'text/html');
            res.send(htmlWithMetadata);
        });
    } catch (error) {
        console.error("what error:", error);
        res.status(500).send('f');
    }
};

