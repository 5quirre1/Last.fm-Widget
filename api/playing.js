const { createCanvas, loadImage, registerFont } = require("canvas");
const fetch = require("node-fetch");
const path = require("path");

registerFont(path.join(__dirname, "fonts", "RobotoMono.ttf"), { family: "RobotoMono" });

export default async function handler(req, res) {
    console.log(`Request method: ${req.method}, URL: ${req.url}`);
    
    const username = "Squirre1Z";
    const apiKey = process.env.api;

    const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${apiKey}&format=json&limit=1`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!data.recenttracks || !data.recenttracks.track || data.recenttracks.track.length === 0) {
            return res.status(404).send("No track currently playing or played recently.");
        }

        const track = data.recenttracks.track[0];
        const song = track.name;
        const artist = track.artist["#text"];
        const albumArt = track.image[2]["#text"] || "https://ggg.com/gg.jpg";

        const canvas = createCanvas(500, 200);
        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "#181818";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const img = await loadImage(albumArt);
        ctx.drawImage(img, 20, 20, 160, 160);

        function wrapText(text, x, y, maxWidth, lineHeight) {
            const words = text.split(' ');
            let line = '';
            const lines = [];

            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const testWidth = ctx.measureText(testLine).width;

                if (testWidth > maxWidth && n > 0) {
                    lines.push(line);
                    line = words[n] + ' ';
                } else {
                    line = testLine;
                }
            }

            lines.push(line);

            let textY = y;
            for (let i = 0; i < lines.length; i++) {
                ctx.fillText(lines[i], x, textY);
                textY += lineHeight;
            }

            return textY;
        }

        ctx.fillStyle = "#fff";
        ctx.font = "bold 20px 'RobotoMono'";
        let newY = wrapText(song, 200, 70, 280, 25);

        ctx.font = "16px 'RobotoMono'";
        ctx.fillStyle = "#bbb";
        wrapText(artist, 200, newY + 5, 280, 20);

        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.send(canvas.toBuffer("image/png"));
    } catch (error) {
        console.error("Error fetching track:", error);
        res.status(500).send("Error generating image");
    }
}

