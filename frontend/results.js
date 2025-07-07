// Results page functionality for Dream11 Team Analyzer
const API_BASE_URL = 'http://localhost:3001/api';

// Global variables
let matchData = {};
let allAnalysisData = {};

// DOM elements
let loadingState, errorState, resultsContent;
let matchInfoEl, errorMessageEl;
let detailedStatsBtn, summarizeTeamBtn, aiSummarySection, summaryLoading, summaryContent;

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    initializeElements();
    parseURLParameters();
    loadAllAnalysis();
});

function initializeElements() {
    loadingState = document.getElementById('loading-state');
    errorState = document.getElementById('error-state');
    resultsContent = document.getElementById('results-content');
    matchInfoEl = document.getElementById('match-info');
    errorMessageEl = document.getElementById('error-message');
    
    // Action buttons
    detailedStatsBtn = document.getElementById('detailed-stats-btn');
    summarizeTeamBtn = document.getElementById('summarize-team-btn');
    
    // AI Summary elements
    aiSummarySection = document.getElementById('ai-summary');
    summaryLoading = document.getElementById('summary-loading');
    summaryContent = document.getElementById('summary-content');
    
    // Add event listeners
    detailedStatsBtn.addEventListener('click', showDetailedStats);
    summarizeTeamBtn.addEventListener('click', summarizeTeam);
}

function parseURLParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    matchData = {
        teamA: urlParams.get('teamA'),
        teamB: urlParams.get('teamB'),
        matchDate: urlParams.get('matchDate'),
        captain: urlParams.get('captain'),
        viceCaptain: urlParams.get('viceCaptain'),
        players: JSON.parse(urlParams.get('players') || '[]')
    };

    // Update match info display
    if (matchData.teamA && matchData.teamB && matchData.matchDate) {
        matchInfoEl.textContent = `${matchData.teamA} vs ${matchData.teamB} • ${formatDate(matchData.matchDate)}`;
        
        // Update team names in sections
        document.getElementById('team-a-name').textContent = matchData.teamA;
        document.getElementById('team-b-name').textContent = matchData.teamB;
        document.getElementById('captain-name').textContent = matchData.captain || 'Not selected';
        document.getElementById('vice-captain-name').textContent = matchData.viceCaptain || 'Not selected';
    } else {
        showError('Invalid match parameters');
        return;
    }
}

async function loadAllAnalysis() {
    try {
        showLoading(true);

        // Make all API calls in parallel
        const [teamFormData, headToHeadData, playerPerformanceData, venueStatsData] = await Promise.all([
            fetchTeamRecentForm(),
            fetchHeadToHead(),
            fetchPlayerPerformance(),
            fetchVenueStats()
        ]);

        // Store all data globally for later use
        allAnalysisData = {
            teamForm: teamFormData,
            headToHead: headToHeadData,
            playerPerformance: playerPerformanceData,
            venueStats: venueStatsData
        };

        // Display all results (compact version)
        displayTeamRecentFormCompact(teamFormData);
        displayHeadToHeadCompact(headToHeadData);
        displayPlayerPerformanceCompact(playerPerformanceData);
        displayVenueStatsCompact(venueStatsData);

        showLoading(false);
        resultsContent.classList.remove('hidden');

    } catch (error) {
        console.error('Error loading analysis:', error);
        showError('Failed to load match analysis. Please check your database connection.');
        showLoading(false);
    }
}

// API fetch functions
async function fetchTeamRecentForm() {
    const response = await fetch(`${API_BASE_URL}/team-recent-form`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            teamA: matchData.teamA,
            teamB: matchData.teamB,
            matchDate: matchData.matchDate
        })
    });

    if (!response.ok) throw new Error('Failed to fetch team recent form');
    return await response.json();
}

async function fetchHeadToHead() {
    const response = await fetch(`${API_BASE_URL}/head-to-head`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            teamA: matchData.teamA,
            teamB: matchData.teamB,
            matchDate: matchData.matchDate
        })
    });

    if (!response.ok) throw new Error('Failed to fetch head-to-head data');
    return await response.json();
}

async function fetchPlayerPerformance() {
    const response = await fetch(`${API_BASE_URL}/player-performance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            captain: matchData.captain,
            viceCaptain: matchData.viceCaptain,
            matchDate: matchData.matchDate
        })
    });

    if (!response.ok) throw new Error('Failed to fetch player performance');
    return await response.json();
}

async function fetchVenueStats() {
    const response = await fetch(`${API_BASE_URL}/venue-stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            teamA: matchData.teamA,
            teamB: matchData.teamB,
            matchDate: matchData.matchDate
        })
    });

    if (!response.ok) throw new Error('Failed to fetch venue stats');
    return await response.json();
}

// Compact display functions for mobile
function displayTeamRecentFormCompact(data) {
    const teamAFormEl = document.getElementById('team-a-form');
    const teamBFormEl = document.getElementById('team-b-form');

    if (data.success && data.data) {
        // Display Team A form (compact)
        const teamAMatches = data.data.teamA.matches;
        if (teamAMatches.length > 0) {
            const formString = teamAMatches.map(match => 
                match.result === 'Win' ? 'W' : match.result === 'Loss' ? 'L' : 'D'
            ).join('-');
            const wins = teamAMatches.filter(m => m.result === 'Win').length;
            teamAFormEl.innerHTML = `
                <div class="font-mono font-bold text-sm mb-1">${formString}</div>
                <div class="text-gray-600">${wins}/5 wins</div>
            `;
        } else {
            teamAFormEl.innerHTML = '<div class="text-gray-500">No data</div>';
        }

        // Display Team B form (compact)
        const teamBMatches = data.data.teamB.matches;
        if (teamBMatches.length > 0) {
            const formString = teamBMatches.map(match => 
                match.result === 'Win' ? 'W' : match.result === 'Loss' ? 'L' : 'D'
            ).join('-');
            const wins = teamBMatches.filter(m => m.result === 'Win').length;
            teamBFormEl.innerHTML = `
                <div class="font-mono font-bold text-sm mb-1">${formString}</div>
                <div class="text-gray-600">${wins}/5 wins</div>
            `;
        } else {
            teamBFormEl.innerHTML = '<div class="text-gray-500">No data</div>';
        }
    } else {
        teamAFormEl.innerHTML = '<div class="text-gray-500">No data</div>';
        teamBFormEl.innerHTML = '<div class="text-gray-500">No data</div>';
    }
}

function displayHeadToHeadCompact(data) {
    const headToHeadEl = document.getElementById('head-to-head-content');

    if (data.success && data.data) {
        const h2h = data.data;
        headToHeadEl.innerHTML = `
            <div class="flex justify-between items-center">
                <div class="text-center">
                    <div class="text-lg font-bold text-blue-600">${h2h.teamAWins}</div>
                    <div class="text-gray-600">${h2h.teamA}</div>
                </div>
                <div class="text-center">
                    <div class="text-lg font-bold text-gray-600">${h2h.totalMatches}</div>
                    <div class="text-gray-600">Matches</div>
                </div>
                <div class="text-center">
                    <div class="text-lg font-bold text-red-600">${h2h.teamBWins}</div>
                    <div class="text-gray-600">${h2h.teamB}</div>
                </div>
            </div>
        `;
    } else {
        headToHeadEl.innerHTML = '<div class="text-gray-500">No data available</div>';
    }
}

function displayPlayerPerformanceCompact(data) {
    const captainEl = document.getElementById('captain-performance');
    const viceCaptainEl = document.getElementById('vice-captain-performance');

    if (data.success && data.data) {
        // Display Captain performance (just scores and wickets)
        const captainMatches = data.data.captain.recentMatches;
        if (captainMatches.length > 0) {
            const scoresHtml = captainMatches.slice(0, 5).map(match => 
                `<span class="inline-block bg-yellow-100 px-2 py-1 rounded text-xs font-medium mr-1 mb-1">
                    ${match.runs_scored}runs, ${match.wickets_taken}wickets
                </span>`
            ).join('');
            
            captainEl.innerHTML = `
                <div class="bg-yellow-50 p-2 rounded">
                    <div class="flex flex-wrap">
                        ${scoresHtml}
                    </div>
                </div>
            `;
        } else {
            captainEl.innerHTML = '<div class="text-gray-500">No recent data</div>';
        }

        // Display Vice-Captain performance (just scores and wickets)
        const viceCaptainMatches = data.data.viceCaptain.recentMatches;
        if (viceCaptainMatches.length > 0) {
            const scoresHtml = viceCaptainMatches.slice(0, 5).map(match => 
                `<span class="inline-block bg-blue-100 px-2 py-1 rounded text-xs font-medium mr-1 mb-1">
                    ${match.runs_scored}runs, ${match.wickets_taken}wickets
                </span>`
            ).join('');
            
            viceCaptainEl.innerHTML = `
                <div class="bg-blue-50 p-2 rounded">
                    <div class="flex flex-wrap">
                        ${scoresHtml}
                    </div>
                </div>
            `;
        } else {
            viceCaptainEl.innerHTML = '<div class="text-gray-500">No recent data</div>';
        }
    } else {
        captainEl.innerHTML = '<div class="text-gray-500">No data</div>';
        viceCaptainEl.innerHTML = '<div class="text-gray-500">No data</div>';
    }
}

function displayVenueStatsCompact(data) {
    const venueStatsEl = document.getElementById('venue-stats-content');

    if (data.success && data.data && data.data.venueStats) {
        const venue = data.data.venueStats;
        venueStatsEl.innerHTML = `
            <div class="space-y-2">
                <div class="flex justify-between">
                    <span class="font-medium">${venue.venue_name}</span>
                    <span class="text-gray-600">${venue.total_matches} matches</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span>1st Innings:</span>
                    <span class="font-medium">${venue.avg_first_innings_score || 'N/A'}</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span>2nd Innings:</span>
                    <span class="font-medium">${venue.avg_second_innings_score || 'N/A'}</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span>Total Wickets:</span>
                    <span class="font-medium">${venue.total_wickets || 'N/A'}</span>
                </div>
            </div>
        `;
    } else {
        venueStatsEl.innerHTML = '<div class="text-gray-500">No venue data available</div>';
    }
}

// Action button functions
function showDetailedStats() {
    // For now, this could expand the existing sections or show additional details
    // You could implement a modal or expand the current sections
    alert('Detailed stats feature coming soon! This will show expanded statistics.');
}

async function summarizeTeam() {
    try {
        // Show AI summary section and loading
        aiSummarySection.classList.remove('hidden');
        summaryLoading.classList.remove('hidden');
        summaryContent.classList.add('hidden');
        
        // Scroll to summary section
        aiSummarySection.scrollIntoView({ behavior: 'smooth' });

        // Prepare data for AI analysis
        const analysisPayload = {
            teamA: matchData.teamA,
            teamB: matchData.teamB,
            matchDate: matchData.matchDate,
            captain: matchData.captain,
            viceCaptain: matchData.viceCaptain,
            players: matchData.players,
            teamFormData: allAnalysisData.teamForm,
            headToHeadData: allAnalysisData.headToHead,
            playerPerformanceData: allAnalysisData.playerPerformance,
            venueStatsData: allAnalysisData.venueStats
        };

        // Call AI summary API
        const response = await fetch(`${API_BASE_URL}/team-summary`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(analysisPayload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
            displayAISummary(data.summary);
        } else {
            throw new Error(data.message || 'Failed to generate AI summary');
        }

    } catch (error) {
        console.error('Error generating AI summary:', error);
        summaryContent.innerHTML = `
            <div class="text-red-600 text-center p-4">
                <div class="mb-2">⚠️ Failed to generate AI summary</div>
                <div class="text-xs">${error.message}</div>
            </div>
        `;
        summaryContent.classList.remove('hidden');
    } finally {
        summaryLoading.classList.add('hidden');
    }
}

function displayAISummary(summary) {
    // Display the AI summary in a mobile-friendly format
    summaryContent.innerHTML = summary;
    summaryContent.classList.remove('hidden');
}

// Utility functions
function showLoading(show) {
    loadingState.classList.toggle('hidden', !show);
}

function showError(message) {
    errorMessageEl.textContent = message;
    errorState.classList.remove('hidden');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric'
    });
} 