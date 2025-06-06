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


const fetch = require("node-fetch");
const crypto = require("crypto");
const GIFEncoder = require('gifencoder');
const { createCanvas, registerFont } = require('canvas');
const path = require("path");

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

const CARD_STYLES = {
	DEFAULT: 'default',
	BOX: 'box',
	CIRCLE: 'circle',
	MODERN: 'modern',
	NEOMORPH: 'neomorph'
};

function escapeXml(text) {
	if (!text) return '';
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function truncateText(text, maxWidth, fontSize) {
	if (!text) return '';

	const avgCharWidth = fontSize * 0.6;
	const maxChars = Math.floor(maxWidth / avgCharWidth);

	if (text.length <= maxChars) return text;

	const words = text.split(' ');
	let truncated = '';

	for (const word of words) {
		if ((truncated + word).length > maxChars - 3) break;
		if (truncated) truncated += ' ';
		truncated += word;
	}

	return truncated + (truncated.length < text.length ? '...' : '');
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
		layout: {
			cardStyle: CARD_STYLES.DEFAULT
		},
		fonts: {}
	};

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
	if (query.cardStyle) options.layout.cardStyle = query.cardStyle.toLowerCase();

	if (query.fontFamily) options.fonts.fontFamily = query.fontFamily;

	return options;
}

async function fetchUserData(username, apiKey) {
	const url = `https://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${username}&api_key=${apiKey}&format=json&_=${Date.now()}`;

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

async function generateNowPlayingGIF(trackData, userData, customOptions = {}) {
	const options = customOptions;
	const {
		colors,
		fontSizes,
		dimensions,
		layout = {}
	} = options;

	const padding = 20;
	const responsiveArtSize = Math.min(dimensions.artSize, dimensions.height - 2 * padding);
	const responsiveFontScale = Math.min(1, dimensions.width / DEFAULT_DIMENSIONS.width);

	const responsiveFontSizes = {
		username: Math.round(fontSizes.username * responsiveFontScale),
		status: Math.round(fontSizes.status * responsiveFontScale),
		title: Math.round(fontSizes.title * responsiveFontScale),
		artist: Math.round(fontSizes.artist * responsiveFontScale),
		album: Math.round(fontSizes.album * responsiveFontScale)
	};

	const artSize = responsiveArtSize;
	const artX = padding;
	const artY = (dimensions.height - artSize) / 2;

	const textX = artX + artSize + padding;
	const textWidth = dimensions.width - textX - padding;
	const textStartY = padding + (layout.hideStatus ? 0 : 40 * responsiveFontScale);

	const profileSize = Math.max(24, Math.round(34 * responsiveFontScale));
	const profileX = dimensions.width - profileSize - padding;
	const profileY = padding;

	const statusText = trackData.isNowPlaying ? "CURRENTLY PLAYING" : "RECENTLY PLAYED";
	const statusTextWidth = statusText.length * (responsiveFontSizes.status * 0.6);
	const statusTextY = textStartY - 20;

	const encoder = new GIFEncoder(dimensions.width, dimensions.height);
	encoder.start();
	encoder.setRepeat(0);
	encoder.setDelay(100);

	const canvas = createCanvas(dimensions.width, dimensions.height);
	const ctx = canvas.getContext('2d');

	const frames = trackData.isNowPlaying ? 20 : 1;

	for (let frame = 0; frame < frames; frame++) {
		applyCardStyleCanvas(ctx, dimensions, colors, layout, padding);

		if (userData && userData.profileImage && !layout.hideProfile) {
			const profileImg = await loadImage(userData.profileImage);
			ctx.save();
			roundRect(ctx, profileX, profileY, profileSize, profileSize, 6);
			ctx.clip();
			ctx.drawImage(profileImg, profileX, profileY, profileSize, profileSize);
			ctx.restore();

			ctx.fillStyle = colors.primary;
			ctx.font = `${responsiveFontSizes.username}px Roboto Mono`;
			ctx.textAlign = 'right';
			ctx.fillText(userData.username, profileX - 8, profileY + profileSize / 2 + 5);
		}

		const albumImg = await loadImage(trackData.albumArt);
		ctx.save();
		applyArtStyleCanvas(ctx, artX, artY, artSize, layout.cardStyle);
		ctx.clip();
		ctx.drawImage(albumImg, artX, artY, artSize, artSize);
		ctx.restore();

		if (!layout.hideStatus) {
			ctx.fillStyle = trackData.isNowPlaying ? colors.playing : colors.recently;
			ctx.font = `bold ${responsiveFontSizes.status}px Roboto Mono`;
			ctx.textAlign = 'left';
			ctx.fillText(statusText, textX, statusTextY);

			ctx.fillRect(textX, statusTextY + 6, statusTextWidth, 3);

			if (trackData.isNowPlaying) {
				const barsX = textX + statusTextWidth + 20;
				const barWidth = 4;
				const barSpacing = 2;
				const progress = frame / frames;

				const bar1Height = 20 * (0.5 + 0.5 * Math.sin(progress * Math.PI * 4));
				const bar2Height = 15 * (0.5 + 0.5 * Math.sin(progress * Math.PI * 4 + 0.4));
				const bar3Height = 10 * (0.5 + 0.5 * Math.sin(progress * Math.PI * 4 + 0.8));

				ctx.fillStyle = colors.playing;
				ctx.fillRect(barsX, statusTextY - bar1Height, barWidth, bar1Height);
				ctx.fillRect(barsX + barWidth + barSpacing, statusTextY - bar2Height, barWidth, bar2Height);
				ctx.fillRect(barsX + 2 * (barWidth + barSpacing), statusTextY - bar3Height, barWidth, bar3Height);
			}
		}

		ctx.fillStyle = colors.primary;
		ctx.font = `bold ${responsiveFontSizes.title}px Roboto Mono`;
		ctx.textAlign = 'left';
		ctx.fillText(truncateText(trackData.title, textWidth, responsiveFontSizes.title), textX, textStartY + 20);

		ctx.fillStyle = colors.secondary;
		ctx.font = `${responsiveFontSizes.artist}px Roboto Mono`;
		ctx.fillText(truncateText(trackData.artist, textWidth, responsiveFontSizes.artist), textX, textStartY + 55);

		if (trackData.album && !layout.hideAlbum) {
			ctx.font = `${responsiveFontSizes.album}px Roboto Mono`;
			ctx.fillText(truncateText(trackData.album, textWidth, responsiveFontSizes.album), textX, textStartY + 85);
		}

		encoder.addFrame(ctx);
	}

	encoder.finish();
	return encoder.out.getData();
}

function generateFallbackGIF(message, submessage = null, userData = null, customOptions = {}) {
	const options = customOptions;
	const {
		colors,
		fontSizes,
		dimensions,
		layout = {}
	} = options;

	const responsiveFontScale = Math.min(1, dimensions.width / DEFAULT_DIMENSIONS.width);
	const mainFontSize = Math.round(26 * responsiveFontScale);
	const subFontSize = Math.round(16 * responsiveFontScale);

	const encoder = new GIFEncoder(dimensions.width, dimensions.height);
	encoder.start();
	encoder.setRepeat(0);
	encoder.setDelay(1000);

	const canvas = createCanvas(dimensions.width, dimensions.height);
	const ctx = canvas.getContext('2d');

	ctx.fillStyle = colors.background;
	ctx.fillRect(0, 0, dimensions.width, dimensions.height);

	applyCardStyleCanvas(ctx, dimensions, colors, layout);

	ctx.fillStyle = colors.secondary;
	ctx.font = `${mainFontSize}px Roboto Mono`;
	ctx.textAlign = 'center';
	ctx.fillText(message, dimensions.width / 2, dimensions.height / 2);

	if (submessage) {
		ctx.font = `${subFontSize}px Roboto Mono`;
		ctx.fillText(submessage, dimensions.width / 2, dimensions.height / 2 + 30);
	}

	encoder.addFrame(ctx);
	encoder.finish();
	return encoder.out.getData();
}

function applyCardStyleCanvas(ctx, dimensions, colors, layout, padding = 20) {
	const {
		width,
		height
	} = dimensions;
	const cornerRadius = layout.cornerRadius !== undefined ? layout.cornerRadius :
		layout.cardStyle === CARD_STYLES.BOX ? 0 : 16;

	ctx.fillStyle = colors.cardBg;

	switch (layout.cardStyle) {
		case CARD_STYLES.BOX:
			ctx.fillRect(padding / 2, padding / 2, width - padding, height - padding);
			break;

		case CARD_STYLES.CIRCLE:
			const centerX = width / 2;
			const centerY = height / 2;
			const radius = Math.min(width, height) * 0.45;
			ctx.beginPath();
			ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
			ctx.fill();
			break;

		case CARD_STYLES.MODERN:
		case CARD_STYLES.NEOMORPH:
		default:
			roundRect(ctx, padding / 2, padding / 2, width - padding, height - padding, cornerRadius);
			ctx.fill();
			break;
	}
}

function applyArtStyleCanvas(ctx, x, y, size, style) {
	switch (style) {
		case CARD_STYLES.CIRCLE:
			ctx.beginPath();
			ctx.arc(x + size / 2, y + size / 2, size / 2, 0, 2 * Math.PI);
			break;

		case CARD_STYLES.MODERN:
			roundRect(ctx, x, y, size, size, 8);
			break;

		case CARD_STYLES.NEOMORPH:
			roundRect(ctx, x, y, size, size, 15);
			break;

		default:
			roundRect(ctx, x, y, size, size, 10);
			break;
	}
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

async function loadImage(url) {
	const response = await fetch(url);
	const buffer = await response.buffer();
	const { loadImage } = require('canvas');
	return loadImage(buffer);
}

export default async function handler(req, res) {
	console.log(`API request received: ${req.method} ${req.url}`);

	const username = req.query.username;
	const apiKey = process.env.api;
	const customOptions = parseCustomOptions(req.query);

	if (!apiKey) {
		console.error("missing Last.fm API key");
		return res.status(500).send("server configuration error");
	}

	if (!username) {
		const noUserGIF = await generateFallbackGIF(
			"Hai! you need to put a user..",
			"Example: '?username=Squirre1Z'",
			null,
			customOptions
		);
		res.setHeader("Content-Type", "image/gif");
		res.setHeader("Cache-Control", "public, max-age=60");
		return res.send(noUserGIF);
	}

	try {
		const randomId = crypto.randomBytes(4).toString('hex');
		const userData = await fetchUserData(username, apiKey);
		const trackData = await fetchLastFmData(username, apiKey);

		if (!trackData || (!trackData.title && !trackData.artist)) {
			console.warn("no track data received from Last.fm, displaying fallback");
			const emptyGIF = await generateFallbackGIF(
				"no track data found..",
				null,
				userData,
				customOptions
			);
			res.setHeader("Content-Type", "image/gif");
			res.setHeader("Cache-Control", "public, max-age=30");
			return res.send(emptyGIF);
		}
		const gifContent = await generateNowPlayingGIF(trackData, userData, customOptions);

		res.setHeader("Content-Type", "image/gif");
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

		return res.send(gifContent);

	} catch (error) {
		console.error("error generating now playing card:", error);
		if (error.message === "NOT_FOUND") {
			const notFoundGIF = generateFallbackGIF(
				`user '${username}' not found..`,
				null,
				null,
				customOptions
			);
			res.setHeader("Content-Type", "image/gif");
			res.setHeader("Cache-Control", "public, max-age=60");
			return res.status(404).send(notFoundGIF);
		}

		const errorGIF = generateFallbackGIF(
			"error fetching data",
			null,
			null,
			customOptions
		);
		res.setHeader("Content-Type", "image/gif");
		res.setHeader("Cache-Control", "public, max-age=10");
		return res.status(500).send(errorGIF);
	}
}
