// made by squirrel, if you somehow get this code, you are very mean :C

const { createCanvas, loadImage, registerFont } = require("canvas");
const fetch = require("node-fetch");
const path = require("path");
const crypto = require("crypto");

registerFont(path.join(__dirname, "fonts", "RobotoMono-Bold.ttf"), { family: "RobotoMono", weight: "bold" });
registerFont(path.join(__dirname, "fonts", "RobotoMono-Regular.ttf"), { family: "RobotoMono" });

const COLORS = {
    background: "#121212",
    cardBg: "#1E1E1E",
    primary: "#FFFFFF",
    secondary: "#B3B3B3",
    accent: "#1DB954",
    playing: "#1DB954"
};

export default async function handler(req, res) {
    console.log(`api request received: ${req.method} ${req.url}`);

    const username = req.query.username || "Squirre1Z";
    const apiKey = process.env.api;

    if (!apiKey) {
        console.error("missing Last.fm API key");
        return res.status(500).send("server configuration error");
    }

    try {
        const randomId = crypto.randomBytes(4).toString('hex');
        const trackData = await fetchLastFmData(username, apiKey);

        if (!trackData || (!trackData.title && !trackData.artist)) {
            console.warn("no track data received from last.fm, displaying fallback.");
            const emptyBuffer = await generateFallbackCard("not Listening");
            res.setHeader("Content-Type", "image/png");
            res.setHeader("Cache-Control", "public, max-age=30");
            return res.send(emptyBuffer);
        }

        const imageBuffer = await generateNowPlayingCard(trackData);

        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "public, max-age=30");

        if (!req.query.rid) {
            const protocol = req.headers['x-forwarded-proto'] || 'http';
            const host = req.headers.host;
            const baseUrl = `${protocol}://${host}${req.url}`;
            const separator = req.url.includes('?') ? '&' : '?';
            const redirectUrl = `${baseUrl}${separator}rid=${randomId}`;

            res.setHeader("Location", redirectUrl);
            return res.status(302).send("Redirecting to unique URL");
        }

        return res.send(imageBuffer);
    } catch (error) {
        console.error("Error generating now playing card:", error);

        if (error.message === "NOT_FOUND") {
            const notFoundBuffer = await generateFallbackCard("User Not Found");
            res.setHeader("Content-Type", "image/png");
            res.setHeader("Cache-Control", "public, max-age=60");
            return res.status(404).send(notFoundBuffer);
        }

        const errorBuffer = await generateFallbackCard("Error Fetching Data");
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "public, max-age=10");
        return res.status(500).send(errorBuffer);
    }
}

async function fetchLastFmData(username, apiKey) {
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${apiKey}&format=json&limit=1&_=${Date.now()}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            const error = await response.json();
            console.error("Last.fm API error:", error);
            if (error?.error === 6) {
                throw new Error("NOT_FOUND");
            }
            throw new Error("API_ERROR");
        }

        const data = await response.json();

        if (!data.recenttracks || !data.recenttracks.track || data.recenttracks.track.length === 0) {
            return null;
        }

        const track = data.recenttracks.track[0];

        return {
            title: track.name,
            artist: track.artist["#text"],
            album: track.album["#text"],
            albumArt: track.image[3]["#text"] || "https://graybox.lol/img/lastfm/lastfm-album-placeholder.jpg",
            isNowPlaying: !!track["@attr"]?.nowplaying
        };
    } catch (error) {
        console.error("error fetching from Last.fm:", error);
        throw error;
    }
}

async function generateNowPlayingCard(trackData) {
    const canvas = createCanvas(800, 266);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, COLORS.cardBg);
    gradient.addColorStop(1, "#121212");
    ctx.fillStyle = gradient;
    roundRect(ctx, 10, 10, canvas.width - 20, canvas.height - 20, 16);
    ctx.fill();

    try {
        const img = await loadImage(trackData.albumArt);

        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        const artSize = 213;
        const artX = 40;
        const artY = 30;

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.save();
        roundRect(ctx, artX, artY, artSize, artSize, 10);
        ctx.clip();
        ctx.drawImage(img, artX, artY, artSize, artSize);
        ctx.restore();

        const textX = artX + artSize + 30;
        const textWidth = canvas.width - textX - 30;

        if (trackData.isNowPlaying) {
            ctx.fillStyle = COLORS.playing;
            ctx.font = "bold 18px 'RobotoMono'";
            const nowPlayingText = "CURRENTLY PLAYING";
            ctx.fillText(nowPlayingText, textX, 50);

            const nowPlayingWidth = ctx.measureText(nowPlayingText).width;

            ctx.fillStyle = COLORS.accent;
            ctx.fillRect(textX, 58, nowPlayingWidth, 4);

            const titleY = 95;

            ctx.fillStyle = COLORS.primary;
            ctx.font = "bold 30px 'RobotoMono'";
            const wrappedTitleY = wrapText(ctx, trackData.title, textX, titleY, textWidth, 36);

            ctx.fillStyle = COLORS.secondary;
            ctx.font = "24px 'RobotoMono'";
            const artistY = wrappedTitleY + 20;
            const wrappedArtistY = wrapText(ctx, trackData.artist, textX, artistY, textWidth, 28);

            if (trackData.album) {
                ctx.fillStyle = COLORS.secondary;
                ctx.font = "20px 'RobotoMono'";
                wrapText(ctx, trackData.album, textX, wrappedArtistY + 20, textWidth, 24);
            }
        } else {
            ctx.fillStyle = COLORS.primary;
            ctx.font = "bold 30px 'RobotoMono'";
            const wrappedTitleY = wrapText(ctx, trackData.title, textX, 80, textWidth, 36);

            ctx.fillStyle = COLORS.secondary;
            ctx.font = "24px 'RobotoMono'";
            const artistY = wrappedTitleY + 20;
            const wrappedArtistY = wrapText(ctx, trackData.artist, textX, artistY, textWidth, 28);

            if (trackData.album) {
                ctx.fillStyle = COLORS.secondary;
                ctx.font = "20px 'RobotoMono'";
                wrapText(ctx, trackData.album, textX, wrappedArtistY + 20, textWidth, 24);
            }
        }

        return canvas.toBuffer("image/png");
    } catch (imgError) {
        console.error("error loading album art:", imgError);

        ctx.fillStyle = "#2E2E2E";
        roundRect(ctx, 40, 30, 213, 213, 10);
        ctx.fill();

        ctx.fillStyle = "#555";
        ctx.font = "100px sans-serif";
        ctx.fillText("♪", 100, 170);

        ctx.fillStyle = COLORS.primary;
        ctx.font = "bold 30px 'RobotoMono'";
        const wrappedTitleY = wrapText(ctx, trackData.title, 270, 90, 500, 36);

        ctx.fillStyle = COLORS.secondary;
        ctx.font = "24px 'RobotoMono'";
        const wrappedArtistY = wrapText(ctx, trackData.artist, 270, wrappedTitleY + 20, 500, 28);

        if (trackData.album) {
            ctx.fillStyle = COLORS.secondary;
            ctx.font = "20px 'RobotoMono'";
            wrapText(ctx, trackData.album, 270, wrappedArtistY + 20, 500, 24);
        }

        return canvas.toBuffer("image/png");
    }
}

async function generateFallbackCard(message) {
    const canvas = createCanvas(800, 266);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, COLORS.cardBg);
    gradient.addColorStop(1, "#121212");
    ctx.fillStyle = gradient;
    roundRect(ctx, 10, 10, canvas.width - 20, canvas.height - 20, 16);
    ctx.fill();

    ctx.fillStyle = COLORS.secondary;
    ctx.font = "32px 'RobotoMono'";
    const textWidth = ctx.measureText(message).width;
    const textX = (canvas.width - textWidth) / 2;
    const textY = canvas.height / 2 + 12;

    ctx.fillText(message, textX, textY);

    return canvas.toBuffer("image/png");
}

function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    if (!text) return y;

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

    const linesToDraw = lines.length > 2 ? lines.slice(0, 2) : lines;
    if (lines.length > 2) {
        linesToDraw[1] = linesToDraw[1].trim() + '...';
    }

    let textY = y;
    for (let i = 0; i < linesToDraw.length; i++) {
        ctx.fillText(linesToDraw[i], x, textY);
        textY += lineHeight;
    }

    return textY;
}
