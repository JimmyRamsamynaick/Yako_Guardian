/**
 * Parse a duration string into milliseconds.
 * Supported formats: 10s, 5m, 2h, 1d, 1w
 * @param {string} input 
 * @returns {number|null} Duration in ms or null if invalid
 */
function parseDuration(input) {
    if (!input) return null;
    const regex = /^(\d+)(s|m|h|d|w)$/i;
    const match = input.match(regex);
    
    if (!match) return null;
    
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        case 'w': return value * 7 * 24 * 60 * 60 * 1000;
        default: return null;
    }
}

/**
 * Format milliseconds into a readable duration string.
 * @param {number} ms 
 * @returns {string}
 */
function formatDuration(ms) {
    if (ms < 1000) return "0s";
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    const parts = [];
    if (days > 0) parts.push(`${days}j`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);

    return parts.join(' ');
}

module.exports = { parseDuration, formatDuration };
