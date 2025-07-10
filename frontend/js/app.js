// Main Application Class for Single Team Analysis
class CricketAnalyzerApp {
    constructor() {
        this.components = {};
        this.currentFile = null;
        this.extractedTeamData = null;
        this.playerValidationResults = null;
        
        // Initialize components
        this.initializeComponents();
        this.setupEventListeners();
    }

    initializeComponents() {
        // Initialize Toast notifications
        this.components.toast = new Toast();
        this.components.toast.initialize(
            'error-toast', 'error-message',
            'success-toast', 'success-message'
        );

        // Initialize Match Validation
        this.components.matchValidation = new MatchValidation(CONSTANTS.API_BASE_URL);
        this.components.matchValidation.initialize(
            'team-a', 'team-b', 'match-date', 'validate-match-btn'
        );

        // Initialize File Upload
        this.components.fileUpload = new FileUpload(CONSTANTS.FILE_UPLOAD_CONFIG);
        this.components.fileUpload.initialize('upload-area', 'file-input', 'preview-img');

        // Initialize Player Validation
        this.components.playerValidation = new PlayerValidation(CONSTANTS.API_BASE_URL);

        // Initialize Team Analysis
        this.components.teamAnalysis = new TeamAnalysis(CONSTANTS.API_BASE_URL);

        // Setup component callbacks
        this.setupComponentCallbacks();
    }

    setupComponentCallbacks() {
        // Match validation callbacks
        this.components.matchValidation.onValidationSuccess((matchDetails) => {
            this.components.toast.showSuccess(`Match validated successfully!`);
            this.showUploadSection();
        });

        this.components.matchValidation.onValidationError((message) => {
            this.components.toast.showError(message);
        });

        // File upload callbacks
        this.components.fileUpload.onFileSelect((file) => {
            this.handleFileUpload(file);
        });

        this.components.fileUpload.onValidationError((message) => {
            this.components.toast.showError(message);
        });

        // Player validation callbacks
        this.components.playerValidation.onValidationComplete((result) => {
            this.displayTeamDataWithValidation(result);
        });

        this.components.playerValidation.onPlayerReplace((playerIndex, newName) => {
            this.extractedTeamData.players[playerIndex] = newName;
            this.displayTeamDataWithValidation(this.playerValidationResults);
            this.components.toast.showSuccess(`Selected ${newName}`);
        });

        // Team analysis callbacks
        this.components.teamAnalysis.onAnalysisComplete((analysisData) => {
            this.displayAnalysisResults(analysisData);
            this.components.toast.showSuccess('Team analysis completed!');
        });

        this.components.teamAnalysis.onAnalysisError((error) => {
            this.components.toast.showError('Failed to analyze team. Please try again.');
        });
    }

    setupEventListeners() {
        // Remove image button
        const removeImageBtn = document.getElementById('remove-image');
        if (removeImageBtn) {
            removeImageBtn.addEventListener('click', () => this.removeImage());
        }

        // Captain and Vice-Captain selection
        const captainSelect = document.getElementById('captain-select');
        const viceCaptainSelect = document.getElementById('vice-captain-select');
        
        if (captainSelect) {
            captainSelect.addEventListener('change', () => this.handleCaptainSelection());
        }
        if (viceCaptainSelect) {
            viceCaptainSelect.addEventListener('change', () => this.handleViceCaptainSelection());
        }

        // Action buttons
        const analyzeBtn = document.getElementById('analyze-btn');
        const summaryBtn = document.getElementById('summary-btn');
        
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => this.analyzeTeam());
        }
        if (summaryBtn) {
            summaryBtn.addEventListener('click', () => this.generateTeamSummary());
        }

        // Player selection modal events
        const closeModal = document.getElementById('close-modal');
        const cancelSelection = document.getElementById('cancel-selection');
        const playerSearch = document.getElementById('player-search');
        const teamFilter = document.getElementById('team-filter');
        
        if (closeModal) closeModal.addEventListener('click', () => this.hidePlayerSelectionModal());
        if (cancelSelection) cancelSelection.addEventListener('click', () => this.hidePlayerSelectionModal());
        if (playerSearch) playerSearch.addEventListener('input', () => this.filterModalPlayers());
        if (teamFilter) teamFilter.addEventListener('change', () => this.filterModalPlayers());
        
        // Close modal when clicking outside
        const playerSelectionModal = document.getElementById('player-selection-modal');
        if (playerSelectionModal) {
            playerSelectionModal.addEventListener('click', (e) => {
                if (e.target === playerSelectionModal) {
                    this.hidePlayerSelectionModal();
                }
            });
        }

        // Set up global function for player validation component
        window.showPlayerSelectionModal = (playerIndex, originalName) => {
            this.showPlayerSelectionModal(playerIndex, originalName);
        };
    }

    showUploadSection() {
        const uploadSection = document.getElementById('upload-section');
        if (uploadSection) {
            uploadSection.classList.remove('hidden');
            uploadSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    async handleFileUpload(file) {
        // Check if match is validated first
        if (!this.components.matchValidation.isMatchValidated()) {
            this.components.toast.showError('Please validate the match details (teams and date) before uploading a screenshot. If the date or teams do not match, please correct them and validate again.');
            return;
        }

        try {
            this.components.fileUpload.showLoading(true);
            
            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch(`${CONSTANTS.API_BASE_URL}/ocr/process`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            this.components.fileUpload.showLoading(false);

            if (result.success) {
                this.extractedTeamData = result.data;
                this.components.toast.showSuccess(`✅ Extracted ${result.data.players.length} players from screenshot`);
                
                // Validate players against database
                await this.validatePlayers(result.data.players);
            } else {
                this.components.toast.showError(result.message || 'Failed to process image');
            }

        } catch (error) {
            console.error('Image processing error:', error);
            this.components.fileUpload.showLoading(false);
            this.components.toast.showError('Failed to process image. Please try again.');
        }
    }

    async validatePlayers(players) {
        // Block validation if match is not validated
        if (!this.components.matchValidation.isMatchValidated()) {
            this.components.toast.showError('Please validate the match details (teams and date) before proceeding. If the date or teams do not match, please correct them and validate again.');
            return;
        }
        const matchDetails = this.components.matchValidation.getCurrentMatchDetails();
        
        try {
            const result = await this.components.playerValidation.validatePlayers(
                players, 
                matchDetails.teamA, 
                matchDetails.teamB
            );
            
            this.playerValidationResults = result;
            this.displayTeamDataWithValidation(result);
        } catch (error) {
            this.components.toast.showError('Failed to validate players. Showing basic data.');
            this.displayTeamData(this.extractedTeamData);
        }
    }

    displayTeamDataWithValidation(validationResult) {
        const teamDataSection = document.getElementById('team-data');
        const playersListDiv = document.getElementById('players-list');
        const playerCountEl = document.getElementById('player-count');
        
        teamDataSection.classList.remove('hidden');
        
        const validPlayers = validationResult.validationResults.filter(p => p.isValid);
        const invalidPlayers = validationResult.validationResults.filter(p => !p.isValid && !p.isMissing);
        const missingPlayers = validationResult.validationResults.filter(p => p.isMissing);
        
        playerCountEl.textContent = `${validationResult.extractedPlayers || validationResult.totalPlayers}/11`;
        playersListDiv.innerHTML = '';
        
        // Render all validation results (invalid, missing, etc.)
        validationResult.validationResults.forEach((player, index) => {
            if (!player.isValid && !player.autoReplaced) {
                const playerDiv = document.createElement('div');
                // If player is missing, show Add Player button
                if (player.isMissing) {
                    playerDiv.innerHTML = `
                        <div class="p-3 bg-gray-100 border border-gray-300 rounded-lg border-dashed">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center">
                                    <span class="text-gray-400 mr-2">❌</span>
                                    <div>
                                        <span class="font-medium text-gray-600">Missing Player</span>
                                        <div class="text-xs text-gray-500">Not extracted from screenshot</div>
                                    </div>
                                </div>
                                <button class="text-xs bg-primary text-white px-2 py-1 rounded hover:bg-primary/80 transition-colors player-select-btn"
                                        data-action="showPlayerSelectionModal" data-player-index="${index}" data-player-name="Missing Player">
                                    Add Player
                                </button>
                            </div>
                        </div>
                    `;
                } else {
                    // For unmatched, show suggestions and a Select from all button
                    const suggestions = player.suggestions || [];
                    const suggestionsHtml = suggestions.length > 0 ? `
                        <div class="mt-3">
                            <div class="text-xs text-gray-600 mb-2 font-medium">Suggested players:</div>
                            <div class="space-y-1 max-h-32 overflow-y-auto">
                                ${suggestions.map(suggestion => `
                                    <button class="block w-full text-left p-2 bg-white border border-gray-200 rounded-lg text-xs hover:bg-gray-50 transition-colors player-suggestion-btn"
                                            data-action="replacePlayer"
                                            data-player-index="${index}"
                                            data-player-name="${suggestion.playerName}"
                                            data-player-id="${suggestion.playerId}"
                                            data-player-role="${suggestion.role}"
                                            data-player-team="${suggestion.team}">
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
                        <div class="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center">
                                    <span class="text-warning mr-2">⚠️</span>
                                    <div>
                                        <span class="font-medium text-gray-900">${player.inputName}</span>
                                        <div class="text-xs text-gray-500">Player not found</div>
                                    </div>
                                </div>
                                <button class="text-xs bg-secondary text-white px-2 py-1 rounded hover:bg-secondary/80 transition-colors player-select-btn"
                                        data-action="showPlayerSelectionModal" data-player-index="${index}" data-player-name="${player.inputName}">
                                    Select from all
                                </button>
                            </div>
                            ${suggestionsHtml}
                        </div>
                    `;
                }
                playersListDiv.appendChild(playerDiv);
            }
        });

        // If detected players < 11, add placeholder cards for each missing slot
        const totalDetected = validationResult.validationResults.length;
        if (totalDetected < 11) {
            for (let i = totalDetected; i < 11; i++) {
                const playerDiv = document.createElement('div');
                playerDiv.innerHTML = `
                    <div class="p-3 bg-gray-100 border border-gray-300 rounded-lg border-dashed">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center">
                                <span class="text-gray-400 mr-2">❌</span>
                                <div>
                                    <span class="font-medium text-gray-600">Missing Player</span>
                                    <div class="text-xs text-gray-500">Not extracted from screenshot</div>
                                </div>
                            </div>
                            <button class="text-xs bg-primary text-white px-2 py-1 rounded hover:bg-primary/80 transition-colors player-select-btn"
                                    data-action="showPlayerSelectionModal" data-player-index="${i}" data-player-name="Missing Player">
                                Add Player
                            </button>
                        </div>
                    </div>
                `;
                playersListDiv.appendChild(playerDiv);
            }
        }
        
        // Add delegated event listener for player select and suggestion buttons
        playersListDiv.removeEventListener('click', this._playerListClickHandler);
        this._playerListClickHandler = (event) => {
            const target = event.target.closest('button');
            if (!target) return;
            const action = target.getAttribute('data-action');
            if (!action) return;
            const playerIndex = parseInt(target.getAttribute('data-player-index'), 10);
            if (action === 'replacePlayer') {
                const name = target.getAttribute('data-player-name');
                const id = target.getAttribute('data-player-id');
                const role = target.getAttribute('data-player-role');
                const team = target.getAttribute('data-player-team');
                this.components.playerValidation.replacePlayer(playerIndex, name, id, role, team);
            } else if (action === 'showPlayerSelectionModal') {
                const name = target.getAttribute('data-player-name');
                this.components.playerValidation.showPlayerSelectionModal(playerIndex, name);
            }
        };
        playersListDiv.addEventListener('click', this._playerListClickHandler);
        
        this.populateCaptainDropdowns(validPlayers.map(p => p.validatedName));
        
        // Show validation summary
        const autoReplacedPlayers = validPlayers.filter(p => p.autoReplaced);
        let summaryMessage = '';
        
        if (validPlayers.length === 11) {
            summaryMessage = autoReplacedPlayers.length > 0 
                ? `✅ All 11 players validated! ${autoReplacedPlayers.length} auto-corrected.`
                : `✅ All 11 players validated successfully!`;
            this.components.toast.showSuccess(summaryMessage);
        } else {
            const issues = [];
            if (missingPlayers.length > 0) issues.push(`${missingPlayers.length} missing`);
            if (invalidPlayers.length > 0) issues.push(`${invalidPlayers.length} need correction`);
            
            summaryMessage = `${validPlayers.length}/11 players validated`;
            if (issues.length > 0) summaryMessage += ` (${issues.join(', ')})`;
            
            this.components.toast.showError(summaryMessage + '. Complete your team to continue.');
        }
    }

    displayTeamData(data) {
        const teamDataSection = document.getElementById('team-data');
        const playersListDiv = document.getElementById('players-list');
        const playerCountEl = document.getElementById('player-count');

        teamDataSection.classList.remove('hidden');
        playerCountEl.textContent = data.players.length;

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
        
        this.populateCaptainDropdowns(data.players);
    }

    populateCaptainDropdowns(players) {
        const captainSelect = document.getElementById('captain-select');
        const viceCaptainSelect = document.getElementById('vice-captain-select');

        captainSelect.innerHTML = '<option value="">Choose Captain</option>';
        viceCaptainSelect.innerHTML = '<option value="">Choose Vice-Captain</option>';

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

    handleCaptainSelection() {
        const captainSelect = document.getElementById('captain-select');
        const captainNameEl = document.getElementById('captain-name');
        
        const selectedCaptain = captainSelect.value;
        
        if (selectedCaptain) {
            captainNameEl.textContent = selectedCaptain;
            this.updateViceCaptainOptions();
        } else {
            captainNameEl.textContent = 'Not selected';
        }
        
        this.updateActionButtons();
    }

    handleViceCaptainSelection() {
        const viceCaptainSelect = document.getElementById('vice-captain-select');
        const viceCaptainNameEl = document.getElementById('vice-captain-name');
        
        const selectedVC = viceCaptainSelect.value;
        
        if (selectedVC) {
            viceCaptainNameEl.textContent = selectedVC;
            this.updateCaptainOptions();
        } else {
            viceCaptainNameEl.textContent = 'Not selected';
        }
        
        this.updateActionButtons();
    }

    updateCaptainOptions() {
        const viceCaptainSelect = document.getElementById('vice-captain-select');
        const captainSelect = document.getElementById('captain-select');
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

    updateViceCaptainOptions() {
        const captainSelect = document.getElementById('captain-select');
        const viceCaptainSelect = document.getElementById('vice-captain-select');
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

    updateActionButtons() {
        const captainSelect = document.getElementById('captain-select');
        const viceCaptainSelect = document.getElementById('vice-captain-select');
        const analyzeBtn = document.getElementById('analyze-btn');
        const summaryBtn = document.getElementById('summary-btn');
        
        const captain = captainSelect.value;
        const viceCaptain = viceCaptainSelect.value;
        const hasRequiredData = this.extractedTeamData && captain && viceCaptain && this.components.matchValidation.isMatchValidated();
        
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

    async analyzeTeam() {
        // Block analysis if match is not validated
        const captainSelect = document.getElementById('captain-select');
        const viceCaptainSelect = document.getElementById('vice-captain-select');
        if (!this.extractedTeamData || !captainSelect.value || !viceCaptainSelect.value || !this.components.matchValidation.isMatchValidated()) {
            this.components.toast.showError('Please complete team setup and validate the match details (teams and date) before analyzing. If the date or teams do not match, please correct them and validate again.');
            return;
        }

        try {
            this.showAnalysisLoading(true);
            const aiAnalysisSection = document.getElementById('ai-analysis');
            aiAnalysisSection.classList.remove('hidden');
            
            const matchDetails = this.components.matchValidation.getCurrentMatchDetails();
            const analysisData = {
                teamA: matchDetails.teamA,
                teamB: matchDetails.teamB,
                matchDate: matchDetails.matchDate,
                players: this.extractedTeamData.players,
                captain: captainSelect.value,
                viceCaptain: viceCaptainSelect.value
            };

            // Update team names in analysis sections
            document.getElementById('team-a-name').textContent = matchDetails.teamA;
            document.getElementById('team-b-name').textContent = matchDetails.teamB;
            document.getElementById('captain-performance-name').textContent = captainSelect.value;
            document.getElementById('vice-captain-performance-name').textContent = viceCaptainSelect.value;

            await this.components.teamAnalysis.analyzeTeam(analysisData);

        } catch (error) {
            console.error('Analysis error:', error);
            this.showAnalysisLoading(false);
            this.components.toast.showError('Failed to analyze team. Please try again.');
            document.getElementById('ai-analysis').classList.add('hidden');
        }
    }

    async generateTeamSummary() {
        // Block summary if match is not validated
        const captainSelect = document.getElementById('captain-select');
        const viceCaptainSelect = document.getElementById('vice-captain-select');
        if (!this.extractedTeamData || !captainSelect.value || !viceCaptainSelect.value || !this.components.matchValidation.isMatchValidated()) {
            this.components.toast.showError('Please complete team setup and validate the match details (teams and date) before generating summary. If the date or teams do not match, please correct them and validate again.');
            return;
        }

        try {
            this.showSummaryLoading(true);
            const teamSummarySection = document.getElementById('team-summary');
            teamSummarySection.classList.remove('hidden');
            
            const matchDetails = this.components.matchValidation.getCurrentMatchDetails();
            const summaryData = {
                teamA: matchDetails.teamA,
                teamB: matchDetails.teamB,
                matchDate: matchDetails.matchDate,
                players: this.extractedTeamData.players,
                captain: captainSelect.value,
                viceCaptain: viceCaptainSelect.value
            };

            const summary = await this.components.teamAnalysis.generateTeamSummary(summaryData);
            this.displaySummary(summary);
            this.showSummaryLoading(false);
            this.components.toast.showSuccess('⭐ Team summary generated!');

        } catch (error) {
            console.error('Summary error:', error);
            this.showSummaryLoading(false);
            this.components.toast.showError('Failed to generate team summary. Please try again.');
            document.getElementById('team-summary').classList.add('hidden');
        }
    }

    displayAnalysisResults(analysisData) {
        this.showAnalysisLoading(false);
        
        // Display team recent form
        const teamFormHtml = this.components.teamAnalysis.displayTeamRecentForm(analysisData.teamForm);
        document.getElementById('team-a-form').innerHTML = teamFormHtml.teamA;
        document.getElementById('team-b-form').innerHTML = teamFormHtml.teamB;

        // Display head-to-head
        document.getElementById('head-to-head-content').innerHTML = 
            this.components.teamAnalysis.displayHeadToHead(analysisData.headToHead);

        // Display player performance
        const playerPerformanceHtml = this.components.teamAnalysis.displayPlayerPerformance(analysisData.playerPerformance);
        document.getElementById('captain-performance').innerHTML = playerPerformanceHtml.captain;
        document.getElementById('vice-captain-performance').innerHTML = playerPerformanceHtml.viceCaptain;

        // Display venue stats
        document.getElementById('venue-stats-content').innerHTML = 
            this.components.teamAnalysis.displayVenueStats(analysisData.venueStats);

        // Display team balance
        const validatedPlayers = this.playerValidationResults?.validationResults?.filter(p => p.isValid) || [];
        this.displayTeamBalance(validatedPlayers);

        document.getElementById('analysis-content').classList.remove('hidden');
    }

    displayTeamBalance(validatedPlayers) {
        const teamBalanceEl = document.getElementById('team-balance-content');
        
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
                roleCategories.batsmen++;
                playersByRole.batsmen.push(playerName);
            }
        });
        
        const totalPlayers = validatedPlayers.length;
        const isBalanced = totalPlayers === 11 && 
                          roleCategories.batsmen >= 5 && 
                          roleCategories.bowlers >= 4;
        
        const balanceText = isBalanced ? 
            'Well-balanced team composition' : 
            `${totalPlayers}/11 players • Consider ${roleCategories.batsmen < 5 ? 'more batsmen' : 'more bowlers'}`;
        
        teamBalanceEl.innerHTML = `
            <div class="bg-white rounded-lg p-3 space-y-3">
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
                <div class="text-center border-t pt-2">
                    <div class="text-xs ${isBalanced ? 'text-green-600' : 'text-orange-600'} font-medium">
                        ${balanceText}
                    </div>
                </div>
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
}

document.addEventListener('DOMContentLoaded', function() {
    window.cricketAnalyzerApp = new CricketAnalyzerApp();
});