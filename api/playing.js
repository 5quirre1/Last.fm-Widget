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

async function generateNowPlayingSVG(trackData, userData, customOptions = {}) {
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

	const barWidth = 4;
	const barSpacing = 2;
	const barColors = colors.playing;
	const barAnimDur = 0.5;
	return `
        <svg width="${dimensions.width}" height="${dimensions.height}" 
             viewBox="0 0 ${dimensions.width} ${dimensions.height}" 
             xmlns="http://www.w3.org/2000/svg" 
             xmlns:xlink="http://www.w3.org/1999/xlink">
            
            <defs>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&amp;display=swap');
                    text {
                        font-family: 'Roboto Mono', monospace;
                        fill: ${colors.primary};
                    }
                    .status-text {
                        font-weight: bold;
                        font-size: ${responsiveFontSizes.status}px;
                    }
                    .title-text {
                        font-weight: bold;
                        font-size: ${responsiveFontSizes.title}px;
                    }
                    .secondary-text {
                        fill: ${colors.secondary};
                        font-size: ${responsiveFontSizes.artist}px;
                    }
                    .album-text {
                        fill: ${colors.secondary};
                        font-size: ${responsiveFontSizes.album}px;
                    }
                    .username-text {
                        font-size: ${responsiveFontSizes.username}px;
                    }
                </style>
            </defs>
            
            
            <rect width="100%" height="100%" fill="transparent" /> 
            
            
            ${applyCardStyleSVG(dimensions, colors, layout, padding)}
            
            
            ${userData && userData.profileImage && !layout.hideProfile ? `
                <defs>
                    <clipPath id="profileClip">
                        <rect x="${profileX}" y="${profileY}" width="${profileSize}" height="${profileSize}" rx="6" />
                    </clipPath>
                </defs>
                <image href="${escapeXml(userData.profileImage)}" 
                        x="${profileX}" y="${profileY}" 
                        width="${profileSize}" height="${profileSize}"
                        clip-path="url(#profileClip)" />
                <text x="${profileX - 8}" y="${profileY + profileSize / 2 + 5}" 
                      text-anchor="end" class="username-text">
                    ${escapeXml(userData.username)}
                </text>
            ` : ''}
            
            
            <defs>
                <clipPath id="artClip">
                    ${applyArtStyleSVG(artX, artY, artSize, layout.cardStyle)}
                </clipPath>
            </defs>
            <image href="${escapeXml(trackData.albumArt)}" 
                    x="${artX}" y="${artY}" 
                    width="${artSize}" height="${artSize}"
                    clip-path="url(#artClip)" />
            
            
            ${!layout.hideStatus ? `
        <g>
            <text x="${textX}" y="${statusTextY}" class="status-text" 
                  fill="${trackData.isNowPlaying ? colors.playing : colors.recently}">
                ${statusText}
            </text>
            <rect x="${textX}" y="${statusTextY + 6}" 
                  width="${statusTextWidth}" 
                  height="3" 
                  fill="${trackData.isNowPlaying ? colors.accent : colors.recently}" />
        </g>
        
        ${trackData.isNowPlaying ? `
            <g>
                ${
                (() => {
                    const barsX = textX + statusTextWidth + 10;
                    return `
                        <g transform="translate(${barsX}, ${statusTextY})">
                            <rect x="0" y="-20" width="${barWidth}" height="20" fill="${barColors}">
                                <animate attributeName="height" values="20;5;20" dur="${barAnimDur}s" repeatCount="indefinite" begin="0s" />
                                <animate attributeName="y" values="-20;-5;-20" dur="${barAnimDur}s" repeatCount="indefinite" begin="0s" />
                            </rect>
                            <rect x="${barWidth + barSpacing}" y="-15" width="${barWidth}" height="15" fill="${barColors}">
                                <animate attributeName="height" values="15;20;15" dur="${barAnimDur}s" repeatCount="indefinite" begin="0.1s" />
                                <animate attributeName="y" values="-15;-20;-15" dur="${barAnimDur}s" repeatCount="indefinite" begin="0.1s" />
                            </rect>
                            <rect x="${2 * (barWidth + barSpacing)}" y="-10" width="${barWidth}" height="10" fill="${barColors}">
                                <animate attributeName="height" values="10;15;10" dur="${barAnimDur}s" repeatCount="indefinite" begin="0.2s" />
                                <animate attributeName="y" values="-10;-15;-10" dur="${barAnimDur}s" repeatCount="indefinite" begin="0.2s" />
                            </rect>
                        </g>
                        `;
                })()
                }
            </g>
        ` : ''}
    ` : ''}
            
            
            <g>
                
                <text x="${textX}" y="${textStartY + 20}" class="title-text">
                    ${escapeXml(truncateText(trackData.title, textWidth, responsiveFontSizes.title))}
                </text>
                
                <text x="${textX}" y="${textStartY + 55}" class="secondary-text">
                    ${escapeXml(truncateText(trackData.artist, textWidth, responsiveFontSizes.artist))}
                </text>

                
                ${trackData.album && !layout.hideAlbum ? `
                    <text x="${textX}" y="${textStartY + 85}" class="album-text">
                        ${escapeXml(truncateText(trackData.album, textWidth, responsiveFontSizes.album))}
                    </text>
                ` : ''}
            </g>
        </svg>
    `;
}

function generateFallbackSVG(message, submessage = null, userData = null, customOptions = {}) {
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

	const profileSize = Math.max(24, Math.round(34 * responsiveFontScale));
	const profileX = dimensions.width - profileSize - 20;
	const profileY = 20;

	return `
        <svg width="${dimensions.width}" height="${dimensions.height}" 
             viewBox="0 0 ${dimensions.width} ${dimensions.height}" 
             xmlns="http://www.w3.org/2000/svg" 
             xmlns:xlink="http://www.w3.org/1999/xlink">
            
            <defs>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&amp;display=swap');
                    text {
                        font-family: 'Roboto Mono', monospace;
                    }
                </style>
            </defs>
            
            
            <rect width="100%" height="100%" fill="transparent" />
            
            
            ${applyCardStyleSVG(dimensions, colors, layout)}
            
            
            ${userData && userData.profileImage && !layout.hideProfile ? `
                <defs>
                    <clipPath id="profileClip">
                        <rect x="${profileX}" y="${profileY}" width="${profileSize}" height="${profileSize}" rx="6" />
                    </clipPath>
                </defs>
                <image href="${escapeXml(userData.profileImage)}" 
                        x="${profileX}" y="${profileY}" 
                        width="${profileSize}" height="${profileSize}"
                        clip-path="url(#profileClip)" />
                <text x="${profileX - 8}" y="${profileY + profileSize / 2 + 5}" 
                      text-anchor="end" fill="${colors.primary}" 
                      font-size="${Math.round(fontSizes.username * responsiveFontScale)}px">
                    ${escapeXml(userData.username)}
                </text>
            ` : ''}
            
            
            <text x="50%" y="${dimensions.height / 2}" 
                  text-anchor="middle" 
                  fill="${colors.secondary}" 
                  font-size="${mainFontSize}px"
                  font-family="Roboto Mono">
                ${escapeXml(message)}
            </text>
            
            
            ${submessage ? `
                <text x="50%" y="${dimensions.height / 2 + 30}" 
                      text-anchor="middle" 
                      fill="${colors.secondary}" 
                      font-size="${subFontSize}px"
                      font-family="Roboto Mono">
                    ${escapeXml(submessage)}
                </text>
            ` : ''}
        </svg>
    `;
}

function applyCardStyleSVG(dimensions, colors, layout, padding = 20) {
	const {
		width,
		height
	} = dimensions;
	const cornerRadius = layout.cornerRadius !== undefined ? layout.cornerRadius :
		layout.cardStyle === CARD_STYLES.BOX ? 0 : 16;

	switch (layout.cardStyle) {
		case CARD_STYLES.BOX:
			return `
                <rect x="${padding / 2}" y="${padding / 2}" 
                      width="${width - padding}" height="${height - padding}" 
                      fill="${colors.cardBg}" />
            `;

		case CARD_STYLES.CIRCLE:
			const centerX = width / 2;
			const centerY = height / 2;
			const radius = Math.min(width, height) * 0.45;
			return `
                <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="${colors.cardBg}" />
            `;

		case CARD_STYLES.MODERN:
			return `
                <rect x="${padding / 2}" y="${padding / 2}" 
                      width="${width - padding}" height="${height - padding}" 
                      rx="${cornerRadius}" fill="${colors.cardBg}" />
                <rect x="${padding / 2}" y="${padding / 2}" 
                      width="${width - padding}" height="${height - padding}" 
                      rx="${cornerRadius}" fill="none" stroke="${colors.accent}" stroke-width="2" />
            `;

		case CARD_STYLES.NEOMORPH:
			return `
                <filter id="shadow">
                    <feDropShadow dx="8" dy="8" stdDeviation="5" flood-color="#121212" />
                    <feDropShadow dx="-8" dy="-8" stdDeviation="5" flood-color="#2a2a2a" />
                </filter>
                <rect x="10" y="10" width="${width - 20}" height="${height - 20}" 
                      rx="${cornerRadius}" fill="${colors.cardBg}" filter="url(#shadow)" />
                <rect x="10" y="10" width="${width - 20}" height="${height - 20}" 
                      rx="${cornerRadius}" fill="none" stroke="#2a2a2a" stroke-width="2" />
            `;

		default:
			return `
                <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="${colors.cardBg}" />
                        <stop offset="100%" stop-color="${colors.background}" />
                    </linearGradient>
                </defs>
                <rect x="10" y="10" width="${width - 20}" height="${height - 20}" 
                      rx="${cornerRadius}" fill="url(#gradient)" />
            `;
	}
}

function applyArtStyleSVG(x, y, size, style) {
	switch (style) {
		case CARD_STYLES.CIRCLE:
			return `<circle cx="${x + size / 2}" cy="${y + size / 2}" r="${size / 2}" />`;

		case CARD_STYLES.MODERN:
			return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="8" />`;

		case CARD_STYLES.NEOMORPH:
			return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="15" />`;

		default:
			return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="10" />`;
	}
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
		const noUserSVG = await generateFallbackSVG(
			"Hai! you need to put a user..",
			"Example: '?username=Squirre1Z'",
			null,
			customOptions
		);
		res.setHeader("Content-Type", "image/svg+xml");
		res.setHeader("Cache-Control", "public, max-age=60");
		return res.send(noUserSVG);
	}

	try {
		const randomId = crypto.randomBytes(4).toString('hex');
		const userData = await fetchUserData(username, apiKey);
		const trackData = await fetchLastFmData(username, apiKey);

		if (!trackData || (!trackData.title && !trackData.artist)) {
			console.warn("no track data received from Last.fm, displaying fallback");
			const emptySVG = await generateFallbackSVG(
				"no track data found..",
				null,
				userData,
				customOptions
			);
			res.setHeader("Content-Type", "image/svg+xml");
			res.setHeader("Cache-Control", "public, max-age=30");
			return res.send(emptySVG);
		}
		const svgContent = await generateNowPlayingSVG(trackData, userData, customOptions);

		res.setHeader("Content-Type", "image/svg+xml");
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

		return res.send(svgContent);

	} catch (error) {
		console.error("error generating now playing card:", error);
		if (error.message === "NOT_FOUND") {
			const notFoundSVG = generateFallbackSVG(
				`user '${username}' not found..`,
				null,
				null,
				customOptions
			);
			res.setHeader("Content-Type", "image/svg+xml");
			res.setHeader("Cache-Control", "public, max-age=60");
			return res.status(404).send(notFoundSVG);
		}

		const errorSVG = generateFallbackSVG(
			"error fetching data",
			null,
			null,
			customOptions
		);
		res.setHeader("Content-Type", "image/svg+xml");
		res.setHeader("Cache-Control", "public, max-age=10");
		return res.status(500).send(errorSVG);
	}
}
