// Application Constants
const API_BASE_URL = 'http://localhost:3001/api';

// IPL 2025 Teams
const IPL_TEAMS = [
    'Chennai Super Kings',
    'Mumbai Indians', 
    'Royal Challengers Bengaluru',
    'Kolkata Knight Riders',
    'Delhi Capitals',
    'Punjab Kings',
    'Rajasthan Royals',
    'Sunrisers Hyderabad',
    'Gujarat Titans',
    'Lucknow Super Giants'
];

// File Upload Configuration
const FILE_UPLOAD_CONFIG = {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png'],
    allowedExtensions: ['.jpg', '.jpeg', '.png'],
    maxFiles: 10 // For bulk upload
};

// CSV Configuration
const CSV_CONFIG = {
    maxSize: 1 * 1024 * 1024, // 1MB
    allowedTypes: ['text/csv', 'application/csv'],
    allowedExtensions: ['.csv']
};

// Player Roles
const PLAYER_ROLES = {
    BATSMAN: 'Batsman',
    BOWLER: 'Bowler',
    ALL_ROUNDER: 'All-Rounder',
    WICKET_KEEPER: 'Wicket-Keeper'
};

// Validation Status
const VALIDATION_STATUS = {
    VALID: 'valid',
    INVALID: 'invalid',
    MISSING: 'missing',
    AUTO_REPLACED: 'auto_replaced'
};

// UI States
const UI_STATES = {
    LOADING: 'loading',
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
};

// Animation Durations
const ANIMATION_DURATIONS = {
    FAST: 200,
    NORMAL: 300,
    SLOW: 500,
    TOAST: 4000,
    ERROR_TOAST: 5000
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        API_BASE_URL,
        IPL_TEAMS,
        FILE_UPLOAD_CONFIG,
        CSV_CONFIG,
        PLAYER_ROLES,
        VALIDATION_STATUS,
        UI_STATES,
        ANIMATION_DURATIONS
    };
} else {
    window.CONSTANTS = {
        API_BASE_URL,
        IPL_TEAMS,
        FILE_UPLOAD_CONFIG,
        CSV_CONFIG,
        PLAYER_ROLES,
        VALIDATION_STATUS,
        UI_STATES,
        ANIMATION_DURATIONS
    };
} 