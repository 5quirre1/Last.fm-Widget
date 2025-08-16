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
const {
	createCanvas,
	registerFont
} = require('canvas');
const path = require("path");
registerFont(path.join(__dirname, "fonts", "RobotoMono-Bold.ttf"), {
	family: "RobotoMono",
	weight: "bold"
});
registerFont(path.join(__dirname, "fonts", "RobotoMono-Regular.ttf"), {
	family: "RobotoMono"
});
const COLORS = {
	background: "transparent",
	overlay: "rgba(0, 0, 0, 0.41)",
	topBar: "rgba(0, 0, 0, 0.8)",
	primary: "#FFFFFF",
	secondary: "#E0E0E0",
	playing: "#1ED760",
	recently: "#FF6B6B"
};
const DEFAULT_DIMENSIONS = {
	width: 180,
	height: 168
};

function calculateResponsiveElements(width, height) {
	const widthScale = width / DEFAULT_DIMENSIONS.width;
	const heightScale = height / DEFAULT_DIMENSIONS.height;
	const scale = Math.min(widthScale, heightScale);
	const minScale = 0.5;
	const maxScale = 2.0;
	const finalScale = Math.max(minScale, Math.min(maxScale, scale));
	const fontSizes = {
		username: Math.max(8, Math.round(11 * finalScale)),
		status: Math.max(7, Math.round(10 * finalScale)),
		title: Math.max(12, Math.round(18 * finalScale)),
		artist: Math.max(10, Math.round(14 * finalScale))
	};
	const padding = Math.max(8, Math.round(16 * finalScale));
	const topBarHeight = Math.max(24, Math.round(32 * finalScale));
	const profileSize = Math.max(16, Math.round(24 * finalScale));
	const waveBarWidth = Math.max(2, Math.round(3 * finalScale));
	const waveBarSpacing = Math.max(2, Math.round(3 * finalScale));
	const waveMaxHeight = Math.max(8, Math.round(15 * finalScale));
	const fadeWidth = Math.max(30, Math.round(60 * finalScale));
	return {
		fontSizes,
		padding,
		topBarHeight,
		profileSize,
		scale: finalScale,
		waveBarWidth,
		waveBarSpacing,
		waveMaxHeight,
		fadeWidth
	};
}

function parseCustomOptions(query) {
	let dimensions = {
		...DEFAULT_DIMENSIONS
	};
	if (query.width) {
		dimensions.width = parseInt(query.width);
	}
	if (query.height) {
		dimensions.height = parseInt(query.height);
	}
	const responsiveElements = calculateResponsiveElements(dimensions.width, dimensions.height);
	return {
		dimensions,
		responsiveElements
	};
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
			albumArt: track.image[3]["#text"] || "https://graybox.lol/img/lastfm/lastfm-album-placeholder.jpg",
			isNowPlaying: !!track["@attr"]?.nowplaying
		};
	} catch (error) {
		console.error("error fetching from Last.fm:", error);
		throw error;
	}
}

function drawTextWithFadeOut(ctx, text, x, y, maxWidth, color, fadeWidth) {
	const textWidth = ctx.measureText(text).width;
	if (textWidth <= maxWidth) {
		ctx.fillStyle = color;
		ctx.fillText(text, x, y);
		return;
	}
	const visibleWidth = maxWidth - fadeWidth;
	let r, g, b, baseAlpha = 1;
	if (color.startsWith('#')) {
		const hex = color.replace('#', '');
		r = parseInt(hex.substr(0, 2), 16);
		g = parseInt(hex.substr(2, 2), 16);
		b = parseInt(hex.substr(4, 2), 16);
	} else if (color.startsWith('rgba')) {
		const values = color.match(/rgba?\(([^)]+)\)/)[1].split(',');
		r = parseInt(values[0].trim());
		g = parseInt(values[1].trim());
		b = parseInt(values[2].trim());
		baseAlpha = values[3] ? parseFloat(values[3].trim()) : 1;
	} else if (color.startsWith('rgb')) {
		const values = color.match(/rgb?\(([^)]+)\)/)[1].split(',');
		r = parseInt(values[0].trim());
		g = parseInt(values[1].trim());
		b = parseInt(values[2].trim());
	} else {
		r = 255;
		g = 255;
		b = 255;
	}
	const fontSize = parseInt(ctx.font.match(/\d+/)[0]);
	const fontHeight = fontSize * 1.2;
	ctx.save();
	ctx.rect(x, y - fontSize, visibleWidth, fontHeight);
	ctx.clip();
	ctx.fillStyle = color;
	ctx.fillText(text, x, y);
	ctx.restore();
	const fadeSteps = Math.max(10, Math.round(20 * (fadeWidth / 60)));
	const stepWidth = fadeWidth / fadeSteps;
	for (let i = 0; i < fadeSteps; i++) {
		const stepX = x + visibleWidth + (i * stepWidth);
		const opacity = baseAlpha * (1 - (i / fadeSteps));
		ctx.save();
		ctx.rect(stepX, y - fontSize, stepWidth + 1, fontHeight);
		ctx.clip();
		ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
		ctx.fillText(text, x, y);
		ctx.restore();
	}
}
async function generateNowPlayingPNG(trackData, userData, customOptions = {}) {
	const {
		dimensions,
		responsiveElements
	} = customOptions;
	const {
		fontSizes,
		padding,
		topBarHeight,
		profileSize,
		waveBarWidth,
		waveBarSpacing,
		waveMaxHeight,
		fadeWidth
	} = responsiveElements;
	const canvas = createCanvas(dimensions.width, dimensions.height);
	const ctx = canvas.getContext('2d');
	const albumImg = await loadImage(trackData.albumArt);
	let profileImg = null;
	if (userData && userData.profileImage) {
		try {
			profileImg = await loadImage(userData.profileImage);
		} catch (err) {
			console.warn('Failed to load profile image:', err);
			profileImg = null;
		}
	}
	const albumAspectRatio = albumImg.width / albumImg.height;
	const canvasAspectRatio = dimensions.width / dimensions.height;
	let drawWidth, drawHeight, drawX, drawY;
	if (albumAspectRatio > canvasAspectRatio) {
		drawHeight = dimensions.height;
		drawWidth = drawHeight * albumAspectRatio;
		drawX = (dimensions.width - drawWidth) / 2;
		drawY = 0;
	} else {
		drawWidth = dimensions.width;
		drawHeight = drawWidth / albumAspectRatio;
		drawX = 0;
		drawY = (dimensions.height - drawHeight) / 2;
	}
	ctx.drawImage(albumImg, drawX, drawY, drawWidth, drawHeight);
	ctx.fillStyle = COLORS.overlay;
	ctx.fillRect(0, 0, dimensions.width, dimensions.height);
	ctx.fillStyle = COLORS.topBar;
	ctx.fillRect(0, 0, dimensions.width, topBarHeight);
	const statusText = trackData.isNowPlaying ? "NOW PLAYING" : "LAST PLAYED";
	const statusColor = trackData.isNowPlaying ? COLORS.playing : COLORS.recently;
	ctx.fillStyle = statusColor;
	ctx.font = `bold ${fontSizes.status}px RobotoMono`;
	ctx.textAlign = 'left';
	const statusY = topBarHeight / 2 + (fontSizes.status / 3);
	ctx.fillText(statusText, padding, statusY);
	if (trackData.isNowPlaying) {
		const dotX = padding + ctx.measureText(statusText).width + Math.round(8 * responsiveElements.scale);
		const dotRadius = Math.max(2, Math.round(4 * responsiveElements.scale));
		ctx.fillStyle = statusColor;
		ctx.beginPath();
		ctx.arc(dotX, topBarHeight / 2, dotRadius, 0, 2 * Math.PI);
		ctx.fill();
	}
	if (userData && profileImg) {
		const profileX = dimensions.width - profileSize - padding;
		const profileY = (topBarHeight - profileSize) / 2;
		ctx.save();
		ctx.beginPath();
		ctx.arc(profileX + profileSize / 2, profileY + profileSize / 2, profileSize / 2, 0, 2 * Math.PI);
		ctx.clip();
		ctx.drawImage(profileImg, profileX, profileY, profileSize, profileSize);
		ctx.restore();
		ctx.fillStyle = COLORS.secondary;
		ctx.font = `${fontSizes.username}px RobotoMono`;
		ctx.textAlign = 'right';
		const usernameY = topBarHeight / 2 + (fontSizes.username / 3);
		ctx.fillText(userData.username, profileX - Math.round(8 * responsiveElements.scale), usernameY);
	} else if (userData) {
		ctx.fillStyle = COLORS.secondary;
		ctx.font = `${fontSizes.username}px RobotoMono`;
		ctx.textAlign = 'right';
		const usernameY = topBarHeight / 2 + (fontSizes.username / 3);
		ctx.fillText(userData.username, dimensions.width - padding, usernameY);
	}
	const contentY = topBarHeight + padding;
	const titleY = contentY + fontSizes.title;
	const artistY = titleY + fontSizes.artist + Math.round(padding * 0.75);
	const maxTextWidth = dimensions.width - (padding * 2);
	ctx.font = `bold ${fontSizes.title}px RobotoMono`;
	ctx.textAlign = 'left';
	drawTextWithFadeOut(ctx, trackData.title, padding, titleY, maxTextWidth, COLORS.primary, fadeWidth);
	ctx.font = `${fontSizes.artist}px RobotoMono`;
	drawTextWithFadeOut(ctx, trackData.artist, padding, artistY, maxTextWidth, COLORS.secondary, fadeWidth);
	if (trackData.isNowPlaying) {
		const waveBottomMargin = Math.round(padding * 1.25);
		const waveY = dimensions.height - waveBottomMargin;
		const totalWaveWidth = (waveBarWidth + waveBarSpacing) * 5 - waveBarSpacing;
		const waveX = dimensions.width - totalWaveWidth - padding;
		ctx.fillStyle = COLORS.playing;
		const barHeights = [
			Math.round(waveMaxHeight * 0.8),
			Math.round(waveMaxHeight * 0.53),
			waveMaxHeight,
			Math.round(waveMaxHeight * 0.4),
			Math.round(waveMaxHeight * 0.67)
		];
		for (let i = 0; i < 5; i++) {
			const barX = waveX + i * (waveBarWidth + waveBarSpacing);
			const barHeight = barHeights[i];
			ctx.fillRect(barX, waveY - barHeight, waveBarWidth, barHeight);
		}
	}
	return canvas.toBuffer('image/png');
}

function generateFallbackPNG(message, submessage = null, customOptions = {}) {
	const {
		dimensions,
		responsiveElements
	} = customOptions;
	const {
		fontSizes,
		padding
	} = responsiveElements;
	const canvas = createCanvas(dimensions.width, dimensions.height);
	const ctx = canvas.getContext('2d');
	const gradient = ctx.createLinearGradient(0, 0, dimensions.width, dimensions.height);
	gradient.addColorStop(0, '#1a1a1a');
	gradient.addColorStop(1, '#0d0d0d');
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, dimensions.width, dimensions.height);
	const mainFontSize = Math.max(12, Math.round(16 * responsiveElements.scale));
	const subFontSize = Math.max(10, Math.round(12 * responsiveElements.scale));
	ctx.fillStyle = COLORS.secondary;
	ctx.font = `bold ${mainFontSize}px RobotoMono`;
	ctx.textAlign = 'center';
	ctx.fillText(message, dimensions.width / 2, dimensions.height / 2 - (submessage ? 10 : 0));
	if (submessage) {
		ctx.fillStyle = COLORS.secondary;
		ctx.font = `${subFontSize}px RobotoMono`;
		ctx.fillText(submessage, dimensions.width / 2, dimensions.height / 2 + 15);
	}
	return canvas.toBuffer('image/png');
}
async function loadImage(url) {
	const response = await fetch(url);
	const buffer = await response.buffer();
	const {
		loadImage
	} = require('canvas');
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
		const noUserPNG = generateFallbackPNG(
			"hey! you need to add a username",
			"example: ?username=Squirre1Z",
			customOptions
		);
		res.setHeader("Content-Type", "image/png");
		res.setHeader("Cache-Control", "public, max-age=60");
		return res.send(noUserPNG);
	}
	try {
		const randomId = crypto.randomBytes(4).toString('hex');
		const userData = await fetchUserData(username, apiKey);
		const trackData = await fetchLastFmData(username, apiKey);
		if (!trackData || (!trackData.title && !trackData.artist)) {
			console.warn("no track data received from Last.fm, displaying fallback");
			const emptyPNG = generateFallbackPNG(
				"no recent tracks found",
				null,
				customOptions
			);
			res.setHeader("Content-Type", "image/png");
			res.setHeader("Cache-Control", "public, max-age=30");
			return res.send(emptyPNG);
		}
		const pngContent = await generateNowPlayingPNG(trackData, userData, customOptions);
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
		return res.send(pngContent);
	} catch (error) {
		console.error("error generating now playing card:", error);
		if (error.message === "NOT_FOUND") {
			const notFoundPNG = generateFallbackPNG(
				`user '${username}' not found`,
				null,
				customOptions
			);
			res.setHeader("Content-Type", "image/png");
			res.setHeader("Cache-Control", "public, max-age=60");
			return res.status(404).send(notFoundPNG);
		}
		const errorPNG = generateFallbackPNG(
			"error fetching data",
			null,
			customOptions
		);
		res.setHeader("Content-Type", "image/png");
		res.setHeader("Cache-Control", "public, max-age=10");
		return res.status(500).send(errorPNG);
	}
}
