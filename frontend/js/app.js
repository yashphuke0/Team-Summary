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
        const summaryBtn = document.getElementById('summarize-btn'); // FIXED: was 'summary-btn'
        
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
        
        // Render all validation results (valid, invalid, missing, etc.)
        validationResult.validationResults.forEach((player, index) => {
            const playerDiv = document.createElement('div');
            
            if (player.isValid) {
                // Valid player (including auto-corrected)
                const isAutoReplaced = player.autoReplaced;
                const bgColor = isAutoReplaced ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200';
                const iconColor = isAutoReplaced ? 'text-blue-600' : 'text-green-600';
                const icon = isAutoReplaced ? '🔄' : '✅';
                const statusText = isAutoReplaced ? `${Math.round(player.confidence * 100)}% match` : 'Validated';
                
                playerDiv.innerHTML = `
                    <div class="flex items-center justify-between p-3 ${bgColor} border rounded-lg">
                        <div class="flex items-center">
                            <span class="${iconColor} mr-2">${icon}</span>
                            <div>
                                <span class="font-medium text-gray-900">${player.validatedName}</span>
                                <div class="text-xs text-gray-500">${player.role} • ${player.team}</div>
                                ${isAutoReplaced ? `<div class="text-xs ${iconColor} italic">Auto-corrected from "${player.inputName}"</div>` : ''}
                            </div>
                        </div>
                        <div class="text-xs ${iconColor} font-medium">${statusText}</div>
                    </div>
                `;
            } else if (player.isMissing) {
                // Missing player
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
                // Invalid player with suggestions
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
                            <button class="text-xs bg-blue-400 text-gray-900 px-2 py-1 rounded hover:bg-yellow-500 transition-colors player-select-btn"
                                    data-action="showPlayerSelectionModal" data-player-index="${index}" data-player-name="${player.inputName}">
                                Select from all
                            </button>
                        </div>
                        ${suggestionsHtml}
                    </div>
                `;
            }
            playersListDiv.appendChild(playerDiv);
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

        // After rendering, attach Add Player button event
        setTimeout(() => {
            const addPlayerBtn = document.querySelector('.add-player-btn');
            if (addPlayerBtn) {
                addPlayerBtn.addEventListener('click', () => {
                    // Find the missing player index (first missing)
                    const missingIndex = this.extractedTeamData.players.findIndex(p => !p);
                    this.showPlayerSelectionModal(missingIndex, '');
                });
            }
        }, 0);
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
        const summaryBtn = document.getElementById('summarize-btn'); // FIXED: was 'summary-btn'
        
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

    showAnalysisLoading(show) {
        const analysisContent = document.getElementById('analysis-content');
        const analysisLoading = document.getElementById('analysis-loading');
        if (show) {
            analysisContent.classList.add('hidden');
            analysisLoading.classList.remove('hidden');
        } else {
            analysisContent.classList.remove('hidden');
            analysisLoading.classList.add('hidden');
        }
    }

    showSummaryLoading(show) {
        const summaryLoading = document.getElementById('summary-loading');
        const summaryContent = document.getElementById('summary-content');
        if (show) {
            if (summaryLoading) summaryLoading.classList.remove('hidden');
            if (summaryContent) summaryContent.classList.add('hidden');
        } else {
            if (summaryLoading) summaryLoading.classList.add('hidden');
            if (summaryContent) summaryContent.classList.remove('hidden');
        }
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

    displaySummary(summary) {
        const summaryContent = document.getElementById('summary-content');
        const summaryText = document.getElementById('summary-text');
        
        // Format the summary text for better mobile display
        const formattedSummary = summary
            .replace(/\n\n/g, '</p><p class="mb-3">') // Replace double line breaks with paragraph breaks
            .replace(/\n/g, '<br>') // Replace single line breaks with <br>
            .replace(/•/g, '• ') // Ensure bullet points have space
            .replace(/(\d+\.\s*[🧠🎯🏟️🔍💡])/g, '<strong class="text-lg font-bold text-gray-900">$1</strong>') // Make section headers bold
            .replace(/([🧠🎯🏟️🔍💡])/g, '<span class="text-xl">$1</span>'); // Make emojis larger
        
        summaryText.innerHTML = `
            <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                <div class="prose prose-sm max-w-none">
                    <p class="mb-3 text-gray-800 leading-relaxed">${formattedSummary}</p>
                </div>
            </div>
        `;
        
        summaryContent.classList.remove('hidden');
    }

    async showPlayerSelectionModal(playerIndex, originalName) {
        
        // Store playerIndex and originalName for filtering
        this._lastPlayerIndex = playerIndex;
        this._lastOriginalName = originalName;

        // Get modal elements
        const modal = document.getElementById('player-selection-modal');
        const playersListDiv = document.getElementById('modal-players-list');
        const modalSubtitle = document.getElementById('modal-subtitle');
        const playerSearch = document.getElementById('player-search');
        const teamFilter = document.getElementById('team-filter');

        // Get selected teams
        const matchDetails = this.components.matchValidation.getCurrentMatchDetails();
        if (!matchDetails) {
            this.components.toast.showError('Please select teams and validate match first.');
            return;
        }
        const { teamA, teamB, matchDate } = matchDetails;
        

        // Show loading state in modal
        playersListDiv.innerHTML = '<div class="text-gray-500 text-center py-2">Loading players...</div>';
        if (modalSubtitle) modalSubtitle.textContent = `Loading players from ${teamA} and ${teamB}...`;
        modal.classList.remove('hidden');

        // Fetch eligible players from backend
        let eligiblePlayers = [];
        try {
            const response = await fetch(`${CONSTANTS.API_BASE_URL}/eligible-players`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teamA, teamB, matchDate })
            });
            const result = await response.json();
            
            if (result.success && Array.isArray(result.players)) {
                eligiblePlayers = result.players;
                this._lastEligiblePlayers = eligiblePlayers; // Store for filtering
            } else {
                playersListDiv.innerHTML = '<div class="text-red-500 text-center py-2">No players found.</div>';
                return;
            }
        } catch (err) {
            console.error('Error fetching eligible players:', err);
            playersListDiv.innerHTML = '<div class="text-red-500 text-center py-2">Failed to load players.</div>';
            return;
        }

        // Render player list
        const renderPlayersList = (list) => {
            playersListDiv.innerHTML = '';
            if (!list.length) {
                playersListDiv.innerHTML = '<div class="text-gray-500 text-center py-2">No players found</div>';
                return;
            }
            list.forEach((player) => {
                const div = document.createElement('div');
                div.className = 'cursor-pointer p-2 rounded hover:bg-blue-100 flex items-center justify-between';
                div.innerHTML = `<span>${player.player_name}</span><span class='text-xs text-gray-400'>${player.team_name}</span>`;
                div.addEventListener('click', () => {
                    // Replace missing player and re-validate
                    this.extractedTeamData.players[playerIndex] = player.player_name;
                    modal.classList.add('hidden');
                    this.validatePlayers(this.extractedTeamData.players);
                    this.components.toast.showSuccess(`Added ${player.player_name}`);
                });
                playersListDiv.appendChild(div);
            });
        };
        renderPlayersList(eligiblePlayers);

        // Set up search
        if (playerSearch) {
            playerSearch.value = '';
            playerSearch.oninput = (e) => {
                const val = e.target.value.toLowerCase();
                const searched = eligiblePlayers.filter(p => p.player_name.toLowerCase().includes(val));
                renderPlayersList(searched);
            };
        }

        // Set up team filter
        if (teamFilter) {
            teamFilter.innerHTML = `<option value=''>All Teams</option><option value='${teamA}'>${teamA}</option><option value='${teamB}'>${teamB}</option>`;
            teamFilter.value = '';
            teamFilter.onchange = (e) => {
                const val = e.target.value;
                const filtered = val ? eligiblePlayers.filter(p => p.team_name === val) : eligiblePlayers;
                renderPlayersList(filtered);
            };
        }

        // Set subtitle
        if (modalSubtitle) {
            modalSubtitle.textContent = `Choose from ${teamA} or ${teamB}`;
        }
    }

    // Filter players in the modal based on search and team filter
    filterModalPlayers() {
        const playersListDiv = document.getElementById('modal-players-list');
        const playerSearch = document.getElementById('player-search');
        const teamFilter = document.getElementById('team-filter');
        
        // Get eligible players from the last modal open (store on this object)
        const eligiblePlayers = this._lastEligiblePlayers || [];
        let filtered = eligiblePlayers;
        
        // Filter by search
        if (playerSearch && playerSearch.value) {
            const val = playerSearch.value.toLowerCase();
            filtered = filtered.filter(p => p.player_name.toLowerCase().includes(val));
        }
        // Filter by team
        if (teamFilter && teamFilter.value) {
            filtered = filtered.filter(p => p.team_name === teamFilter.value);
        }
        // Render
        playersListDiv.innerHTML = '';
        if (!filtered.length) {
            playersListDiv.innerHTML = '<div class="text-gray-500 text-center py-2">No players found</div>';
            return;
        }
        filtered.forEach((player) => {
            const div = document.createElement('div');
            div.className = 'cursor-pointer p-2 rounded hover:bg-blue-100 flex items-center justify-between';
            div.innerHTML = `<span>${player.player_name}</span><span class='text-xs text-gray-400'>${player.team_name}</span>`;
            div.addEventListener('click', () => {
                this.extractedTeamData.players[this._lastPlayerIndex] = player.player_name;
                const modal = document.getElementById('player-selection-modal');
                if (modal) modal.classList.add('hidden');
                this.validatePlayers(this.extractedTeamData.players);
                this.components.toast.showSuccess(`Added ${player.player_name}`);
            });
            playersListDiv.appendChild(div);
        });
    }

    // Hide the player selection modal
    hidePlayerSelectionModal() {
        const modal = document.getElementById('player-selection-modal');
        if (modal) modal.classList.add('hidden');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    window.cricketAnalyzerApp = new CricketAnalyzerApp();
});