/*
 *  ================================================
 *           CODE BY SQUIRREL GAY ACORNS!!
 *  =================================================
 *        Give credit if you steal my code sob
 *  =================================================
 *
 *  /////////////////////////////////////////////////////////////////////////////
 *  MIT License
 *  
 *  Copyright (c) 2025 Squirrel
 *  
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the "Software"), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *  
 *  The above copyright notice and this permission notice shall be included in all
 *  copies or substantial portions of the Software.
 *  
 *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 *  SOFTWARE.
 *  /////////////////////////////////////////////////////////////////////////////
 */

const {
    createCanvas,
    loadImage,
    registerFont
} = require("canvas");
const fetch = require("node-fetch");
const path = require("path");
const crypto = require("crypto");

registerFont(path.join(__dirname, "fonts", "RobotoMono-Bold.ttf"), {
    family: "RobotoMono",
    weight: "bold"
});
registerFont(path.join(__dirname, "fonts", "RobotoMono-Regular.ttf"), {
    family: "RobotoMono"
});

const DEFAULT_COLORS = {
    background: "#121212",
    cardBg: "#1E1E1E",
    primary: "#FFFFFF",
    secondary: "#B3B3B3",
    accent: "#1DB954",
    playing: "#1DB954",
    recently: "#FF3333"
};

const DEFAULT_FONT_SIZES = {
    username: 14,
    status: 16,
    title: 21,
    artist: 17,
    album: 15
};


const DEFAULT_DIMENSIONS = {
    width: 600,
    height: 200,
    artSize: 150
};

export default async function handler(req, res) {
    console.log(`api request received: ${req.method} ${req.url}`);

    const username = req.query.username;
    const apiKey = process.env.api;

    const customOptions = parseCustomOptions(req.query);

    if (!apiKey) {
        console.error("missing Last.fm API key");
        return res.status(500).send("server configuration error");
    }

    if (!username) {
        const noUserBuffer = await generateFallbackCard(
            "Hai! you need to put a user..",
            "Example: '?username=Squirre1Z'",
            null,
            customOptions
        );
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "public, max-age=60");
        return res.send(noUserBuffer);
    }

    try {
        const randomId = crypto.randomBytes(4).toString('hex');
        const userData = await fetchUserData(username, apiKey);
        const trackData = await fetchLastFmData(username, apiKey);

        if (!trackData || (!trackData.title && !trackData.artist)) {
            console.warn("no track data received from last.fm, displaying fallback.");
            const emptyBuffer = await generateFallbackCard(
                "no track data found..",
                null,
                userData,
                customOptions
            );
            res.setHeader("Content-Type", "image/png");
            res.setHeader("Cache-Control", "public, max-age=30");
            return res.send(emptyBuffer);
        }

        const imageBuffer = await generateNowPlayingCard(trackData, userData, customOptions);

        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "public, max-age=30");

        if (!req.query.rid) {
            const protocol = req.headers['x-forwarded-proto'] || 'http';
            const host = req.headers.host;
            const baseUrl = `${protocol}://${host}${req.url}`;
            const separator = req.url.includes('?') ? '&' : '?';
            const redirectUrl = `${baseUrl}${separator}rid=${randomId}`;

            res.setHeader("Location", redirectUrl);
            return res.status(302).send("redirecting to unique URL");
        }

        return res.send(imageBuffer);
    } catch (error) {
        console.error("error generating now playing card:", error);

        if (error.message === "NOT_FOUND") {
            const notFoundBuffer = await generateFallbackCard(
                `user '${username}' not found..`,
                null,
                null,
                customOptions
            );
            res.setHeader("Content-Type", "image/png");
            res.setHeader("Cache-Control", "public, max-age=60");
            return res.status(404).send(notFoundBuffer);
        }

        const errorBuffer = await generateFallbackCard(
            "error fetching data",
            null,
            null,
            customOptions
        );
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "public, max-age=10");
        return res.status(500).send(errorBuffer);
    }
}

function parseCustomOptions(query) {
    const options = {
        colors: {
            ...DEFAULT_COLORS
        },
        fontSizes: {
            ...DEFAULT_FONT_SIZES
        },
        dimensions: {
            ...DEFAULT_DIMENSIONS
        },
        layout: {},
        fonts: {}
    };

    if (query.bg) options.colors.background = `#${query.bg}`;
    if (query.cardBg) options.colors.cardBg = `#${query.cardBg}`;
    if (query.primary) options.colors.primary = `#${query.primary}`;
    if (query.secondary) options.colors.secondary = `#${query.secondary}`;
    if (query.accent) options.colors.accent = `#${query.accent}`;
    if (query.playing) options.colors.playing = `#${query.playing}`;
    if (query.recently) options.colors.recently = `#${query.recently}`;

    if (query.theme) {
        switch (query.theme.toLowerCase()) {
            case 'dark':
                break;
            case 'light':
                options.colors.background = '#F5F5F5';
                options.colors.cardBg = '#FFFFFF';
                options.colors.primary = '#121212';
                options.colors.secondary = '#555555';
                break;
            case 'blue':
                options.colors.accent = '#1E88E5';
                options.colors.playing = '#1E88E5';
                break;
            case 'pink':
                options.colors.accent = '#E91E63';
                options.colors.playing = '#E91E63';
                break;
        }
    }

    if (query.usernameSize) options.fontSizes.username = parseInt(query.usernameSize);
    if (query.statusSize) options.fontSizes.status = parseInt(query.statusSize);
    if (query.titleSize) options.fontSizes.title = parseInt(query.titleSize);
    if (query.artistSize) options.fontSizes.artist = parseInt(query.artistSize);
    if (query.albumSize) options.fontSizes.album = parseInt(query.albumSize);

    if (query.width) options.dimensions.width = parseInt(query.width);
    if (query.height) options.dimensions.height = parseInt(query.height);
    if (query.artSize) options.dimensions.artSize = parseInt(query.artSize);

    if (query.hideProfile === 'true') options.layout.hideProfile = true;
    if (query.hideAlbum === 'true') options.layout.hideAlbum = true;
    if (query.hideStatus === 'true') options.layout.hideStatus = true;
    if (query.round) options.layout.cornerRadius = parseInt(query.round);

    if (query.fontFamily) options.fonts.fontFamily = query.fontFamily;

    return options;
}

async function fetchUserData(username, apiKey) {
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${username}&api_key=${apiKey}&format=json&_=${Date.now()}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            const error = await response.json();
            console.error("last.fm API error:", error);
            if (error?.error === 6) {
                throw new Error("NOT_FOUND");
            }
            throw new Error("API_ERROR");
        }

        const data = await response.json();

        return {
            username: data.user.name,
            profileImage: data.user.image[2]["#text"]
        };
    } catch (error) {
        console.error("error fetching user data from Last.fm:", error);
        throw error;
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

async function generateNowPlayingCard(trackData, userData, customOptions = {}) {
    const options = customOptions;
    const colors = options.colors;
    const fontSizes = options.fontSizes;
    const dimensions = options.dimensions;
    const layout = options.layout || {};

    const cornerRadius = layout.cornerRadius !== undefined ? layout.cornerRadius : 16;

    const canvas = createCanvas(dimensions.width, dimensions.height);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, colors.cardBg);
    gradient.addColorStop(1, colors.background);
    ctx.fillStyle = gradient;
    roundRect(ctx, 10, 10, canvas.width - 20, canvas.height - 20, cornerRadius);
    ctx.fill();

    try {
        if (userData && userData.profileImage && !layout.hideProfile) {
            const profileImg = await loadImage(userData.profileImage);
            const profileSize = 34;
            const profileX = canvas.width - profileSize - 20;
            const profileY = 22;

            ctx.save();
            roundRect(ctx, profileX, profileY, profileSize, profileSize, 6);
            ctx.clip();
            ctx.drawImage(profileImg, profileX, profileY, profileSize, profileSize);
            ctx.restore();

            ctx.fillStyle = colors.primary;
            ctx.font = `${fontSizes.username}px 'RobotoMono'`;
            ctx.textAlign = "right";
            ctx.fillText(userData.username, profileX - 8, profileY + profileSize / 2 + 5);
            ctx.textAlign = "left";
        }

        const artSize = dimensions.artSize;
        const artX = 25;
        const artY = 25;
        let img;

        try {
            img = await loadImage(trackData.albumArt);

            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 20;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.save();
            roundRect(ctx, artX, artY, artSize, artSize, 10);
            ctx.clip();
            ctx.drawImage(img, artX, artY, artSize, artSize);
            ctx.restore();
        } catch (imgError) {
            console.error("error loading album art:", imgError);

            ctx.fillStyle = "#2E2E2E";
            roundRect(ctx, artX, artY, artSize, artSize, 10);
            ctx.fill();

            ctx.fillStyle = "#555";
            ctx.font = "80px sans-serif";
            ctx.fillText("♪", artX + artSize / 3, artY + artSize / 1.5);
        }

        const textX = artX + artSize + 20;
        const textWidth = canvas.width - textX - 20;

        let titleY = 75;
        if (!layout.hideStatus) {
            if (trackData.isNowPlaying) {
                ctx.fillStyle = colors.playing;
                ctx.font = `bold ${fontSizes.status}px 'RobotoMono'`;
                const nowPlayingText = "CURRENTLY PLAYING";
                ctx.fillText(nowPlayingText, textX, 40);

                const nowPlayingWidth = ctx.measureText(nowPlayingText).width;

                ctx.fillStyle = colors.accent;
                ctx.fillRect(textX, 46, nowPlayingWidth, 3);
            } else {
                ctx.fillStyle = colors.recently;
                ctx.font = `bold ${fontSizes.status}px 'RobotoMono'`;
                const recentlyPlayedText = "RECENTLY PLAYED";
                ctx.fillText(recentlyPlayedText, textX, 40);

                const recentlyPlayedWidth = ctx.measureText(recentlyPlayedText).width;

                ctx.fillStyle = colors.recently;
                ctx.fillRect(textX, 46, recentlyPlayedWidth, 3);
            }
        } else {
            titleY = 40;
        }

        ctx.fillStyle = colors.primary;
        ctx.font = `bold ${fontSizes.title}px 'RobotoMono'`;
        const wrappedTitleY = wrapText(ctx, trackData.title, textX, titleY, textWidth, fontSizes.title + 4);

        ctx.fillStyle = colors.secondary;
        ctx.font = `${fontSizes.artist}px 'RobotoMono'`;
        const artistY = wrappedTitleY + 25;
        const wrappedArtistY = wrapText(ctx, trackData.artist, textX, artistY, textWidth, fontSizes.artist + 4);

        if (trackData.album && !layout.hideAlbum) {
            ctx.fillStyle = colors.secondary;
            ctx.font = `${fontSizes.album}px 'RobotoMono'`;
            const albumY = wrappedArtistY + 18;
            wrapText(ctx, trackData.album, textX, albumY, textWidth, fontSizes.album + 5);
        }

        return canvas.toBuffer("image/png");
    } catch (error) {
        console.error("Error generating card:", error);
        return generateFallbackCard("Error generating card", null, userData, customOptions);
    }
}

async function generateFallbackCard(message, submessage = null, userData = null, customOptions = {}) {
    const options = customOptions;
    const colors = options.colors;
    const fontSizes = options.fontSizes;
    const dimensions = options.dimensions;
    const layout = options.layout || {};
    const cornerRadius = layout.cornerRadius !== undefined ? layout.cornerRadius : 16;

    const canvas = createCanvas(dimensions.width, dimensions.height);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, colors.cardBg);
    gradient.addColorStop(1, colors.background);
    ctx.fillStyle = gradient;
    roundRect(ctx, 10, 10, canvas.width - 20, canvas.height - 20, cornerRadius);
    ctx.fill();

    if (userData && userData.profileImage && !layout.hideProfile) {
        try {
            const profileImg = await loadImage(userData.profileImage);
            const profileSize = 34;
            const profileX = canvas.width - profileSize - 20;
            const profileY = 22;

            ctx.save();
            roundRect(ctx, profileX, profileY, profileSize, profileSize, 6);
            ctx.clip();
            ctx.drawImage(profileImg, profileX, profileY, profileSize, profileSize);
            ctx.restore();

            ctx.fillStyle = colors.primary;
            ctx.font = `${fontSizes.username}px 'RobotoMono'`;
            ctx.textAlign = "right";
            ctx.fillText(userData.username, profileX - 8, profileY + profileSize / 2 + 5);
            ctx.textAlign = "left";
        } catch (e) {
            console.error("error displaying profile image:", e);
        }
    }

    ctx.fillStyle = colors.secondary;
    ctx.font = "26px 'RobotoMono'";
    const textWidth = ctx.measureText(message).width;
    const textX = (canvas.width - textWidth) / 2;
    const textY = canvas.height / 2;

    ctx.fillText(message, textX, textY);

    if (submessage) {
        ctx.font = "16px 'RobotoMono'";
        const submessageWidth = ctx.measureText(submessage).width;
        const submessageX = (canvas.width - submessageWidth) / 2;
        ctx.fillText(submessage, submessageX, textY + 30);
    }

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
        linesToDraw[1] = linesToDraw[1].trim() + ' ...';
    }

    let textY = y;
    for (let i = 0; i < linesToDraw.length; i++) {
        ctx.fillText(linesToDraw[i], x, textY);
        textY += lineHeight;
    }

    return textY;
}
