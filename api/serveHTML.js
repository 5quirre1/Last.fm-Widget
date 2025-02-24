const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');

module.exports = async (req, res) => {
    console.log(req.method, req.url);
    const filePath = path.join(__dirname, 'playingFRAME.html');
    const username = "Squirre1Z";
    const apiKey = process.env.api;
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${apiKey}&format=json&limit=1`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        const data = await response.json();

        if (!data.recenttracks || !data.recenttracks.track || data.recenttracks.track.length === 0) {
            return res.status(404).send("No track currently playing or played recently.");
        }

        const track = data.recenttracks.track[0];
        const song = track.name;
        const artist = track.artist["#text"];
        const albumArt = track.image[3]["#text"] || "https://graybox.lol/img/lastfm/lastfm-album-placeholder.jpg";
        const trackUrl = track.url;

        let html = await fs.readFile(filePath, 'utf8');
        html = html
            .replace('<meta property="og:title" content="Now Playing: Loading...">', `<meta property="og:title" content="Now Playing: ${song}">`)
            .replace('<meta property="og:description" content="Artist: Loading...">', `<meta property="og:description" content="Artist: ${artist}">`)
            .replace('<meta property="og:image" content="">', `<meta property="og:image" content="${albumArt}">`)
            .replace('<meta property="og:url" content="">', `<meta property="og:url" content="${trackUrl}">`)
            .replace('<!--API_KEY-->', apiKey);

        res.setHeader('Content-Type', 'text/html');
        return res.send(html);
    } catch (error) {
        console.error("Error fetching track:", error);
        return res.status(500).send('Error fetching track data');
    }
};

