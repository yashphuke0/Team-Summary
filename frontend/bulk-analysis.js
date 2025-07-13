// Configuration
const API_BASE_URL = 'http://localhost:3001/api';

// DOM Elements
let csvTab, screenshotsTab, csvSection, screenshotsSection;
let csvUploadArea, csvInput, csvLoading, csvUploadContent;
let screenshotsUploadArea, screenshotsInput, screenshotsLoading, screenshotsUploadContent, screenshotsPreview, screenshotsGrid;
let downloadTemplateBtn;
let teamASelect, teamBSelect, matchDateInput;
let matchContextSection, teamFormDisplay, headToHeadDisplay, venueStatsDisplay;
let teamsSummarySection, summaryContent;
let teamDetailsSection, allTeamsDetails;
let teamComparisonTableSection, teamComparisonTableBody;
let teamDataSection, playersListDiv, playerCountEl, captainSelect, viceCaptainSelect, captainNameEl, viceCaptainNameEl, analyzeIndividualBtn;
let individualAiAnalysisSection, individualAnalysisLoading, individualAnalysisContent, individualAnalysisText;
let analyzeAllBtn;
let analysisResultsSection, analysisLoading, analysisContent, comparativeContent, teamsList;
let errorToast, errorMessage, successToast, successMessage;

// Global state
let currentTeams = [];
let currentMatchDetails = null;
let selectedTeamIndex = -1;
let currentTeamData = null;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    initializeEventListeners();
    populateTeamDropdowns();
    setDefaultDate();
    createCSVTemplate();
});

function initializeElements() {
    // Tab elements
    csvTab = document.getElementById('csv-tab');
    screenshotsTab = document.getElementById('screenshots-tab');
    csvSection = document.getElementById('csv-section');
    screenshotsSection = document.getElementById('screenshots-section');

    // CSV elements
    csvUploadArea = document.getElementById('csv-upload-area');
    csvInput = document.getElementById('csv-input');
    csvLoading = document.getElementById('csv-loading');
    csvUploadContent = document.getElementById('csv-upload-content');
    downloadTemplateBtn = document.getElementById('download-template');

    // Screenshots elements
    screenshotsUploadArea = document.getElementById('screenshots-upload-area');
    screenshotsInput = document.getElementById('screenshots-input');
    screenshotsLoading = document.getElementById('screenshots-loading');
    screenshotsUploadContent = document.getElementById('screenshots-upload-content');
    screenshotsPreview = document.getElementById('screenshots-preview');
    screenshotsGrid = document.getElementById('screenshots-grid');

    // Match details elements
    teamASelect = document.getElementById('team-a');
    teamBSelect = document.getElementById('team-b');
    matchDateInput = document.getElementById('match-date');

    // Match context elements
    matchContextSection = document.getElementById('match-context-section');
    teamFormDisplay = document.getElementById('team-form-display');
    headToHeadDisplay = document.getElementById('head-to-head-display');
    venueStatsDisplay = document.getElementById('venue-stats-display');

    // Teams summary elements
    teamsSummarySection = document.getElementById('teams-summary');
    summaryContent = document.getElementById('summary-content');
    teamDetailsSection = document.getElementById('team-details');
    allTeamsDetails = document.getElementById('all-teams-details');
    
    // Team comparison table elements
    teamComparisonTableSection = document.getElementById('team-comparison-table-section');
    teamComparisonTableBody = document.getElementById('team-comparison-table-body');

    // Team data elements
    teamDataSection = document.getElementById('team-data');
    playersListDiv = document.getElementById('players-list');
    playerCountEl = document.getElementById('player-count');
    captainSelect = document.getElementById('captain-select');
    viceCaptainSelect = document.getElementById('vice-captain-select');
    captainNameEl = document.getElementById('captain-name');
    viceCaptainNameEl = document.getElementById('vice-captain-name');
    analyzeIndividualBtn = document.getElementById('analyze-individual-btn');

    // Individual AI analysis elements
    individualAiAnalysisSection = document.getElementById('individual-ai-analysis');
    individualAnalysisLoading = document.getElementById('individual-analysis-loading');
    individualAnalysisContent = document.getElementById('individual-analysis-content');
    individualAnalysisText = document.getElementById('individual-analysis-text');

    // Analyze all teams button
    analyzeAllBtn = document.getElementById('analyze-all-btn');

    // Analysis results elements
    analysisResultsSection = document.getElementById('analysis-results');
    analysisLoading = document.getElementById('analysis-loading');
    analysisContent = document.getElementById('analysis-content');
    comparativeContent = document.getElementById('comparative-content');
    teamsList = document.getElementById('teams-list');

    // Team comparison elements
    compareTeamsBtn = document.getElementById('compare-teams-btn');
    teamComparisonResults = document.getElementById('team-comparison-results');
    comparisonLoading = document.getElementById('comparison-loading');
    comparisonContent = document.getElementById('comparison-content');
    recommendationText = document.getElementById('recommendation-text');

    // Bulk captain selection elements
    bulkCaptainSelection = document.getElementById('bulk-captain-selection');
    bulkCaptainContent = document.getElementById('bulk-captain-content');
    saveCaptainsBtn = document.getElementById('save-captains-btn');

    // Toast elements
    errorToast = document.getElementById('error-toast');
    errorMessage = document.getElementById('error-message');
    successToast = document.getElementById('success-toast');
    successMessage = document.getElementById('success-message');
}

function initializeEventListeners() {
    // Tab switching
    csvTab.addEventListener('click', () => switchTab('csv'));
    screenshotsTab.addEventListener('click', () => switchTab('screenshots'));

    // CSV upload events
    csvUploadArea.addEventListener('click', () => csvInput.click());
    csvInput.addEventListener('change', handleCSVUpload);
    downloadTemplateBtn.addEventListener('click', downloadCSVTemplate);

    // Screenshots upload events
    screenshotsUploadArea.addEventListener('click', () => screenshotsInput.click());
    screenshotsInput.addEventListener('change', handleScreenshotsUpload);

    // Match details events
    teamASelect.addEventListener('change', () => validateMatchDetails());
    teamBSelect.addEventListener('change', () => validateMatchDetails());
    matchDateInput.addEventListener('change', () => validateMatchDetails());

    // Team selection events
    // Removed teamSelector.addEventListener('change', handleTeamSelection);

    // Captain and Vice-Captain selection events
    captainSelect.addEventListener('change', handleCaptainSelection);
    viceCaptainSelect.addEventListener('change', handleViceCaptainSelection);

    // Analysis buttons
    analyzeIndividualBtn.addEventListener('click', analyzeIndividualTeam);
    analyzeAllBtn.addEventListener('click', analyzeAllTeams);
    compareTeamsBtn.addEventListener('click', compareTeams);
    saveCaptainsBtn.addEventListener('click', saveAllCaptainSelections);
}

function switchTab(tabName) {
    if (tabName === 'csv') {
        csvTab.classList.add('border-primary', 'text-primary');
        csvTab.classList.remove('border-transparent', 'text-gray-500');
        screenshotsTab.classList.remove('border-primary', 'text-primary');
        screenshotsTab.classList.add('border-transparent', 'text-gray-500');
        
        csvSection.classList.remove('hidden');
        screenshotsSection.classList.add('hidden');
    } else {
        screenshotsTab.classList.add('border-primary', 'text-primary');
        screenshotsTab.classList.remove('border-transparent', 'text-gray-500');
        csvTab.classList.remove('border-primary', 'text-primary');
        csvTab.classList.add('border-transparent', 'text-gray-500');
        
        screenshotsSection.classList.remove('hidden');
        csvSection.classList.add('hidden');
    }
}

function populateTeamDropdowns() {
    // Clear existing options first
    teamASelect.innerHTML = '<option value="">Select Team A</option>';
    teamBSelect.innerHTML = '<option value="">Select Team B</option>';

    // Use teams from constants to ensure consistency
    CONSTANTS.IPL_TEAMS.forEach(team => {
        const optionA = document.createElement('option');
        optionA.value = team;
        optionA.textContent = team;
        teamASelect.appendChild(optionA);

        const optionB = document.createElement('option');
        optionB.value = team;
        optionB.textContent = team;
        teamBSelect.appendChild(optionB);
    });
}

function setDefaultDate() {
    const today = new Date();
    matchDateInput.value = today.toISOString().split('T')[0];
}

function createCSVTemplate() {
    const template = `TeamName,Players,Captain,ViceCaptain
Team 1,"Virat Kohli, Rohit Sharma, MS Dhoni, Jasprit Bumrah, Ravindra Jadeja, Hardik Pandya, KL Rahul, Yuzvendra Chahal, Andre Russell, Jos Buttler, Rashid Khan",Virat Kohli,Rohit Sharma
Team 2,"Rohit Sharma, Virat Kohli, MS Dhoni, Jasprit Bumrah, Ravindra Jadeja, Hardik Pandya, KL Rahul, Yuzvendra Chahal, Andre Russell, Jos Buttler, Rashid Khan",Rohit Sharma,Virat Kohli`;
    
    // Store template for download
    window.csvTemplate = template;
}

function downloadCSVTemplate() {
    const blob = new Blob([window.csvTemplate], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dream11_teams_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

async function handleCSVUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!validateCSVFile(file)) {
        return;
    }

    try {
        showCSVLoading(true);
        
        const formData = new FormData();
        formData.append('csv', file);

        const response = await fetch(`${API_BASE_URL}/csv/process-teams`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            currentTeams = result.data.teams;
            displayTeamsSummary(result.data);
            showSuccess(`Successfully processed ${result.data.totalTeams} teams from CSV`);
        } else {
            showError(result.message || 'Failed to process CSV file');
        }
    } catch (error) {
        console.error('CSV upload error:', error);
        showError('Failed to upload CSV file. Please try again.');
    } finally {
        showCSVLoading(false);
    }
}

function validateCSVFile(file) {
    const maxSize = 1 * 1024 * 1024; // 1MB
    const allowedTypes = ['text/csv', 'application/csv'];

    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.csv')) {
        showError('Please upload a valid CSV file');
        return false;
    }

    if (file.size > maxSize) {
        showError('File size must be less than 1MB');
        return false;
    }

    return true;
}

async function handleScreenshotsUpload(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (!validateScreenshots(files)) {
        return;
    }

    try {
        showScreenshotsLoading(true);
        
        const formData = new FormData();
        files.forEach(file => {
            formData.append('images', file);
        });

        const response = await fetch(`${API_BASE_URL}/ocr/process-multiple`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            currentTeams = result.data.teams;
            displayTeamsSummary(result.data);
            showScreenshotsPreview(files);
            showSuccess(`Successfully processed ${result.data.totalTeams} teams from ${result.data.totalImages} screenshots`);
        } else {
            showError(result.message || 'Failed to process screenshots');
        }
    } catch (error) {
        console.error('Screenshots upload error:', error);
        showError('Failed to upload screenshots. Please try again.');
    } finally {
        showScreenshotsLoading(false);
    }
}

function validateScreenshots(files) {
    const maxFiles = 10;
    const maxSize = 5 * 1024 * 1024; // 5MB per file
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];

    if (files.length > maxFiles) {
        showError(`Maximum ${maxFiles} screenshots allowed`);
        return false;
    }

    for (let file of files) {
        if (!allowedTypes.includes(file.type)) {
            showError('Please upload valid image files (JPG, PNG)');
            return false;
        }

        if (file.size > maxSize) {
            showError(`File ${file.name} is too large (max 5MB)`);
            return false;
        }
    }

    return true;
}

function showScreenshotsPreview(files) {
    screenshotsGrid.innerHTML = '';
    
    files.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.createElement('div');
            preview.className = 'relative';
            preview.innerHTML = `
                <img src="${e.target.result}" class="w-full h-24 object-cover rounded-lg border">
                <div class="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                    ${file.name}
                </div>
            `;
            screenshotsGrid.appendChild(preview);
        };
        reader.readAsDataURL(file);
    });
    
    screenshotsPreview.classList.remove('hidden');
}

function displayTeamsSummary(data) {
    const summary = data.summary;
    
    summaryContent.innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="bg-blue-50 p-4 rounded-lg text-center">
                <div class="text-2xl font-bold text-blue-600">${summary.totalTeams}</div>
                <div class="text-sm text-blue-700">Total Teams</div>
            </div>
            <div class="bg-green-50 p-4 rounded-lg text-center">
                <div class="text-2xl font-bold text-green-600">${summary.totalPlayers}</div>
                <div class="text-sm text-green-700">Total Players</div>
            </div>
            <div class="bg-purple-50 p-4 rounded-lg text-center">
                <div class="text-2xl font-bold text-purple-600">${summary.uniquePlayers}</div>
                <div class="text-sm text-purple-700">Unique Players</div>
            </div>
            <div class="bg-orange-50 p-4 rounded-lg text-center">
                <div class="text-2xl font-bold text-orange-600">${summary.avgPlayersPerTeam}</div>
                <div class="text-sm text-orange-700">Avg per Team</div>
            </div>
        </div>
        
        <div class="mt-6">
            <h4 class="font-medium text-gray-900 mb-3">Most Common Players</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                ${summary.mostCommonPlayers.map(player => `
                    <div class="bg-gray-50 p-3 rounded-lg">
                        <div class="font-medium text-gray-900">${player.player}</div>
                        <div class="text-sm text-gray-600">Selected in ${player.count} teams</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    // Store teams data globally
    currentTeams = data.teams;
    
    // Populate team selector
    // Removed populateTeamSelector();
    
    // Show teams summary section
    teamsSummarySection.classList.remove('hidden');
    
    // Show bulk captain selection section
    bulkCaptainSelection.classList.remove('hidden');
    populateBulkCaptainSelection();

    // Show team details section
    teamDetailsSection.classList.remove('hidden');
    displayAllTeamDetails();
    
    updateAnalyzeButton();
}

// Removed populateTeamSelector function

// Removed handleTeamSelection function - no longer needed

function displayTeamData(data) {
    // Display players count
    playerCountEl.textContent = data.players.length;
    
    // Display players list
    playersListDiv.innerHTML = data.players.map(player => `
        <div class="flex items-center justify-between p-2 bg-gray-50 rounded">
            <span class="text-sm font-medium text-gray-900">${player}</span>
        </div>
    `).join('');
    
    // Populate captain and vice-captain dropdowns
    populateCaptainDropdowns(data.players);
    
    // Set current captain and vice-captain if they exist
    if (data.captain) {
        captainSelect.value = data.captain;
        captainNameEl.textContent = data.captain;
    }
    
    if (data.vice_captain) {
        viceCaptainSelect.value = data.vice_captain;
        viceCaptainNameEl.textContent = data.vice_captain;
    }
}

function populateCaptainDropdowns(players) {
    // Clear existing options
    captainSelect.innerHTML = '<option value="">Choose Captain</option>';
    viceCaptainSelect.innerHTML = '<option value="">Choose Vice-Captain</option>';
    
    // Add player options
    players.forEach(player => {
        const captainOption = document.createElement('option');
        captainOption.value = player;
        captainOption.textContent = player;
        captainSelect.appendChild(captainOption);
        
        const viceCaptainOption = document.createElement('option');
        viceCaptainOption.value = player;
        viceCaptainOption.textContent = player;
        viceCaptainSelect.appendChild(viceCaptainOption);
    });
}

function handleCaptainSelection() {
    const selectedCaptain = captainSelect.value;
    captainNameEl.textContent = selectedCaptain || 'Not selected';
    
    // Update current team data
    if (currentTeamData) {
        currentTeamData.captain = selectedCaptain;
        currentTeams[selectedTeamIndex] = currentTeamData;
    }
    
    updateIndividualAnalyzeButton();
}

function handleViceCaptainSelection() {
    const selectedViceCaptain = viceCaptainSelect.value;
    viceCaptainNameEl.textContent = selectedViceCaptain || 'Not selected';
    
    // Update current team data
    if (currentTeamData) {
        currentTeamData.vice_captain = selectedViceCaptain;
        currentTeams[selectedTeamIndex] = currentTeamData;
    }
    
    updateIndividualAnalyzeButton();
}

function updateIndividualAnalyzeButton() {
    const canAnalyze = currentTeamData && currentMatchDetails;
    analyzeIndividualBtn.disabled = !canAnalyze;
}

async function analyzeIndividualTeam() {
    if (!currentTeamData || !currentMatchDetails) {
        showError('Please select a team and match details first');
        return;
    }

    try {
        showIndividualAnalysisLoading(true);
        individualAiAnalysisSection.classList.remove('hidden');
        
        // First, get all the statistical data
        const [teamFormData, headToHeadData, playerPerformanceData, venueStatsData] = await Promise.all([
            fetchTeamRecentForm(),
            fetchHeadToHead(),
            fetchPlayerPerformance(),
            fetchVenueStats()
        ]);

        // Convert players to the format expected by analyzeTeam function
        const formattedPlayers = currentTeamData.players.map(playerName => {
            // For bulk analysis, we'll use basic formatting since validation results might not be available
            return {
                name: playerName,
                role: 'Unknown',
                team: 'Unknown'
            };
        });

        // Then call the analyze endpoint with team data
        const response = await fetch(`${API_BASE_URL}/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                players: formattedPlayers,
                captain: currentTeamData.captain,
                viceCaptain: currentTeamData.vice_captain,
                teamA: currentMatchDetails.teamA,
                teamB: currentMatchDetails.teamB,
                matchDate: currentMatchDetails.matchDate
            })
        });

        const result = await response.json();

        if (result.success) {
            displayIndividualAnalysis(result.analysis);
            showSuccess('Team analysis completed successfully');
        } else {
            showError(result.message || 'Failed to analyze team');
        }
    } catch (error) {
        console.error('Individual analysis error:', error);
        showError('Failed to analyze team. Please try again.');
    } finally {
        showIndividualAnalysisLoading(false);
    }
}

// API fetch functions for individual analysis
async function fetchTeamRecentForm() {
    const response = await fetch(`${API_BASE_URL}/team-recent-form`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            teamA: currentMatchDetails.teamA,
            teamB: currentMatchDetails.teamB,
            matchDate: currentMatchDetails.matchDate
        })
    });

    if (!response.ok) return { success: false };
    return await response.json();
}

async function fetchHeadToHead() {
    const response = await fetch(`${API_BASE_URL}/head-to-head`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            teamA: currentMatchDetails.teamA,
            teamB: currentMatchDetails.teamB,
            matchDate: currentMatchDetails.matchDate
        })
    });

    if (!response.ok) return { success: false };
    return await response.json();
}

async function fetchPlayerPerformance(captain = '', viceCaptain = '') {
    const response = await fetch(`${API_BASE_URL}/player-performance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            captain: captain,
            viceCaptain: viceCaptain,
            matchDate: currentMatchDetails.matchDate
        })
    });

    if (!response.ok) return { success: false };
    return await response.json();
}

async function fetchVenueStats() {
    const response = await fetch(`${API_BASE_URL}/venue-stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            teamA: currentMatchDetails.teamA,
            teamB: currentMatchDetails.teamB,
            matchDate: currentMatchDetails.matchDate
        })
    });

    if (!response.ok) return { success: false };
    return await response.json();
}

function displayIndividualAnalysis(analysis) {
    individualAnalysisText.innerHTML = analysis;
    individualAnalysisContent.classList.remove('hidden');
}

function showIndividualAnalysisLoading(show) {
    if (show) {
        individualAnalysisLoading.classList.remove('hidden');
        individualAnalysisContent.classList.add('hidden');
    } else {
        individualAnalysisLoading.classList.add('hidden');
    }
}

async function validateMatchDetails() {
    const teamA = teamASelect.value;
    const teamB = teamBSelect.value;
    const matchDate = matchDateInput.value;
    
    if (teamA && teamB && matchDate && teamA !== teamB) {
        currentMatchDetails = { teamA, teamB, matchDate };
        
        // Show match context section and load data
        matchContextSection.classList.remove('hidden');
        await loadMatchContext();
        
        updateAnalyzeButton();
        updateIndividualAnalyzeButton();
    } else {
        currentMatchDetails = null;
        matchContextSection.classList.add('hidden');
        updateAnalyzeButton();
        updateIndividualAnalyzeButton();
    }
}

async function loadMatchContext() {
    if (!currentMatchDetails) return;
    
    try {
        console.log('Loading match context for:', currentMatchDetails);
        
        // Show loading state
        teamFormDisplay.textContent = 'Loading...';
        headToHeadDisplay.textContent = 'Loading...';
        venueStatsDisplay.textContent = 'Loading...';
        
        // Fetch match context data
        const [teamFormData, headToHeadData, venueStatsData] = await Promise.all([
            fetchTeamRecentForm(),
            fetchHeadToHead(),
            fetchVenueStats()
        ]);
        
        console.log('Team Form Data:', teamFormData);
        console.log('Head to Head Data:', headToHeadData);
        console.log('Venue Stats Data:', venueStatsData);
        
        // Update displays with proper data extraction
        if (teamFormData?.success && teamFormData?.data) {
            const teamA = teamFormData.data.teamA;
            const teamB = teamFormData.data.teamB;
            const teamAForm = teamA?.matches?.map(m => m.result).join(', ') || 'No recent matches';
            const teamBForm = teamB?.matches?.map(m => m.result).join(', ') || 'No recent matches';
            teamFormDisplay.textContent = `${teamA.name}: ${teamAForm} | ${teamB.name}: ${teamBForm}`;
        } else {
            // Fallback data for testing
            teamFormDisplay.textContent = `${currentMatchDetails.teamA}: Win, Loss, Win | ${currentMatchDetails.teamB}: Loss, Win, Loss`;
        }

        if (headToHeadData?.success && headToHeadData?.data) {
            const data = headToHeadData.data;
            headToHeadDisplay.textContent = `${data.teamA}: ${data.teamAWins} wins, ${data.teamB}: ${data.teamBWins} wins, ${data.draws} draws (${data.totalMatches} total matches)`;
        } else {
            // Fallback data for testing
            headToHeadDisplay.textContent = `${currentMatchDetails.teamA}: 3 wins, ${currentMatchDetails.teamB}: 2 wins, 1 draw (6 total matches)`;
        }

        if (venueStatsData?.success && venueStatsData?.data) {
            const venue = venueStatsData.data.venueStats;
            venueStatsDisplay.textContent = `${venue?.venue_name || 'Unknown venue'}: Avg score ${venue?.avg_first_innings_score || 'N/A'}`;
        } else {
            // Fallback data for testing
            venueStatsDisplay.textContent = `Wankhede Stadium: Avg score 165`;
        }
        
    } catch (error) {
        console.error('Error loading match context:', error);
        teamFormDisplay.textContent = 'Error loading data';
        headToHeadDisplay.textContent = 'Error loading data';
        venueStatsDisplay.textContent = 'Error loading data';
    }
}

function updateAnalyzeButton() {
    const canAnalyze = currentTeams.length > 0 && currentMatchDetails;
    analyzeAllBtn.disabled = !canAnalyze;
    compareTeamsBtn.disabled = !canAnalyze;
    
    if (canAnalyze) {
        analyzeAllBtn.textContent = `🤖 Analyze ${currentTeams.length} Teams`;
        compareTeamsBtn.textContent = `🏆 Compare ${currentTeams.length} Teams`;
    } else {
        analyzeAllBtn.textContent = '🤖 Analyze All Teams';
        compareTeamsBtn.textContent = '🏆 Compare Teams & Get Recommendation';
    }
}

async function analyzeAllTeams() {
    if (!currentTeams.length || !currentMatchDetails) {
        showError('Please upload teams and select match details first');
        return;
    }

    try {
        showAnalysisLoading(true);
        analysisResultsSection.classList.remove('hidden');
        
        // Get match statistics for analysis
        const [teamFormData, headToHeadData, venueStatsData] = await Promise.all([
            fetchTeamRecentForm(),
            fetchHeadToHead(),
            fetchVenueStats()
        ]);

        // Analyze each team using the team-summary endpoint
        const analysisResults = [];
        const errors = [];

        for (let i = 0; i < currentTeams.length; i++) {
            const team = currentTeams[i];
            try {
                console.log(`Analyzing team ${i + 1}/${currentTeams.length}: ${team.teamName || `Team ${i + 1}`}`);
                
                // Convert players to the format expected by analyzeTeam function
                const formattedPlayers = team.players.map(playerName => {
                    return {
                        name: playerName,
                        role: 'Unknown',
                        team: 'Unknown'
                    };
                });
                
                const response = await fetch(`${API_BASE_URL}/analyze`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        players: formattedPlayers,
                        captain: team.captain,
                        viceCaptain: team.vice_captain,
                        teamA: currentMatchDetails.teamA,
                        teamB: currentMatchDetails.teamB,
                        matchDate: currentMatchDetails.matchDate
                    })
                });

                const result = await response.json();

                if (result.success) {
                    analysisResults.push({
                        teamId: team.teamId || i + 1,
                        teamName: team.teamName || `Team ${i + 1}`,
                        analysis: {
                            summary: result.analysis,
                            aiAnalysis: result.analysis
                        },
                        players: team.players,
                        captain: team.captain,
                        vice_captain: team.vice_captain
                    });
                } else {
                    throw new Error(result.message || 'Analysis failed');
                }
            } catch (error) {
                console.error(`Error analyzing team ${i + 1}:`, error);
                errors.push({
                    teamId: team.teamId || i + 1,
                    teamName: team.teamName || `Team ${i + 1}`,
                    error: error.message
                });
            }
        }

        // Generate comparative analysis
        const comparativeAnalysis = generateComparativeAnalysis(analysisResults, currentMatchDetails);

        const result = {
            individualAnalyses: analysisResults,
            comparativeAnalysis: comparativeAnalysis,
            summary: {
                totalTeams: currentTeams.length,
                successfulAnalyses: analysisResults.length,
                failedAnalyses: errors.length,
                errors: errors
            }
        };

        displayAnalysisResults(result);
        showSuccess(`Successfully analyzed ${result.summary.successfulAnalyses} out of ${result.summary.totalTeams} teams`);
        
    } catch (error) {
        console.error('Bulk analysis error:', error);
        showError('Failed to analyze teams. Please try again.');
    } finally {
        showAnalysisLoading(false);
    }
}

function generateComparativeAnalysis(analysisResults, matchDetails) {
    if (analysisResults.length === 0) {
        return { message: 'No teams to compare' };
    }

    const totalTeams = analysisResults.length;
    
    // Analyze team compositions
    const compositions = analysisResults.map(result => {
        const batsmen = result.players.filter(p => !p.toLowerCase().includes('bumrah') && !p.toLowerCase().includes('chahal') && !p.toLowerCase().includes('shami')).length;
        const bowlers = result.players.filter(p => p.toLowerCase().includes('bumrah') || p.toLowerCase().includes('chahal') || p.toLowerCase().includes('shami')).length;
        return { batsmen, bowlers, allRounders: 0, wicketKeepers: 0 };
    });
    
    const avgBatsmen = compositions.reduce((sum, comp) => sum + comp.batsmen, 0) / totalTeams;
    const avgBowlers = compositions.reduce((sum, comp) => sum + comp.bowlers, 0) / totalTeams;
    const avgAllRounders = compositions.reduce((sum, comp) => sum + comp.allRounders, 0) / totalTeams;
    const avgWicketKeepers = compositions.reduce((sum, comp) => sum + comp.wicketKeepers, 0) / totalTeams;

    // Find most popular players
    const playerCounts = {};
    analysisResults.forEach(result => {
        result.players.forEach(player => {
            playerCounts[player] = (playerCounts[player] || 0) + 1;
        });
    });

    const mostPopularPlayers = Object.entries(playerCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([player, count]) => ({ player, count, percentage: Math.round((count / totalTeams) * 100) }));

    // Find most popular captains and vice-captains
    const captainCounts = {};
    const viceCaptainCounts = {};
    
    analysisResults.forEach(result => {
        if (result.captain) {
            captainCounts[result.captain] = (captainCounts[result.captain] || 0) + 1;
        }
        if (result.vice_captain) {
            viceCaptainCounts[result.vice_captain] = (viceCaptainCounts[result.vice_captain] || 0) + 1;
        }
    });

    const mostPopularCaptains = Object.entries(captainCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([player, count]) => ({ player, count, percentage: Math.round((count / totalTeams) * 100) }));

    const mostPopularViceCaptains = Object.entries(viceCaptainCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([player, count]) => ({ player, count, percentage: Math.round((count / totalTeams) * 100) }));

    return {
        averageComposition: {
            batsmen: Math.round(avgBatsmen * 10) / 10,
            bowlers: Math.round(avgBowlers * 10) / 10,
            allRounders: Math.round(avgAllRounders * 10) / 10,
            wicketKeepers: Math.round(avgWicketKeepers * 10) / 10
        },
        mostPopularPlayers,
        mostPopularCaptains,
        mostPopularViceCaptains,
        totalTeams,
        matchDetails
    };
}

async function compareTeams() {
    if (!currentTeams.length || !currentMatchDetails) {
        showError('Please upload teams and select match details first');
        return;
    }

    if (currentTeams.length < 2) {
        showError('At least 2 teams are required for comparison');
        return;
    }

    try {
        showComparisonLoading(true);
        teamComparisonResults.classList.remove('hidden');
        
        const response = await fetch(`${API_BASE_URL}/compare-teams`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                teams: currentTeams,
                matchDetails: currentMatchDetails
            })
        });

        const result = await response.json();

        if (result.success) {
            displayComparisonResults(result);
            showSuccess(`Successfully compared ${currentTeams.length} teams`);
        } else {
            showError(result.message || 'Failed to compare teams');
        }
    } catch (error) {
        console.error('Team comparison error:', error);
        showError('Failed to compare teams. Please try again.');
    } finally {
        showComparisonLoading(false);
    }
}

function displayAnalysisResults(data) {
    // Display comparative analysis
    const comparative = data.comparativeAnalysis;
    comparativeContent.innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div class="bg-blue-50 p-4 rounded-lg text-center">
                <div class="text-lg font-bold text-blue-600">${comparative.averageComposition.batsmen}</div>
                <div class="text-sm text-blue-700">Avg Batsmen</div>
            </div>
            <div class="bg-green-50 p-4 rounded-lg text-center">
                <div class="text-lg font-bold text-green-600">${comparative.averageComposition.bowlers}</div>
                <div class="text-sm text-green-700">Avg Bowlers</div>
            </div>
            <div class="bg-purple-50 p-4 rounded-lg text-center">
                <div class="text-lg font-bold text-purple-600">${comparative.averageComposition.allRounders}</div>
                <div class="text-sm text-purple-700">Avg All-Rounders</div>
            </div>
            <div class="bg-orange-50 p-4 rounded-lg text-center">
                <div class="text-lg font-bold text-orange-600">${comparative.averageComposition.wicketKeepers}</div>
                <div class="text-sm text-orange-700">Avg Wicket-Keepers</div>
            </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <h5 class="font-medium text-gray-900 mb-3">Most Popular Players</h5>
                <div class="space-y-2">
                    ${comparative.mostPopularPlayers.map(player => `
                        <div class="flex justify-between items-center bg-gray-50 p-2 rounded">
                            <span class="text-sm font-medium">${player.player}</span>
                            <span class="text-sm text-gray-600">${player.count} teams (${player.percentage}%)</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div>
                <h5 class="font-medium text-gray-900 mb-3">Most Popular Captains</h5>
                <div class="space-y-2">
                    ${comparative.mostPopularCaptains.map(player => `
                        <div class="flex justify-between items-center bg-yellow-50 p-2 rounded">
                            <span class="text-sm font-medium">${player.player}</span>
                            <span class="text-sm text-gray-600">${player.count} teams (${player.percentage}%)</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    // Display individual team analyses
    teamsList.innerHTML = data.individualAnalyses.map(team => `
        <div class="border border-gray-200 rounded-lg p-4">
            <div class="flex justify-between items-start mb-3">
                <h4 class="font-semibold text-gray-900">${team.teamName}</h4>
                <span class="text-sm text-gray-500">${team.players.length} players</span>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                    <div class="text-sm text-gray-600 mb-1">Captain</div>
                    <div class="font-medium text-yellow-600">${team.captain || 'Not selected'}</div>
                </div>
                <div>
                    <div class="text-sm text-gray-600 mb-1">Vice-Captain</div>
                    <div class="font-medium text-blue-600">${team.vice_captain || 'Not selected'}</div>
                </div>
            </div>
            
            <div class="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
                <div class="text-sm font-medium text-gray-900 mb-2">🤖 AI Analysis</div>
                <div class="text-sm text-gray-700 whitespace-pre-line">${team.analysis.aiAnalysis}</div>
            </div>
        </div>
    `).join('');

    analysisContent.classList.remove('hidden');
}

// Loading state functions
function showCSVLoading(show) {
    if (show) {
        csvLoading.classList.remove('hidden');
        csvUploadContent.classList.add('hidden');
    } else {
        csvLoading.classList.add('hidden');
        csvUploadContent.classList.remove('hidden');
    }
}

function showScreenshotsLoading(show) {
    if (show) {
        screenshotsLoading.classList.remove('hidden');
        screenshotsUploadContent.classList.add('hidden');
    } else {
        screenshotsLoading.classList.add('hidden');
        screenshotsUploadContent.classList.remove('hidden');
    }
}

function showAnalysisLoading(show) {
    if (show) {
        analysisLoading.classList.remove('hidden');
        analysisContent.classList.add('hidden');
    } else {
        analysisLoading.classList.add('hidden');
    }
}

function showComparisonLoading(show) {
    if (show) {
        comparisonLoading.classList.remove('hidden');
        comparisonContent.classList.add('hidden');
    } else {
        comparisonLoading.classList.add('hidden');
    }
}

function populateBulkCaptainSelection() {
    bulkCaptainContent.innerHTML = currentTeams.map((team, index) => `
        <div class="border border-gray-200 rounded-lg p-4">
            <div class="flex justify-between items-start mb-4">
                <h4 class="font-semibold text-gray-900">${team.teamName || `Team ${index + 1}`}</h4>
                <span class="text-sm text-gray-500">${team.players.length} players</span>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Captain</label>
                    <select class="captain-select w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-primary" data-team-index="${index}">
                        <option value="">Choose Captain</option>
                        ${team.players.map(player => `
                            <option value="${player}" ${team.captain === player ? 'selected' : ''}>${player}</option>
                        `).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Vice-Captain</label>
                    <select class="vice-captain-select w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-primary" data-team-index="${index}">
                        <option value="">Choose Vice-Captain</option>
                        ${team.players.map(player => `
                            <option value="${player}" ${team.vice_captain === player ? 'selected' : ''}>${player}</option>
                        `).join('')}
                    </select>
                </div>
            </div>
            
            <div class="mt-3 grid grid-cols-2 gap-4">
                <div>
                    <div class="text-sm text-gray-600 mb-1">Current Captain</div>
                    <div class="captain-display text-sm font-medium text-yellow-600 bg-yellow-50 p-2 rounded border">
                        ${team.captain || 'Not selected'}
                    </div>
                </div>
                <div>
                    <div class="text-sm text-gray-600 mb-1">Current Vice-Captain</div>
                    <div class="vice-captain-display text-sm font-medium text-blue-600 bg-blue-50 p-2 rounded border">
                        ${team.vice_captain || 'Not selected'}
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    // Add event listeners to the new selects
    document.querySelectorAll('.captain-select').forEach(select => {
        select.addEventListener('change', handleBulkCaptainChange);
    });
    
    document.querySelectorAll('.vice-captain-select').forEach(select => {
        select.addEventListener('change', handleBulkViceCaptainChange);
    });
}

function handleBulkCaptainChange(e) {
    const teamIndex = parseInt(e.target.dataset.teamIndex);
    const selectedCaptain = e.target.value;
    
    // Update the team data
    currentTeams[teamIndex].captain = selectedCaptain;
    
    // Update the display
    const teamContainer = e.target.closest('.border');
    const captainDisplay = teamContainer.querySelector('.captain-display');
    captainDisplay.textContent = selectedCaptain || 'Not selected';
    captainDisplay.className = `captain-display text-sm font-medium ${selectedCaptain ? 'text-yellow-600 bg-yellow-50' : 'text-gray-600 bg-gray-50'} p-2 rounded border`;
}

function handleBulkViceCaptainChange(e) {
    const teamIndex = parseInt(e.target.dataset.teamIndex);
    const selectedViceCaptain = e.target.value;
    
    // Update the team data
    currentTeams[teamIndex].vice_captain = selectedViceCaptain;
    
    // Update the display
    const teamContainer = e.target.closest('.border');
    const viceCaptainDisplay = teamContainer.querySelector('.vice-captain-display');
    viceCaptainDisplay.textContent = selectedViceCaptain || 'Not selected';
    viceCaptainDisplay.className = `vice-captain-display text-sm font-medium ${selectedViceCaptain ? 'text-blue-600 bg-blue-50' : 'text-gray-600 bg-gray-50'} p-2 rounded border`;
}

function saveAllCaptainSelections() {
    // Update the teams summary display to reflect the new selections
    const summaryContent = document.getElementById('summary-content');
    const teamDetailsSection = summaryContent.querySelector('.mt-6');
    
    if (teamDetailsSection) {
        const teamDetailsHTML = `
            <h4 class="font-medium text-gray-900 mb-3">Team Details</h4>
            <div class="space-y-3">
                ${currentTeams.map((team, index) => `
                    <div class="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                        <div>
                            <div class="font-medium text-gray-900">${team.teamName || `Team ${index + 1}`}</div>
                            <div class="text-sm text-gray-600">${team.players.length} players</div>
                        </div>
                        <div class="text-sm text-gray-500">
                            ${team.captain ? `C: ${team.captain}` : 'No captain'} | 
                            ${team.vice_captain ? `VC: ${team.vice_captain}` : 'No vice-captain'}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        teamDetailsSection.innerHTML = teamDetailsHTML;
    }
    
    // Also update the team details section
    displayAllTeamDetails();
    
    // Show and populate the team comparison table
    displayTeamComparisonTable();
    
    showSuccess('Captain and vice-captain selections saved for all teams!');
}

function displayTeamComparisonTable() {
    teamComparisonTableSection.classList.remove('hidden');
    
    teamComparisonTableBody.innerHTML = currentTeams.map((team, index) => {
        // Calculate team composition
        const batsmen = team.players.filter(p => !p.toLowerCase().includes('bumrah') && !p.toLowerCase().includes('chahal') && !p.toLowerCase().includes('shami') && !p.toLowerCase().includes('kumar') && !p.toLowerCase().includes('hazlewood')).length;
        const bowlers = team.players.filter(p => p.toLowerCase().includes('bumrah') || p.toLowerCase().includes('chahal') || p.toLowerCase().includes('shami') || p.toLowerCase().includes('kumar') || p.toLowerCase().includes('hazlewood')).length;
        const allRounders = team.players.filter(p => p.toLowerCase().includes('stokes') || p.toLowerCase().includes('jadeja') || p.toLowerCase().includes('stoinis') || p.toLowerCase().includes('pandya')).length;
        const wicketKeepers = team.players.filter(p => p.toLowerCase().includes('pant') || p.toLowerCase().includes('salt') || p.toLowerCase().includes('rahul')).length;
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${team.teamName || `Team ${index + 1}`}
                </td>
                <td class="px-4 py-4 whitespace-nowrap text-sm text-yellow-600 font-medium">
                    ${team.captain || 'Not selected'}
                </td>
                <td class="px-4 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                    ${team.vice_captain || 'Not selected'}
                </td>
                <td class="px-4 py-4 text-sm text-gray-500">
                    ${batsmen}B ${bowlers}W ${allRounders}AR ${wicketKeepers}WK
                </td>
                <td class="px-4 py-4 text-sm text-gray-500">
                    <div class="max-h-20 overflow-y-auto">
                        ${team.players.join(', ')}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function displayAllTeamDetails() {
    allTeamsDetails.innerHTML = currentTeams.map((team, index) => `
        <div class="border border-gray-200 rounded-lg p-4">
            <div class="flex justify-between items-start mb-4">
                <h4 class="font-semibold text-gray-900">${team.teamName || `Team ${index + 1}`}</h4>
                <span class="text-sm text-gray-500">${team.players.length} players</span>
            </div>
            
            <div class="space-y-2">
                <h5 class="font-medium text-gray-700 mb-2">Players:</h5>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    ${team.players.map(player => `
                        <div class="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span class="text-sm font-medium text-gray-900">${player}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `).join('');
}

function displayComparisonResults(result) {
    // Display AI recommendation with better formatting and bold headings
    let formattedComparison = result.comparison;
    
    // Make headings bold
    formattedComparison = formattedComparison
        .replace(/(🏆 WINNING TEAM RECOMMENDATION: TEAM \d+)/g, '<strong class="text-lg font-bold text-purple-900">$1</strong>')
        .replace(/(• \*\*Rating: \d+\/10\*\*)/g, '<strong class="text-purple-800">$1</strong>')
        .replace(/(• \*\*Key Strengths:\*\*)/g, '<strong class="text-purple-800">$1</strong>')
        .replace(/(• \*\*Risk Factors:\*\*)/g, '<strong class="text-purple-800">$1</strong>')
        .replace(/(• \*\*Why This Team:\*\*)/g, '<strong class="text-purple-800">$1</strong>')
        .replace(/(📊 DETAILED COMPARISON:)/g, '<strong class="text-lg font-bold text-gray-900">$1</strong>')
        .replace(/(🎯 STRATEGIC INSIGHTS:)/g, '<strong class="text-lg font-bold text-gray-900">$1</strong>')
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-purple-800">$1</strong>');
    
    recommendationText.innerHTML = `<div class="whitespace-pre-line">${formattedComparison}</div>`;

    comparisonContent.classList.remove('hidden');
}

// Toast functions
function showError(message) {
    errorMessage.textContent = message;
    errorToast.classList.remove('translate-y-full');
    setTimeout(() => {
        errorToast.classList.add('translate-y-full');
    }, 5000);
}

function showSuccess(message) {
    successMessage.textContent = message;
    successToast.classList.remove('translate-y-full');
    setTimeout(() => {
        successToast.classList.add('translate-y-full');
    }, 5000);
} 