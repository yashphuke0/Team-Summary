const axios = require('axios');
const FormData = require('form-data');
const supabase = require('./supabaseClient');

async function processImageWithOCR(imageBuffer) {
    if (!process.env.OCR_API_KEY || process.env.OCR_API_KEY === 'your_ocr_space_api_key_here') {
        throw new Error('OCR API key not configured. Please set OCR_API_KEY in your .env file. Get a free key from https://ocr.space/ocrapi');
    }
    try {
        const formData = new FormData();
        formData.append('file', imageBuffer, {
            filename: 'image.jpg',
            contentType: 'image/jpeg',
        });
        formData.append('apikey', process.env.OCR_API_KEY);
        formData.append('language', 'eng');
        formData.append('OCREngine', '1');
        formData.append('detectOrientation', 'true');
        formData.append('isTable', 'false');
        formData.append('scale', 'true');
        const response = await axios.post('https://api.ocr.space/parse/image', formData, {
            headers: {
                ...formData.getHeaders(),
            },
            timeout: 15000,
            maxRedirects: 3,
            validateStatus: function (status) {
                return status < 500;
            }
        });
        if (response.data && response.data.ParsedResults && response.data.ParsedResults.length > 0) {
            const extractedText = response.data.ParsedResults[0].ParsedText;
            return extractedText;
        } else {
            throw new Error('No text detected in the uploaded image. Please ensure the image is clear and contains visible player names.');
        }
    } catch (error) {
        const isNetworkError = 
            error.code === 'ETIMEDOUT' || 
            error.code === 'ECONNABORTED' || 
            error.code === 'ENOTFOUND' ||
            error.code === 'ECONNREFUSED' ||
            error.message.includes('timeout') || 
            error.message.includes('ETIMEDOUT') ||
            error.message.includes('network') ||
            error.message.includes('connect');
        if (isNetworkError) {
            throw new Error('Unable to connect to OCR service. Please check your internet connection and try again.');
        }
        throw error;
    }
}

function parseTeamDataFromOCRText(ocrText) {
    const lines = ocrText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const players = [];
    let currentRole = '';
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.toUpperCase().includes('WICKET-KEEPER')) { currentRole = 'Wicket-Keeper'; continue; }
        if (line.toUpperCase().includes('BATTER')) { currentRole = 'Batter'; continue; }
        if (line.toUpperCase().includes('ALL-ROUNDER')) { currentRole = 'All-Rounder'; continue; }
        if (line.toUpperCase().includes('BOWLER')) { currentRole = 'Bowler'; continue; }
        const skipLine = (
            line.toLowerCase().includes('dream11') ||
            line.toLowerCase().includes('pts') ||
            line.toLowerCase().includes('team') ||
            line.toLowerCase().includes('match') ||
            line.toLowerCase().includes('save') ||
            line.toLowerCase().includes('selected') ||
            line.toLowerCase().includes('edit') ||
            line.toLowerCase().includes('confirm') ||
            line.toLowerCase().includes('submit') ||
            line.toLowerCase().includes('preview') ||
            line.toLowerCase().includes('credits') ||
            line.toLowerCase().includes('remaining') ||
            line.toLowerCase().includes('balance') ||
            /^(CSK|MI|RCB|KKR|DC|PBKS|RR|SRH|GT|LSG|DT|RC|KK|PB|SR|GU|LS)$/i.test(line) ||
            line.toLowerCase().includes('wicket') ||
            line.toLowerCase().includes('keeper') ||
            line.toLowerCase().includes('batter') ||
            line.toLowerCase().includes('batsman') ||
            line.toLowerCase().includes('rounder') ||
            line.toLowerCase().includes('bowler') ||
            line.toLowerCase().includes('captain') ||
            /^\d+$/.test(line) ||
            /^\d+\.\d+$/.test(line) ||
            /^\d+\s*pts?$/i.test(line) ||
            line.toLowerCase() === 'c' ||
            line.toLowerCase() === 'vc' ||
            line.toLowerCase() === 'captain' ||
            line.toLowerCase() === 'vice' ||
            line.toLowerCase() === 'ot' ||
            line.toLowerCase() === 'o' ||
            line.toLowerCase() === 't' ||
            /^[.,;:!@#$%^&*()_+\-=\[\]{}|\\:";'<>?,./]$/.test(line) ||
            line.length < 2 ||
            line.length > 25 ||
            /^(tap|click|select|choose|add|remove|delete|cancel|ok|yes|no)$/i.test(line)
        );
        if (skipLine) continue;
        const isValidPlayerName = (
            /^[A-Za-z\s\.\-']{2,}$/.test(line) &&
            /[A-Za-z]/.test(line) &&
            !(line.length <= 4 && line === line.toUpperCase()) &&
            !line.includes('(') &&
            !line.includes(')') &&
            !line.includes('[') &&
            !line.includes(']') &&
            !['BATTING', 'BOWLING', 'FIELDING', 'EXTRAS', 'TOTAL', 'RUNS', 'WICKETS', 'OVERS'].includes(line.toUpperCase()) &&
            (line.includes(' ') || (line.length >= 3 && line.length <= 15))
        );
        if (isValidPlayerName) {
            let cleanName = line.replace(/\d+/g, '').replace(/pts?/gi, '').replace(/\s+/g, ' ').trim();
            if (cleanName.length >= 2 && cleanName.length <= 20 && /^[A-Za-z\s\.\-']+$/.test(cleanName)) {
                players.push({ name: cleanName, role: currentRole || 'Unknown' });
            }
        }
    }
    const uniquePlayers = players.filter((player, index, self) => index === self.findIndex(p => p.name === player.name));
    let finalPlayers = uniquePlayers.map(p => p.name);
    if (finalPlayers.length < 8) {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (finalPlayers.some(player => player.toLowerCase().includes(line.toLowerCase()) || line.toLowerCase().includes(player.toLowerCase()))) continue;
            if (line.length >= 3 && line.length <= 20 && /^[A-Za-z\s\.\-']+$/.test(line) && !/^(CSK|MI|RCB|KKR|DC|PBKS|RR|SRH|GT|LSG|BATTER|BOWLER|WICKET|KEEPER|ALL|ROUNDER)$/i.test(line)) {
                const cleanName = line.replace(/\d+/g, '').replace(/\s+/g, ' ').trim();
                if (cleanName.length >= 3 && !finalPlayers.includes(cleanName)) {
                    finalPlayers.push(cleanName);
                    if (finalPlayers.length >= 11) break;
                }
            }
        }
    }
    finalPlayers = finalPlayers.slice(0, 11);
    const captain = '';
    const viceCaptain = '';
    return {
        players: finalPlayers,
        captain: captain,
        vice_captain: viceCaptain,
        playerDetails: uniquePlayers.slice(0, 11),
        extractedCount: finalPlayers.length,
        expectedCount: 11
    };
}

module.exports = { processImageWithOCR, parseTeamDataFromOCRText }; 