// Configuration
const API_BASE_URL = 'http://localhost:3001/api';

// IPL 2025 Teams
const iplTeams = [
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

// DOM Elements
let fileInput, uploadArea, uploadContent, uploadLoading, imagePreview, previewImg, removeImageBtn;
let teamASelect, teamBSelect, matchDateInput, validateMatchBtn;
let teamDataSection, playersListDiv, playerCountEl, captainSelect, viceCaptainSelect, captainNameEl, viceCaptainNameEl, analyzeBtn, summaryBtn;
let aiAnalysisSection, analysisLoading, analysisContent, analysisText;
let teamSummarySection, summaryLoading, summaryContent, summaryText;
let errorToast, errorMessage, successToast, successMessage;
let playerSelectionModal, modalSubtitle, playerSearch, teamFilter, modalPlayersList, closeModal, cancelSelection;

// Global state
let currentFile = null;
let extractedTeamData = null;
let matchValidated = false;
let playerValidationResults = null;
let availablePlayers = [];
let currentPlayerIndex = null;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    initializeEventListeners();
    populateTeamDropdowns();
    setDefaultDate();
});

function initializeElements() {
    // File upload elements
    fileInput = document.getElementById('file-input');
    uploadArea = document.getElementById('upload-area');
    uploadContent = document.getElementById('upload-content');
    uploadLoading = document.getElementById('upload-loading');
    imagePreview = document.getElementById('image-preview');
    previewImg = document.getElementById('preview-img');
    removeImageBtn = document.getElementById('remove-image');

    // Match details elements
    teamASelect = document.getElementById('team-a');
    teamBSelect = document.getElementById('team-b');
    matchDateInput = document.getElementById('match-date');
    validateMatchBtn = document.getElementById('validate-match-btn');

    // Team data elements
    teamDataSection = document.getElementById('team-data');
    playersListDiv = document.getElementById('players-list');
    playerCountEl = document.getElementById('player-count');
    captainSelect = document.getElementById('captain-select');
    viceCaptainSelect = document.getElementById('vice-captain-select');
    captainNameEl = document.getElementById('captain-name');
    viceCaptainNameEl = document.getElementById('vice-captain-name');
    analyzeBtn = document.getElementById('analyze-btn');
    summaryBtn = document.getElementById('summary-btn');
    summarizeBtn = document.getElementById('summarize-btn');

    // AI analysis elements
    aiAnalysisSection = document.getElementById('ai-analysis');
    analysisLoading = document.getElementById('analysis-loading');
    analysisContent = document.getElementById('analysis-content');
    analysisText = document.getElementById('analysis-text');

    // Team summary elements
    teamSummarySection = document.getElementById('team-summary');
    summaryLoading = document.getElementById('summary-loading');
    summaryContent = document.getElementById('summary-content');
    summaryText = document.getElementById('summary-text');

    // Toast elements
    errorToast = document.getElementById('error-toast');
    errorMessage = document.getElementById('error-message');
    successToast = document.getElementById('success-toast');
    successMessage = document.getElementById('success-message');

    // Player selection modal elements
    playerSelectionModal = document.getElementById('player-selection-modal');
    modalSubtitle = document.getElementById('modal-subtitle');
    playerSearch = document.getElementById('player-search');
    teamFilter = document.getElementById('team-filter');
    modalPlayersList = document.getElementById('modal-players-list');
    closeModal = document.getElementById('close-modal');
    cancelSelection = document.getElementById('cancel-selection');
}

function initializeEventListeners() {
    // File upload events
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);
    removeImageBtn.addEventListener('click', removeImage);

    // Match validation events
    validateMatchBtn.addEventListener('click', validateMatch);
    teamASelect.addEventListener('change', resetMatchValidation);
    teamBSelect.addEventListener('change', resetMatchValidation);
    matchDateInput.addEventListener('change', resetMatchValidation);

    // Captain and Vice-Captain selection events
    captainSelect.addEventListener('change', handleCaptainSelection);
    viceCaptainSelect.addEventListener('change', handleViceCaptainSelection);

    // Action buttons
    analyzeBtn.addEventListener('click', analyzeTeam);
    summaryBtn.addEventListener('click', generateTeamSummary);
    summarizeBtn.addEventListener('click', generateTeamSummary);

    // Player selection modal events
    closeModal.addEventListener('click', hidePlayerSelectionModal);
    cancelSelection.addEventListener('click', hidePlayerSelectionModal);
    playerSearch.addEventListener('input', filterModalPlayers);
    teamFilter.addEventListener('change', filterModalPlayers);
    
    // Close modal when clicking outside
    playerSelectionModal.addEventListener('click', (e) => {
        if (e.target === playerSelectionModal) {
            hidePlayerSelectionModal();
        }
    });
}

function populateTeamDropdowns() {
    iplTeams.forEach(team => {
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



async function validateMatch() {
    const teamA = teamASelect.value;
    const teamB = teamBSelect.value;
    const matchDate = matchDateInput.value;

    if (!teamA || !teamB || !matchDate) {
        showError('Please select both teams and match date');
        return;
    }

    if (teamA === teamB) {
        showError('Please select different teams');
        return;
    }

    try {
        setValidateMatchButtonLoading(true);

        const response = await fetch(`${API_BASE_URL}/validate-match`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ teamA, teamB, matchDate })
        });

        const result = await response.json();

        if (result.success) {
            matchValidated = true;
            
            if (result.matchExists) {
                showSuccess(`✅ Match validated: ${teamA} vs ${teamB} on ${formatDate(matchDate)}`);
            } else {
                showSuccess(`⚠️ Match validated (limited data): ${teamA} vs ${teamB} on ${formatDate(matchDate)}`);
            }

            updateValidateMatchButton('✅ Match Validated', true);
            setValidateMatchButtonLoading(false);
        } else {
            showError(result.message);
            setValidateMatchButtonLoading(false);
        }
    } catch (error) {
        console.error('Match validation error:', error);
        showError('Failed to validate match. Please try again.');
        setValidateMatchButtonLoading(false);
    }
}

function resetMatchValidation() {
    matchValidated = false;
    updateValidateMatchButton('🔍 Validate Match', false);
}

function setValidateMatchButtonLoading(loading) {
    if (loading) {
        validateMatchBtn.innerHTML = '<div class="inline-flex items-center"><div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>Validating...</div>';
        validateMatchBtn.disabled = true;
    }
}

function updateValidateMatchButton(text, validated) {
    validateMatchBtn.innerHTML = text;
    validateMatchBtn.disabled = false;
    
    if (validated) {
        validateMatchBtn.classList.remove('from-primary', 'to-primary-light', 'hover:from-primary-light', 'hover:to-secondary');
        validateMatchBtn.classList.add('from-success', 'to-cricket-green', 'hover:from-cricket-green', 'hover:to-success');
    } else {
        validateMatchBtn.classList.remove('from-success', 'to-cricket-green', 'hover:from-cricket-green', 'hover:to-success');
        validateMatchBtn.classList.add('from-primary', 'to-primary-light', 'hover:from-primary-light', 'hover:to-secondary');
    }
}



function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('border-primary', 'bg-primary/5');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('border-primary', 'bg-primary/5');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFile(file) {
    // Check if match is validated first
    if (!matchValidated) {
        showError('Please validate the match details first before uploading screenshot');
        return;
    }

    // Validate file
    if (!validateFile(file)) {
        return;
    }

    currentFile = file;
    showImagePreview(file);
    processImage(file);
}

function validateFile(file) {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];

    if (!allowedTypes.includes(file.type)) {
        showError('Please upload a valid image file (JPG, PNG)');
        return false;
    }

    if (file.size > maxSize) {
        showError('File size must be less than 5MB');
        return false;
    }

    return true;
}

function showImagePreview(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        previewImg.src = e.target.result;
        imagePreview.classList.remove('hidden');
        uploadContent.classList.add('hidden');
    };
    reader.readAsDataURL(file);
}

function removeImage() {
    currentFile = null;
    extractedTeamData = null;
    playerValidationResults = null;
    fileInput.value = '';
    imagePreview.classList.add('hidden');
    uploadContent.classList.remove('hidden');
    teamDataSection.classList.add('hidden');
    aiAnalysisSection.classList.add('hidden');
    teamSummarySection.classList.add('hidden');
    
    // Reset captain and vice-captain dropdowns
    resetCaptainSelections();
}

async function processImage(file) {
    try {
        showUploadLoading(true);
        
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch(`${API_BASE_URL}/ocr/process`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        showUploadLoading(false);

        if (result.success) {
            extractedTeamData = result.data;
            showSuccess(`✅ Extracted ${result.data.players.length} players from screenshot`);
            
            // Validate players against database
            await validatePlayers(result.data.players);
        } else {
            showError(result.message || 'Failed to process image');
        }

    } catch (error) {
        console.error('Image processing error:', error);
        showUploadLoading(false);
        showError('Failed to process image. Please try again.');
    }
}



async function validatePlayers(players) {
    const teamA = teamASelect.value;
    const teamB = teamBSelect.value;

    try {
        const response = await fetch(`${API_BASE_URL}/validate-players`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ players, teamA, teamB })
        });

        const result = await response.json();

        if (result.success) {
            playerValidationResults = result;
            displayTeamDataWithValidation(result);
    } else {
            showError(result.message || 'Failed to validate players');
            // Show basic team data without validation
            displayTeamData(extractedTeamData);
        }
    } catch (error) {
        console.error('Player validation error:', error);
        showError('Failed to validate players. Showing basic data.');
        displayTeamData(extractedTeamData);
    }
}

function displayTeamDataWithValidation(validationResult) {
    teamDataSection.classList.remove('hidden');
    
    const validPlayers = validationResult.validationResults.filter(p => p.isValid);
    const invalidPlayers = validationResult.validationResults.filter(p => !p.isValid && !p.isMissing);
    const missingPlayers = validationResult.validationResults.filter(p => p.isMissing);
    
    playerCountEl.textContent = `${validationResult.extractedPlayers || validationResult.totalPlayers}/11`;
    playersListDiv.innerHTML = '';
    
    validationResult.validationResults.forEach((player, index) => {
        const playerDiv = document.createElement('div');
        
        if (player.isValid) {
            const isAutoReplaced = player.autoReplaced;
            const bgColor = isAutoReplaced ? 'bg-blue-50 border-blue-200' : 'bg-success/10 border-success/20';
            const iconColor = isAutoReplaced ? 'text-blue-600' : 'text-success';
            const icon = isAutoReplaced ? '🔄' : '✅';
            const statusText = isAutoReplaced ? `${Math.round(player.confidence * 100)}% match` : 'Validated';
            
            playerDiv.className = `flex items-center justify-between p-3 ${bgColor} border rounded-lg`;
            playerDiv.innerHTML = `
                <div class="flex items-center">
                    <span class="${iconColor} mr-2">${icon}</span>
                    <div>
                        <span class="font-medium text-gray-900">${player.validatedName}</span>
                        <div class="text-xs text-gray-500">${player.role} • ${player.team}</div>
                        ${isAutoReplaced ? `<div class="text-xs ${iconColor} italic">Auto-corrected from "${player.inputName}"</div>` : ''}
                    </div>
                </div>
                <div class="text-xs ${iconColor} font-medium">${statusText}</div>
            `;
        } else if (player.isMissing) {
            // Missing player slot
            playerDiv.className = 'p-3 bg-gray-100 border border-gray-300 rounded-lg border-dashed';
            playerDiv.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <span class="text-gray-400 mr-2">❌</span>
                        <div>
                            <span class="font-medium text-gray-600">${player.inputName}</span>
                            <div class="text-xs text-gray-500">Not extracted from screenshot</div>
                        </div>
                    </div>
                    <button onclick="showCustomNameInput(${index})" class="text-xs bg-primary text-white px-2 py-1 rounded hover:bg-primary/80 transition-colors">
                        Add Player
                    </button>
                </div>
            `;
        } else {
            playerDiv.className = 'p-3 bg-warning/10 border border-warning/20 rounded-lg';
            
            const hasSuggestions = player.suggestions && player.suggestions.length > 0;
            const suggestionsHtml = hasSuggestions ? `
                <div class="mt-3">
                    <div class="text-xs text-gray-600 mb-2 font-medium">Suggested players:</div>
                    <div class="space-y-1 max-h-32 overflow-y-auto">
                        ${player.suggestions.map(suggestion => `
                            <button onclick="replacePlayer(${index}, '${suggestion.playerName}', ${suggestion.playerId}, '${suggestion.role}', '${suggestion.team}')" 
                                    class="block w-full text-left p-2 bg-white border border-gray-200 rounded-lg text-xs hover:bg-gray-50 transition-colors">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <span class="font-medium text-gray-900">${suggestion.playerName}</span>
                                        <div class="text-gray-500">${suggestion.role} • ${suggestion.team}</div>
                                    </div>
                                    <span class="text-warning font-bold">${Math.round(suggestion.similarity * 100)}%</span>
                                </div>
                            </button>
                        `).join('')}
                    </div>
                </div>
            ` : '';
            
            playerDiv.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <span class="text-warning mr-2">⚠️</span>
                        <div>
                            <span class="font-medium text-gray-900">${player.inputName}</span>
                            <div class="text-xs text-gray-500">Player not found</div>
                        </div>
                    </div>
                    <button onclick="showCustomNameInput(${index})" class="text-xs bg-secondary text-white px-2 py-1 rounded hover:bg-secondary/80 transition-colors">
                        Select
                    </button>
                </div>
                ${suggestionsHtml}
            `;
        }
        
        playersListDiv.appendChild(playerDiv);
    });
    
    populateCaptainDropdowns(validPlayers.map(p => p.validatedName));
    
    // Show validation summary
    const autoReplacedPlayers = validPlayers.filter(p => p.autoReplaced);
    let summaryMessage = '';
    
    if (validPlayers.length === 11) {
        summaryMessage = autoReplacedPlayers.length > 0 
            ? `✅ All 11 players validated! ${autoReplacedPlayers.length} auto-corrected.`
            : `✅ All 11 players validated successfully!`;
        showSuccess(summaryMessage);
    } else {
        const issues = [];
        if (missingPlayers.length > 0) issues.push(`${missingPlayers.length} missing`);
        if (invalidPlayers.length > 0) issues.push(`${invalidPlayers.length} need correction`);
        
        summaryMessage = `${validPlayers.length}/11 players validated`;
        if (issues.length > 0) summaryMessage += ` (${issues.join(', ')})`;
        
        showError(summaryMessage + '. Complete your team to continue.');
    }
    
    if (validationResult.availablePlayers) {
        availablePlayers = validationResult.availablePlayers;
    }
}

function replacePlayer(playerIndex, newName, playerId, role, team) {
    playerValidationResults.validationResults[playerIndex] = {
        inputName: playerValidationResults.validationResults[playerIndex].inputName,
        validatedName: newName,
        playerId: playerId,
        role: role,
        team: team,
        isValid: true,
        confidence: 1.0
    };
    
    extractedTeamData.players[playerIndex] = newName;
    displayTeamDataWithValidation(playerValidationResults);
    showSuccess(`Selected ${newName}`);
}

function showCustomNameInput(playerIndex) {
    currentPlayerIndex = playerIndex;
    const originalName = playerValidationResults.validationResults[playerIndex].inputName;
    
    modalSubtitle.textContent = `Select player for: "${originalName}"`;
    populateTeamFilter();
    playerSearch.value = '';
    filterModalPlayers();
    
    playerSelectionModal.classList.remove('hidden');
    document.body.classList.add('modal-open');
    setTimeout(() => playerSearch.focus(), 100);
}

function populateTeamFilter() {
    // Clear existing options
    teamFilter.innerHTML = '<option value="">All Teams</option>';
    
    // Get unique teams from available players
    const teams = [...new Set(availablePlayers.map(p => p.team_name))].sort();
    
    teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team;
        option.textContent = team;
        teamFilter.appendChild(option);
    });
}

function filterModalPlayers() {
    const searchTerm = playerSearch.value.toLowerCase();
    const selectedTeam = teamFilter.value;
    
    let filteredPlayers = availablePlayers;
    
    // Filter by team if selected
    if (selectedTeam) {
        filteredPlayers = filteredPlayers.filter(p => p.team_name === selectedTeam);
    }
    
    // Filter by search term
    if (searchTerm) {
        filteredPlayers = filteredPlayers.filter(p => 
            p.player_name.toLowerCase().includes(searchTerm)
        );
    }
    
    // Display filtered players
    displayModalPlayers(filteredPlayers);
}

function displayModalPlayers(players) {
    modalPlayersList.innerHTML = '';
    
    if (players.length === 0) {
        modalPlayersList.innerHTML = `
            <div class="text-center py-4 text-gray-500">
                <p>No players found</p>
                <p class="text-xs mt-1">Try adjusting your search or filter</p>
            </div>
        `;
        return;
    }
    
    players.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'p-3 bg-white border border-gray-200 rounded-lg hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all duration-200 group';
        
        playerDiv.innerHTML = `
            <div class="flex items-center justify-between">
                <div>
                    <div class="font-medium text-gray-900 group-hover:text-primary">${player.player_name}</div>
                    <div class="text-xs text-gray-500">${player.role} • ${player.team_name}</div>
                    ${player.match_count ? `<div class="text-xs text-gray-400">${player.match_count} matches</div>` : ''}
                </div>
                <div class="text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                </div>
            </div>
        `;
        
        playerDiv.addEventListener('click', () => {
            selectModalPlayer(player);
        });
        
        modalPlayersList.appendChild(playerDiv);
    });
}

function selectModalPlayer(player) {
    playerValidationResults.validationResults[currentPlayerIndex] = {
        inputName: playerValidationResults.validationResults[currentPlayerIndex].inputName,
        validatedName: player.player_name,
        playerId: player.player_id,
        role: player.role,
        team: player.team_name,
        isValid: true,
        confidence: 1.0
    };
    
    extractedTeamData.players[currentPlayerIndex] = player.player_name;
    hidePlayerSelectionModal();
    displayTeamDataWithValidation(playerValidationResults);
    showSuccess(`Selected ${player.player_name}`);
}

function hidePlayerSelectionModal() {
    playerSelectionModal.classList.add('hidden');
    document.body.classList.remove('modal-open');
    currentPlayerIndex = null;
}





function displayTeamData(data) {
    teamDataSection.classList.remove('hidden');

    // Update player count
    playerCountEl.textContent = data.players.length;

    // Display players
    playersListDiv.innerHTML = '';
    data.players.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'flex items-center p-3 bg-gray-50 border border-gray-200 rounded-lg';
        playerDiv.innerHTML = `
            <span class="text-primary mr-2">👤</span>
            <span class="font-medium text-gray-900">${player}</span>
        `;
        playersListDiv.appendChild(playerDiv);
    });
    
    // Populate captain dropdowns
    populateCaptainDropdowns(data.players);
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

        const vcOption = document.createElement('option');
        vcOption.value = player;
        vcOption.textContent = player;
        viceCaptainSelect.appendChild(vcOption);
    });
}

function resetCaptainSelections() {
    if (captainSelect) {
        captainSelect.innerHTML = '<option value="">Choose Captain</option>';
        viceCaptainSelect.innerHTML = '<option value="">Choose Vice-Captain</option>';
        captainNameEl.textContent = 'Not selected';
        viceCaptainNameEl.textContent = 'Not selected';
    }
}



function handleCaptainSelection() {
    const selectedCaptain = captainSelect.value;
    
    if (selectedCaptain) {
        captainNameEl.textContent = selectedCaptain;
        updateViceCaptainOptions();
    } else {
        captainNameEl.textContent = 'Not selected';
    }
    
    updateActionButtons();
}

function handleViceCaptainSelection() {
    const selectedVC = viceCaptainSelect.value;
    
    if (selectedVC) {
        viceCaptainNameEl.textContent = selectedVC;
        updateCaptainOptions();
    } else {
        viceCaptainNameEl.textContent = 'Not selected';
    }
    
    updateActionButtons();
}

function updateCaptainOptions() {
    const selectedVC = viceCaptainSelect.value;
    const captainOptions = captainSelect.children;
    
    for (let option of captainOptions) {
        if (option.value === selectedVC && option.value !== '') {
            option.disabled = true;
            option.textContent = option.textContent.includes('(VC)') ? option.textContent : option.textContent + ' (VC)';
        } else {
            option.disabled = false;
            option.textContent = option.textContent.replace(' (VC)', '');
        }
    }
}

function updateViceCaptainOptions() {
    const selectedCaptain = captainSelect.value;
    const vcOptions = viceCaptainSelect.children;
    
    for (let option of vcOptions) {
        if (option.value === selectedCaptain && option.value !== '') {
            option.disabled = true;
            option.textContent = option.textContent.includes('(C)') ? option.textContent : option.textContent + ' (C)';
        } else {
            option.disabled = false;
            option.textContent = option.textContent.replace(' (C)', '');
        }
    }
}

function updateActionButtons() {
    const captain = captainSelect.value;
    const viceCaptain = viceCaptainSelect.value;
    const hasRequiredData = extractedTeamData && captain && viceCaptain && matchValidated;
    
    analyzeBtn.disabled = !hasRequiredData;
    summaryBtn.disabled = !hasRequiredData;
    
    if (hasRequiredData) {
        analyzeBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'transform-none');
        summaryBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'transform-none');
    } else {
        analyzeBtn.classList.add('opacity-50', 'cursor-not-allowed', 'transform-none');
        summaryBtn.classList.add('opacity-50', 'cursor-not-allowed', 'transform-none');
    }
}



async function analyzeTeam() {
    if (!extractedTeamData || !captainSelect.value || !viceCaptainSelect.value || !matchValidated) {
        showError('Please complete team setup first');
        return;
    }

    try {
        showAnalysisLoading(true);
        aiAnalysisSection.classList.remove('hidden');
        
        const analysisData = {
            teamA: teamASelect.value,
            teamB: teamBSelect.value,
            matchDate: matchDateInput.value,
            players: extractedTeamData.players,
            captain: captainSelect.value,
            viceCaptain: viceCaptainSelect.value
        };

        // Update team names in analysis sections
        document.getElementById('team-a-name').textContent = teamASelect.value;
        document.getElementById('team-b-name').textContent = teamBSelect.value;
        document.getElementById('captain-performance-name').textContent = captainSelect.value;
        document.getElementById('vice-captain-performance-name').textContent = viceCaptainSelect.value;

        // Fetch all analysis data in parallel
        const [teamFormData, headToHeadData, playerPerformanceData, venueStatsData] = await Promise.all([
            fetchTeamRecentForm(analysisData),
            fetchHeadToHead(analysisData),
            fetchPlayerPerformance(analysisData),
            fetchVenueStats(analysisData)
        ]);

        // Display all analysis components
        displayTeamRecentForm(teamFormData);
        displayHeadToHead(headToHeadData);
        displayPlayerPerformance(playerPerformanceData);
        displayVenueStats(venueStatsData);
        // Get validated players with role information
        const validatedPlayers = playerValidationResults?.validationResults?.filter(p => p.isValid) || [];
        displayTeamBalance(validatedPlayers);

        showAnalysisLoading(false);
        analysisContent.classList.remove('hidden');
        showSuccess('Team analysis completed!');

    } catch (error) {
        console.error('Analysis error:', error);
        showAnalysisLoading(false);
        showError('Failed to analyze team. Please try again.');
        aiAnalysisSection.classList.add('hidden');
    }
}

async function generateTeamSummary() {
    if (!extractedTeamData || !captainSelect.value || !viceCaptainSelect.value || !matchValidated) {
        showError('Please complete team setup first');
        return;
    }

    try {
        showSummaryLoading(true);
        teamSummarySection.classList.remove('hidden');
        
        const summaryData = {
            teamA: teamASelect.value,
            teamB: teamBSelect.value,
            matchDate: matchDateInput.value,
            players: extractedTeamData.players,
            captain: captainSelect.value,
            viceCaptain: viceCaptainSelect.value
        };

        const response = await fetch(`${API_BASE_URL}/team-summary`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(summaryData)
        });

        const result = await response.json();
        showSummaryLoading(false);

        if (result.success) {
            displaySummary(result.summary);
            showSuccess('⭐ Team summary generated!');
        } else {
            showError(result.message || 'Failed to generate team summary');
            teamSummarySection.classList.add('hidden');
        }

    } catch (error) {
        console.error('Summary error:', error);
        showSummaryLoading(false);
        showError('Failed to generate team summary. Please try again.');
        teamSummarySection.classList.add('hidden');
    }
}



function showUploadLoading(show) {
    if (show) {
        uploadContent.classList.add('hidden');
        uploadLoading.classList.remove('hidden');
    } else {
        uploadContent.classList.remove('hidden');
        uploadLoading.classList.add('hidden');
    }
}

function showAnalysisLoading(show) {
    if (show) {
        analysisContent.classList.add('hidden');
        analysisLoading.classList.remove('hidden');
    } else {
        analysisContent.classList.remove('hidden');
        analysisLoading.classList.add('hidden');
    }
}

function showSummaryLoading(show) {
    if (show) {
        summaryContent.classList.add('hidden');
        summaryLoading.classList.remove('hidden');
    } else {
        summaryContent.classList.remove('hidden');
        summaryLoading.classList.add('hidden');
    }
}

function displayAnalysis(analysis) {
    analysisText.innerHTML = formatAnalysisText(analysis);
}

// Analysis fetch functions
async function fetchTeamRecentForm(analysisData) {
    const response = await fetch(`${API_BASE_URL}/team-recent-form`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analysisData)
    });
    if (!response.ok) throw new Error('Failed to fetch team form');
    return await response.json();
}

async function fetchHeadToHead(analysisData) {
    const response = await fetch(`${API_BASE_URL}/head-to-head`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analysisData)
    });
    if (!response.ok) throw new Error('Failed to fetch head-to-head');
    return await response.json();
}

async function fetchPlayerPerformance(analysisData) {
    const response = await fetch(`${API_BASE_URL}/player-performance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analysisData)
    });
    if (!response.ok) throw new Error('Failed to fetch player performance');
    return await response.json();
}

async function fetchVenueStats(analysisData) {
    const response = await fetch(`${API_BASE_URL}/venue-stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analysisData)
    });
    if (!response.ok) throw new Error('Failed to fetch venue stats');
    return await response.json();
}



// Analysis display functions
function displayTeamRecentForm(data) {
    const teamAFormEl = document.getElementById('team-a-form');
    const teamBFormEl = document.getElementById('team-b-form');

    if (data.success && data.data) {
        // Display Team A form
        const teamAMatches = data.data.teamA.matches;
        if (teamAMatches.length > 0) {
            const formString = teamAMatches.map(match => 
                match.result === 'Win' ? 'W' : match.result === 'Loss' ? 'L' : 'D'
            ).join('-');
            const wins = teamAMatches.filter(m => m.result === 'Win').length;
            teamAFormEl.innerHTML = `
                <div class="font-mono font-bold text-base mb-2 text-blue-700">${formString}</div>
                <div class="text-gray-600 font-medium">${wins}/5 wins</div>
                <div class="text-xs text-gray-500 mt-1">${teamAMatches.length > 0 ? 'Recent form' : 'No data'}</div>
            `;
        } else {
            teamAFormEl.innerHTML = '<div class="text-gray-500">No recent matches</div>';
        }

        // Display Team B form
        const teamBMatches = data.data.teamB.matches;
        if (teamBMatches.length > 0) {
            const formString = teamBMatches.map(match => 
                match.result === 'Win' ? 'W' : match.result === 'Loss' ? 'L' : 'D'
            ).join('-');
            const wins = teamBMatches.filter(m => m.result === 'Win').length;
            teamBFormEl.innerHTML = `
                <div class="font-mono font-bold text-base mb-2 text-blue-700">${formString}</div>
                <div class="text-gray-600 font-medium">${wins}/5 wins</div>
                <div class="text-xs text-gray-500 mt-1">${teamBMatches.length > 0 ? 'Recent form' : 'No data'}</div>
            `;
        } else {
            teamBFormEl.innerHTML = '<div class="text-gray-500">No recent matches</div>';
        }
    } else {
        teamAFormEl.innerHTML = '<div class="text-gray-500">No data available</div>';
        teamBFormEl.innerHTML = '<div class="text-gray-500">No data available</div>';
    }
}

function displayHeadToHead(data) {
    const headToHeadEl = document.getElementById('head-to-head-content');

    if (data.success && data.data) {
        const h2h = data.data;
        const allMatches = h2h.allHistoricalMatches || [];
        
        // Create match history list
        const matchHistoryHtml = allMatches.length > 0 ? 
            allMatches.slice(0, 8).map(match => {
                const winnerIcon = match.winner === h2h.teamA ? '🔵' : 
                                 match.winner === h2h.teamB ? '🟣' : '⚪';
                const formattedDate = new Date(match.match_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                return `
                <div class="flex justify-between items-center py-1 text-xs border-b border-gray-100 last:border-0">
                    <span class="text-gray-600">${formattedDate}</span>
                    <div class="flex items-center gap-1">
                        <span class="text-gray-500">${match.team1} vs ${match.team2}</span>
                        <span>${winnerIcon}</span>
                    </div>
                </div>
                `;
            }).join('') : 
            '<div class="text-xs text-gray-500 text-center py-2">No match history available</div>';

        headToHeadEl.innerHTML = `
            <div class="bg-white rounded-lg p-3 space-y-3">
                <!-- Overall Stats -->
                <div class="flex justify-between items-center">
                    <div class="text-center">
                        <div class="text-xl font-bold text-blue-600">${h2h.teamAWins}</div>
                        <div class="text-gray-600 text-xs">${h2h.teamA}</div>
                    </div>
                    <div class="text-center px-4">
                        <div class="text-lg font-bold text-gray-600">${h2h.totalMatches}</div>
                        <div class="text-gray-600 text-xs">Total Matches</div>
                    </div>
                    <div class="text-center">
                        <div class="text-xl font-bold text-purple-600">${h2h.teamBWins}</div>
                        <div class="text-gray-600 text-xs">${h2h.teamB}</div>
                    </div>
                </div>

                <!-- Win Percentages -->
                <div class="flex gap-2 text-xs">
                    <div class="flex-1 bg-blue-100 rounded px-2 py-1 text-center text-blue-800">
                        ${h2h.totalMatches > 0 ? Math.round((h2h.teamAWins / h2h.totalMatches) * 100) : 0}% win rate
                    </div>
                    <div class="flex-1 bg-purple-100 rounded px-2 py-1 text-center text-purple-800">
                        ${h2h.totalMatches > 0 ? Math.round((h2h.teamBWins / h2h.totalMatches) * 100) : 0}% win rate
                    </div>
                </div>


            </div>
        `;
    } else {
        headToHeadEl.innerHTML = '<div class="text-gray-500">No head-to-head data available</div>';
    }
}

function displayPlayerPerformance(data) {
    const captainEl = document.getElementById('captain-performance');
    const viceCaptainEl = document.getElementById('vice-captain-performance');

    if (data.success && data.data) {
        // Captain performance with role-based display
        const captainMatches = data.data.captain.recentMatches;
        const captainRole = data.data.captain.role;
        
        if (captainMatches.length > 0) {
            const isBatsman = captainRole && (captainRole.toLowerCase().includes('batsman') || captainRole.toLowerCase().includes('bats'));
            const isBowler = captainRole && (captainRole.toLowerCase().includes('bowler') || captainRole.toLowerCase().includes('bowl'));
            
            let primaryStat, primaryLabel, secondaryStat, secondaryLabel;
            
            if (isBatsman) {
                primaryStat = (captainMatches.reduce((sum, m) => sum + m.runs_scored, 0) / captainMatches.length).toFixed(1);
                primaryLabel = 'Avg Runs';
                secondaryStat = captainMatches.map(m => m.runs_scored).join(', ');
                secondaryLabel = 'Last 5 Scores';
            } else if (isBowler) {
                primaryStat = (captainMatches.reduce((sum, m) => sum + m.wickets_taken, 0) / captainMatches.length).toFixed(1);
                primaryLabel = 'Avg Wickets';
                secondaryStat = captainMatches.map(m => m.wickets_taken).join(', ');
                secondaryLabel = 'Last 5 Wickets';
            } else {
                // All-rounder or unknown
                primaryStat = (captainMatches.reduce((sum, m) => sum + m.runs_scored, 0) / captainMatches.length).toFixed(1);
                primaryLabel = 'Avg Runs';
                secondaryStat = (captainMatches.reduce((sum, m) => sum + m.wickets_taken, 0) / captainMatches.length).toFixed(1);
                secondaryLabel = 'Avg Wickets';
            }
            
            captainEl.innerHTML = `
                <div class="bg-yellow-100 rounded-lg p-3">
                    <div class="flex justify-between items-center mb-2">
                        <span class="font-semibold text-yellow-800">Recent Performance</span>
                        <span class="text-xs text-yellow-600">${captainMatches.length} matches</span>
                    </div>
                    <div class="text-xs text-yellow-600 mb-2 capitalize">${captainRole || 'Player'}</div>
                    <div class="grid grid-cols-1 gap-2 text-sm">
                        <div>
                            <div class="font-bold text-yellow-700">${primaryStat}</div>
                            <div class="text-xs text-yellow-600">${primaryLabel}</div>
                        </div>
                        <div>
                            <div class="font-mono text-xs text-yellow-700">${secondaryStat}</div>
                            <div class="text-xs text-yellow-600">${secondaryLabel}</div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            captainEl.innerHTML = '<div class="text-gray-500">No recent data</div>';
        }

        // Vice-captain performance with role-based display
        const vcMatches = data.data.viceCaptain.recentMatches;
        const vcRole = data.data.viceCaptain.role;
        
        if (vcMatches.length > 0) {
            const isBatsman = vcRole && (vcRole.toLowerCase().includes('batsman') || vcRole.toLowerCase().includes('bats'));
            const isBowler = vcRole && (vcRole.toLowerCase().includes('bowler') || vcRole.toLowerCase().includes('bowl'));
            
            let primaryStat, primaryLabel, secondaryStat, secondaryLabel;
            
            if (isBatsman) {
                primaryStat = (vcMatches.reduce((sum, m) => sum + m.runs_scored, 0) / vcMatches.length).toFixed(1);
                primaryLabel = 'Avg Runs';
                secondaryStat = vcMatches.map(m => m.runs_scored).join(', ');
                secondaryLabel = 'Last 5 Scores';
            } else if (isBowler) {
                primaryStat = (vcMatches.reduce((sum, m) => sum + m.wickets_taken, 0) / vcMatches.length).toFixed(1);
                primaryLabel = 'Avg Wickets';
                secondaryStat = vcMatches.map(m => m.wickets_taken).join(', ');
                secondaryLabel = 'Last 5 Wickets';
            } else {
                // All-rounder or unknown
                primaryStat = (vcMatches.reduce((sum, m) => sum + m.runs_scored, 0) / vcMatches.length).toFixed(1);
                primaryLabel = 'Avg Runs';
                secondaryStat = (vcMatches.reduce((sum, m) => sum + m.wickets_taken, 0) / vcMatches.length).toFixed(1);
                secondaryLabel = 'Avg Wickets';
            }
            
            viceCaptainEl.innerHTML = `
                <div class="bg-blue-100 rounded-lg p-3">
                    <div class="flex justify-between items-center mb-2">
                        <span class="font-semibold text-blue-800">Recent Performance</span>
                        <span class="text-xs text-blue-600">${vcMatches.length} matches</span>
                    </div>
                    <div class="text-xs text-blue-600 mb-2 capitalize">${vcRole || 'Player'}</div>
                    <div class="grid grid-cols-1 gap-2 text-sm">
                        <div>
                            <div class="font-bold text-blue-700">${primaryStat}</div>
                            <div class="text-xs text-blue-600">${primaryLabel}</div>
                        </div>
                        <div>
                            <div class="font-mono text-xs text-blue-700">${secondaryStat}</div>
                            <div class="text-xs text-blue-600">${secondaryLabel}</div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            viceCaptainEl.innerHTML = '<div class="text-gray-500">No recent data</div>';
        }
    } else {
        captainEl.innerHTML = '<div class="text-gray-500">No data available</div>';
        viceCaptainEl.innerHTML = '<div class="text-gray-500">No data available</div>';
    }
}

function displayVenueStats(data) {
    const venueStatsEl = document.getElementById('venue-stats-content');

    if (data.success && data.data && data.data.venueStats) {
        const venue = data.data.venueStats;
        
        // Determine pitch color based on type
        const pitchColorClass = venue.pitch_type === 'batting' ? 'bg-green-100 text-green-800 border-green-200' : 
                               venue.pitch_type === 'bowling' ? 'bg-red-100 text-red-800 border-red-200' : 
                               'bg-yellow-100 text-yellow-800 border-yellow-200';
        
        // Get team performance data if available
        const teamPerformance = venue.team_venue_performance || {};
        const teamNames = Object.keys(teamPerformance);
        
        venueStatsEl.innerHTML = `
            <div class="bg-white rounded-lg p-3 space-y-3">
                <!-- Venue Info -->
                <div class="text-center border-b pb-2">
                    <div class="font-bold text-gray-800">${venue.venue_name || 'Unknown Venue'}</div>
                    <div class="text-xs text-gray-600">${venue.location || ''}</div>
                </div>
                
                <!-- Pitch Analysis -->
                <div class="space-y-2">
                    <div class="text-center">
                        <div class="inline-block px-3 py-1 rounded-full border text-xs font-medium ${pitchColorClass}">
                            ${venue.pitch_type ? venue.pitch_type.toUpperCase() : 'NEUTRAL'} PITCH
                        </div>
                        <div class="text-xs text-gray-600 mt-1">${venue.pitch_rating || 'Balanced conditions'}</div>
                    </div>
                </div>
                
                <!-- Scoring Stats -->
                <div class="grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                        <div class="font-bold text-gray-700">${venue.avg_first_innings_score || 'N/A'}</div>
                        <div class="text-gray-600">1st Innings</div>
                    </div>
                    <div>
                        <div class="font-bold text-gray-700">${venue.avg_second_innings_score || 'N/A'}</div>
                        <div class="text-gray-600">2nd Innings</div>
                    </div>
                    <div>
                        <div class="font-bold text-gray-700">${venue.chase_success_rate || 0}%</div>
                        <div class="text-gray-600">Chase Success</div>
                    </div>
                </div>
                
                <!-- Team Records at Venue -->
                ${teamNames.length > 0 ? `
                <div class="border-t pt-2 space-y-1">
                    <div class="text-xs font-medium text-gray-700 text-center">Team Records at Venue</div>
                    ${teamNames.map(teamName => {
                        const team = teamPerformance[teamName];
                        return `
                        <div class="flex justify-between items-center text-xs">
                            <span class="text-gray-600">${teamName}</span>
                            <span class="font-mono font-medium">${team.record} (${team.win_percentage}%)</span>
                        </div>
                        `;
                    }).join('')}
                </div>
                ` : ''}
                
                <!-- Toss Decision -->
                <div class="text-center border-t pt-2">
                    <div class="text-xs text-gray-600">Toss Strategy</div>
                    <div class="font-medium text-sm ${venue.toss_decision_suggestion === 'bat first' ? 'text-blue-700' : 'text-green-700'}">
                        ${venue.toss_decision_suggestion ? venue.toss_decision_suggestion.toUpperCase() : 'FIELD FIRST'}
                    </div>
                </div>
                
                <!-- Match History -->
                <div class="text-center text-xs text-gray-500">
                    Based on ${venue.total_matches || 0} historical matches
                </div>
            </div>
        `;
    } else {
        venueStatsEl.innerHTML = '<div class="text-gray-500">No venue data available</div>';
    }
}

function displayTeamBalance(validatedPlayers) {
    const teamBalanceEl = document.getElementById('team-balance-content');
    
    // Analyze team composition using actual role data from validation (simplified: batsmen and bowlers only)
    const roleCategories = {
        batsmen: 0,
        bowlers: 0
    };
    
    const playersByRole = {
        batsmen: [],
        bowlers: []
    };
    
    validatedPlayers.forEach(player => {
        const role = player.role?.toLowerCase() || '';
        const playerName = player.validatedName;
        
        if (role.includes('bowler') || role.includes('bowling')) {
            roleCategories.bowlers++;
            playersByRole.bowlers.push(playerName);
        } else {
            // All other roles (batsman, all-rounder, wicket-keeper) grouped as batsmen
            roleCategories.batsmen++;
            playersByRole.batsmen.push(playerName);
        }
    });
    
    // Calculate balance score (simplified for batsmen and bowlers)
    const totalPlayers = validatedPlayers.length;
    const isBalanced = totalPlayers === 11 && 
                      roleCategories.batsmen >= 5 && 
                      roleCategories.bowlers >= 4;
    
    const balanceText = isBalanced ? 
        'Well-balanced team composition' : 
        `${totalPlayers}/11 players • Consider ${roleCategories.batsmen < 5 ? 'more batsmen' : 'more bowlers'}`;
    
    teamBalanceEl.innerHTML = `
        <div class="bg-white rounded-lg p-3 space-y-3">
            <!-- Role Distribution -->
            <div class="grid grid-cols-2 gap-4 text-center">
                <div class="p-3 bg-green-50 rounded-lg">
                    <div class="font-bold text-green-700 text-xl">${roleCategories.batsmen}</div>
                    <div class="text-sm text-green-600">Batsmen</div>
                </div>
                <div class="p-3 bg-red-50 rounded-lg">
                    <div class="font-bold text-red-700 text-xl">${roleCategories.bowlers}</div>
                    <div class="text-sm text-red-600">Bowlers</div>
                </div>
            </div>
            
            <!-- Balance Assessment -->
            <div class="text-center border-t pt-2">
                <div class="text-xs ${isBalanced ? 'text-green-600' : 'text-orange-600'} font-medium">
                    ${balanceText}
                </div>
            </div>
            
            <!-- Player Names by Role -->
            ${totalPlayers > 0 ? `
            <div class="border-t pt-2">
                <div class="text-xs font-medium text-gray-700 mb-2 text-center">Player Breakdown</div>
                <div class="grid grid-cols-2 gap-2 text-xs">
                    <div class="bg-green-50 p-2 rounded">
                        <div class="font-medium text-green-700 mb-1">Batsmen (${roleCategories.batsmen})</div>
                        <div class="text-green-600 text-xs">${playersByRole.batsmen.map(name => name.split(' ').pop()).join(', ')}</div>
                    </div>
                    <div class="bg-red-50 p-2 rounded">
                        <div class="font-medium text-red-700 mb-1">Bowlers (${roleCategories.bowlers})</div>
                        <div class="text-red-600 text-xs">${playersByRole.bowlers.map(name => name.split(' ').pop()).join(', ')}</div>
                    </div>
                </div>
            </div>
            ` : ''}
        </div>
    `;
}



function displaySummary(summary) {
    summaryText.innerHTML = summary; // Already formatted HTML from backend
}

function formatAnalysisText(text) {
    if (!text) return '<p class="text-gray-500">No analysis available</p>';
    
    // Convert newlines to HTML and format sections
    const lines = text.split('\n');
    let formattedHtml = '';
    
    for (let line of lines) {
        line = line.trim();
        if (!line) continue;
        
        // Format headers
        if (line.includes('**') || line.includes('##')) {
            const cleanLine = line.replace(/\*\*|##/g, '');
            formattedHtml += `<h3 class="font-semibold text-gray-900 mt-4 mb-2 first:mt-0">${cleanLine}</h3>`;
        }
        // Format bullet points
        else if (line.startsWith('- ') || line.startsWith('• ')) {
            formattedHtml += `<div class="ml-4 mb-1 text-gray-700">${line}</div>`;
        }
        // Format regular paragraphs
        else {
            formattedHtml += `<p class="mb-2 text-gray-700">${line}</p>`;
        }
    }
    
    return formattedHtml || '<p class="text-gray-500">No analysis content available</p>';
}

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
    }, 4000);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
} 