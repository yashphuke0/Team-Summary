// Main Application Class for Bulk Team Analysis
class BulkCricketAnalyzerApp {
    constructor() {
        this.components = {};
        this.currentTeams = [];
        this.currentMatchDetails = null;
        this.matchValidated = false;
        this.playerValidationResults = null;
        this.availablePlayers = [];
        this.currentPlayerIndex = null;
        this.currentTeamIndex = null;
        
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

        // Initialize Player Validation
        this.components.playerValidation = new PlayerValidation(CONSTANTS.API_BASE_URL);

        // Setup component callbacks
        this.setupComponentCallbacks();
    }

    setupComponentCallbacks() {
        // Match validation callbacks
        this.components.matchValidation.onValidationSuccess((matchDetails) => {
            this.matchValidated = true;
            this.currentMatchDetails = matchDetails;
            this.showUploadSection();
        });

        this.components.matchValidation.onValidationError((message) => {
            this.components.toast.showError(message);
        });

        // Player validation callbacks
        this.components.playerValidation.onValidationComplete((result) => {
            this.playerValidationResults = result;
            this.availablePlayers = result.availablePlayers || [];
            this.displayValidationResults();
        });

        this.components.playerValidation.onPlayerReplace((playerIndex, newName) => {
            this.updatePlayerInTeams(playerIndex, newName);
            this.refreshTeamValidationDisplay();
            this.components.toast.showSuccess(`Selected ${newName}`);
        });
    }

    setupEventListeners() {
        // Tab switching
        const csvTab = document.getElementById('csv-tab');
        const screenshotsTab = document.getElementById('screenshots-tab');
        
        if (csvTab) csvTab.addEventListener('click', () => this.switchTab('csv'));
        if (screenshotsTab) screenshotsTab.addEventListener('click', () => this.switchTab('screenshots'));

        // CSV upload events
        const csvUploadArea = document.getElementById('csv-upload-area');
        const csvInput = document.getElementById('csv-input');
        const downloadTemplateBtn = document.getElementById('download-template');
        
        if (csvUploadArea) {
            csvUploadArea.addEventListener('click', () => {
                if (this.matchValidated) {
                    csvInput.click();
                } else {
                    this.components.toast.showError('Please validate the match details (teams and date) first. If the date or teams do not match, please correct them and validate again.');
                }
            });
        }
        
        if (csvInput) csvInput.addEventListener('change', (e) => this.handleCSVUpload(e));
        if (downloadTemplateBtn) downloadTemplateBtn.addEventListener('click', () => this.downloadCSVTemplate());

        // Screenshots upload events
        const screenshotsUploadArea = document.getElementById('screenshots-upload-area');
        const screenshotsInput = document.getElementById('screenshots-input');
        
        if (screenshotsUploadArea) {
            screenshotsUploadArea.addEventListener('click', () => {
                if (this.matchValidated) {
                    screenshotsInput.click();
                } else {
                    this.components.toast.showError('Please validate the match details (teams and date) first. If the date or teams do not match, please correct them and validate again.');
                }
            });
        }
        
        if (screenshotsInput) screenshotsInput.addEventListener('change', (e) => this.handleScreenshotsUpload(e));

        // Player validation events
        const validateAllBtn = document.getElementById('validate-all-btn');
        if (validateAllBtn) validateAllBtn.addEventListener('click', () => this.validateAllPlayers());

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

        // Summary button event
        const summaryBtn = document.getElementById('summary-btn');
        if (summaryBtn) {
            summaryBtn.addEventListener('click', () => this.showSummary());
        }
    }

    switchTab(tabName) {
        const csvTab = document.getElementById('csv-tab');
        const screenshotsTab = document.getElementById('screenshots-tab');
        const csvSection = document.getElementById('csv-section');
        const screenshotsSection = document.getElementById('screenshots-section');
        
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

    showUploadSection() {
        const uploadSection = document.getElementById('upload-section');
        const validationNotice = document.getElementById('validation-notice');
        const screenshotsUploadArea = document.getElementById('screenshots-upload-area');
        
        uploadSection.classList.remove('hidden');
        validationNotice.classList.add('hidden');
        screenshotsUploadArea.classList.remove('opacity-50', 'pointer-events-none');
        
        uploadSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    async handleCSVUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!this.validateCSVFile(file)) {
            return;
        }

        if (!this.matchValidated) {
            this.components.toast.showError('Please validate the match details (teams and date) before uploading CSV. If the date or teams do not match, please correct them and validate again.');
            return;
        }

        try {
            this.showCSVLoading(true);
            
            const formData = new FormData();
            formData.append('csv', file);

            const response = await fetch(`${CONSTANTS.API_BASE_URL}/csv/process-teams`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.currentTeams = result.data.teams;
                this.displayTeamsSummary(result.data);
                this.components.toast.showSuccess(`Successfully processed ${result.data.totalTeams} teams from CSV`);
            } else {
                this.components.toast.showError(result.message || 'Failed to process CSV file');
            }
        } catch (error) {
            console.error('CSV upload error:', error);
            this.components.toast.showError('Failed to upload CSV file. Please try again.');
        } finally {
            this.showCSVLoading(false);
        }
    }

    validateCSVFile(file) {
        const maxSize = 1 * 1024 * 1024; // 1MB
        const allowedTypes = ['text/csv', 'application/csv'];

        if (!allowedTypes.includes(file.type) && !file.name.endsWith('.csv')) {
            this.components.toast.showError('Please upload a valid CSV file');
            return false;
        }

        if (file.size > maxSize) {
            this.components.toast.showError('File size must be less than 1MB');
            return false;
        }

        return true;
    }

    async handleScreenshotsUpload(e) {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        if (!this.validateScreenshots(files)) {
            return;
        }

        try {
            this.showScreenshotsLoading(true, files.length);
            
            const teams = [];
            const errors = [];
            
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                try {
                    this.updateScreenshotsProgress(i + 1, files.length, `Processing ${file.name}...`);
                    
                    const formData = new FormData();
                    formData.append('image', file);

                    const response = await fetch(`${CONSTANTS.API_BASE_URL}/ocr/process`, {
                        method: 'POST',
                        body: formData
                    });

                    const result = await response.json();

                    if (result.success && result.data) {
                        teams.push({
                            teamId: i + 1,
                            teamName: `Team ${i + 1}`,
                            players: result.data.players || [],
                            captain: result.data.captain || '',
                            vice_captain: result.data.viceCaptain || '',
                            source: file.name
                        });
                        
                        this.updateScreenshotsStatus(`Successfully processed ${file.name}`, `Extracted ${result.data.players?.length || 0} players`);
                    } else {
                        errors.push({
                            file: file.name,
                            error: result.message || 'Failed to extract team data'
                        });
                        
                        this.updateScreenshotsStatus(`Failed to process ${file.name}`, result.message || 'OCR extraction failed');
                    }
                } catch (error) {
                    console.error(`Error processing ${file.name}:`, error);
                    errors.push({
                        file: file.name,
                        error: error.message || 'Processing failed'
                    });
                    
                    this.updateScreenshotsStatus(`Error processing ${file.name}`, error.message || 'Network error');
                }
            }

            if (teams.length > 0) {
                this.currentTeams = teams;
                
                const summaryData = {
                    teams: teams,
                    summary: this.generateTeamsSummary(teams),
                    totalTeams: teams.length,
                    totalImages: files.length
                };
                
                this.displayTeamsSummary(summaryData);
                this.showScreenshotsPreview(files);
                
                const successMessage = errors.length > 0 
                    ? `Processed ${teams.length}/${files.length} screenshots successfully. ${errors.length} failed.`
                    : `Successfully processed all ${teams.length} screenshots!`;
                
                this.components.toast.showSuccess(successMessage);
                
                if (errors.length > 0) {
                    console.warn('Screenshot processing errors:', errors);
                }
            } else {
                this.components.toast.showError('Failed to extract team data from any screenshots. Please check image quality and try again.');
            }
        } catch (error) {
            console.error('Screenshots upload error:', error);
            this.components.toast.showError('Failed to upload screenshots. Please try again.');
        } finally {
            this.showScreenshotsLoading(false);
        }
    }

    validateScreenshots(files) {
        const maxFiles = 10;
        const maxSize = 5 * 1024 * 1024; // 5MB per file
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];

        if (files.length > maxFiles) {
            this.components.toast.showError(`Maximum ${maxFiles} screenshots allowed`);
            return false;
        }

        for (let file of files) {
            if (!allowedTypes.includes(file.type)) {
                this.components.toast.showError('Please upload valid image files (JPG, PNG)');
                return false;
            }

            if (file.size > maxSize) {
                this.components.toast.showError(`File ${file.name} is too large (max 5MB)`);
                return false;
            }
        }

        return true;
    }

    generateTeamsSummary(teams) {
        const totalPlayers = teams.reduce((sum, team) => sum + team.players.length, 0);
        const allPlayers = [];
        teams.forEach(team => {
            team.players.forEach(player => {
                allPlayers.push(player);
            });
        });
        
        const uniquePlayers = [...new Set(allPlayers)].length;
        const avgPlayersPerTeam = Math.round((totalPlayers / teams.length) * 10) / 10;
        
        const playerCounts = {};
        allPlayers.forEach(player => {
            playerCounts[player] = (playerCounts[player] || 0) + 1;
        });
        
        const mostCommonPlayers = Object.entries(playerCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([player, count]) => ({ player, count }));
        
        return {
            totalTeams: teams.length,
            totalPlayers,
            uniquePlayers,
            avgPlayersPerTeam,
            mostCommonPlayers
        };
    }

    displayTeamsSummary(data) {
        const summary = data.summary;
        this.currentTeams = data.teams;
        
        const teamsSummarySection = document.getElementById('teams-summary');
        const summaryContent = document.getElementById('summary-content');
        
        teamsSummarySection.classList.remove('hidden');
        document.getElementById('teams-count').textContent = summary.totalTeams;
        
        summaryContent.innerHTML = `
            <div class="bg-blue-50 p-4 rounded-lg text-center mb-4">
                <div class="text-lg font-medium text-blue-700">Teams Uploaded Successfully!</div>
                <div class="text-sm text-blue-600">Starting player validation...</div>
            </div>
            
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
        
        setTimeout(() => {
            this.validateAllPlayers();
        }, 1000);
    }

    async validateAllPlayers() {
        if (!this.currentTeams || this.currentTeams.length === 0) {
            this.components.toast.showError('No teams to validate');
            return;
        }

        // Block validation if match is not validated
        if (!this.components.matchValidation.isMatchValidated()) {
            this.components.toast.showError('Please validate the match details (teams and date) before proceeding. If the date or teams do not match, please correct them and validate again.');
            return;
        }

        try {
            this.showValidationLoading(true);
            const playerValidationSection = document.getElementById('player-validation-section');
            playerValidationSection.classList.remove('hidden');
            
            const matchDetails = this.components.matchValidation.getCurrentMatchDetails();
            
            const allPlayers = [];
            this.currentTeams.forEach((team, teamIndex) => {
                if (team.players && Array.isArray(team.players)) {
                    team.players.forEach((player, playerIndex) => {
                        if (player && player.trim()) {
                            allPlayers.push({
                                player: player.trim(),
                                teamIndex: teamIndex,
                                playerIndex: playerIndex
                            });
                        }
                    });
                }
            });

            if (allPlayers.length === 0) {
                this.showValidationLoading(false);
                this.components.toast.showError('No valid players found in teams');
                return;
            }

            const result = await this.components.playerValidation.validatePlayers(
                allPlayers.map(p => p.player), 
                matchDetails.teamA, 
                matchDetails.teamB
            );
            
            this.showValidationLoading(false);
            this.displayValidationResults(allPlayers, result);

        } catch (error) {
            console.error('Player validation error:', error);
            this.showValidationLoading(false);
            this.components.toast.showError('Failed to validate players. Showing basic validation.');
            
            const allPlayers = this.currentTeams.flatMap((team, teamIndex) => 
                (team.players || []).map((player, playerIndex) => ({
                    player: player,
                    teamIndex: teamIndex,
                    playerIndex: playerIndex
                }))
            );
            this.displayBasicValidationResults(allPlayers);
        }
    }

    displayValidationResults(allPlayers, validationResult) {
        // Use stored validation results if no parameters provided
        if (!validationResult && this.playerValidationResults) {
            validationResult = this.playerValidationResults;
        }
        
        if (!validationResult || !validationResult.validationResults) {
            console.error('No validation results available');
            this.components.toast.showError('Validation results not available');
            return;
        }
        
        const validPlayers = validationResult.validationResults.filter(p => p.isValid);
        const invalidPlayers = validationResult.validationResults.filter(p => !p.isValid && !p.isMissing);
        const missingPlayers = validationResult.validationResults.filter(p => p.isMissing);
        
        const teamTabs = this.currentTeams.map((team, index) => {
            return `
                <button onclick="bulkApp.showTeamValidation(${index})" 
                        class="team-tab px-4 py-2 rounded-lg font-medium transition-colors ${index === 0 ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
                        id="team-tab-${index}">
                    Team ${index + 1} (${team.players ? team.players.length : 0} players)
                </button>
            `;
        }).join('');
        
        const validationResults = document.getElementById('validation-results');
        validationResults.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div class="bg-green-50 p-4 rounded-lg text-center">
                    <div class="text-2xl font-bold text-green-600">${validPlayers.length}</div>
                    <div class="text-sm text-green-700">Valid Players</div>
                </div>
                <div class="bg-yellow-50 p-4 rounded-lg text-center">
                    <div class="text-2xl font-bold text-yellow-600">${invalidPlayers.length}</div>
                    <div class="text-sm text-yellow-700">Need Correction</div>
                </div>
                <div class="bg-red-50 p-4 rounded-lg text-center">
                    <div class="text-2xl font-bold text-red-600">${missingPlayers.length}</div>
                    <div class="text-sm text-red-700">Missing Players</div>
                </div>
            </div>
            
            <div class="mb-6">
                <h4 class="font-medium text-gray-900 mb-3">Validate Players by Team</h4>
                <div class="flex flex-wrap gap-2 mb-4">
                    ${teamTabs}
                </div>
                
                <div id="team-validation-content">
                    ${this.createTeamValidationContent(0)}
                </div>
            </div>
        `;
        
        const totalPlayers = validationResult.totalPlayers || validationResult.validationResults.length;
        
        if (validPlayers.length === totalPlayers) {
            document.getElementById('validation-success').classList.remove('hidden');
            this.components.toast.showSuccess(`✅ All ${validPlayers.length} players validated successfully!`);
            
            setTimeout(() => {
                this.displayFinalTeamSummary();
            }, 2000);
        } else {
            const issues = [];
            if (missingPlayers.length > 0) issues.push(`${missingPlayers.length} missing`);
            if (invalidPlayers.length > 0) issues.push(`${invalidPlayers.length} need correction`);
            
            this.components.toast.showError(`${validPlayers.length}/${totalPlayers} players validated (${issues.join(', ')})`);
        }
    }

    createTeamValidationContent(teamIndex) {
        if (!this.currentTeams[teamIndex]) {
            return '<div class="text-gray-500">No team data available</div>';
        }
        
        const team = this.currentTeams[teamIndex];
        const players = team.players || [];
        
        const teamValidationResults = [];
        let globalIndex = 0;
        
        for (let i = 0; i < teamIndex; i++) {
            globalIndex += (this.currentTeams[i].players || []).length;
        }
        
        for (let i = 0; i < players.length; i++) {
            const validationIndex = globalIndex + i;
            if (this.playerValidationResults && this.playerValidationResults.validationResults && 
                this.playerValidationResults.validationResults[validationIndex]) {
                teamValidationResults.push({
                    player: players[i],
                    validation: this.playerValidationResults.validationResults[validationIndex],
                    globalIndex: validationIndex,
                    teamIndex: teamIndex,
                    playerIndex: i
                });
            } else {
                teamValidationResults.push({
                    player: players[i],
                    validation: {
                        inputName: players[i],
                        validatedName: null,
                        isValid: false,
                        isMissing: false,
                        suggestions: []
                    },
                    globalIndex: validationIndex,
                    teamIndex: teamIndex,
                    playerIndex: i
                });
            }
        }
        
        const filteredResults = teamValidationResults.filter(p => !p.validation.isValid && !p.validation.autoReplaced);
        
        const validCount = teamValidationResults.filter(p => p.validation.isValid).length;
        const invalidCount = filteredResults.length;
        const missingCount = teamValidationResults.filter(p => p.validation.isMissing).length;
        
        return `
            <div class="bg-white border border-gray-200 rounded-lg p-4">
                <div class="flex items-center justify-between mb-4">
                    <h5 class="font-medium text-gray-900">Team ${teamIndex + 1} Players</h5>
                    <div class="flex gap-2 text-sm">
                        <span class="bg-green-100 text-green-700 px-2 py-1 rounded">${validCount} Valid</span>
                        <span class="bg-yellow-100 text-yellow-700 px-2 py-1 rounded">${invalidCount} Need Fix</span>
                        <span class="bg-red-100 text-red-700 px-2 py-1 rounded">${missingCount} Missing</span>
                    </div>
                </div>
                
                <div class="space-y-3">
                    ${filteredResults.length === 0 ? `<div class='text-center text-green-600 font-medium'>No players need correction!</div>` :
                        filteredResults.map((playerData, index) => {
                            return this.createTeamPlayerCard(playerData, index);
                        }).join('')
                    }
                </div>
            </div>
        `;
    }

    createTeamPlayerCard(playerData, index) {
        const { player, validation, globalIndex, teamIndex, playerIndex } = playerData;
        
        if (validation.isValid) {
            const isAutoReplaced = validation.autoReplaced;
            const bgColor = isAutoReplaced ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200';
            const iconColor = isAutoReplaced ? 'text-blue-600' : 'text-green-600';
            const icon = isAutoReplaced ? '🔄' : '✅';
            const statusText = isAutoReplaced ? `${Math.round(validation.confidence * 100)}% match` : 'Validated';
            
            return `
                <div class="flex items-center justify-between p-3 ${bgColor} border rounded-lg">
                    <div class="flex items-center">
                        <span class="${iconColor} mr-3">${icon}</span>
                        <div>
                            <span class="font-medium text-gray-900">${validation.validatedName || player}</span>
                            <div class="text-xs text-gray-500">${validation.role || 'Unknown'} • ${validation.team || 'Unknown'}</div>
                            ${isAutoReplaced ? `<div class="text-xs ${iconColor} italic">Auto-corrected from "${validation.inputName}"</div>` : ''}
                        </div>
                    </div>
                    <div class="text-xs ${iconColor} font-medium">${statusText}</div>
                </div>
            `;
        } else if (validation.isMissing) {
            return `
                <div class="p-3 bg-gray-100 border border-gray-300 rounded-lg border-dashed">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center">
                            <span class="text-gray-400 mr-3">❌</span>
                            <div>
                                <span class="font-medium text-gray-600">${validation.inputName || player}</span>
                                <div class="text-xs text-gray-500">Not extracted from screenshot</div>
                            </div>
                        </div>
                        <button onclick="bulkApp.showCustomNameInput(${globalIndex})" class="text-xs bg-primary text-white px-2 py-1 rounded hover:bg-primary/80 transition-colors">
                            Add Player
                        </button>
                    </div>
                </div>
            `;
        } else {
            const hasSuggestions = validation.suggestions && validation.suggestions.length > 0;
            const suggestionsHtml = hasSuggestions ? `
                <div class="mt-3">
                    <div class="text-xs text-gray-600 mb-2 font-medium">Suggested players:</div>
                    <div class="space-y-1 max-h-32 overflow-y-auto">
                        ${validation.suggestions.map(suggestion => `
                            <button onclick="bulkApp.replacePlayer(${globalIndex}, '${suggestion.playerName}', ${suggestion.playerId}, '${suggestion.role}', '${suggestion.team}')" 
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
            
            return `
                <div class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center">
                            <span class="text-yellow-600 mr-3">⚠️</span>
                            <div>
                                <span class="font-medium text-gray-900">${validation.inputName || player}</span>
                                <div class="text-xs text-gray-500">Player not found</div>
                            </div>
                        </div>
                        <button onclick="bulkApp.showCustomNameInput(${globalIndex})" class="text-xs bg-yellow-500 text-gray-900 px-2 py-1 rounded border border-gray-300 hover:bg-yellow-600 transition-colors">
                            Select
                        </button>
                    </div>
                    ${suggestionsHtml}
                </div>
            `;
        }
    }

    showTeamValidation(teamIndex) {
        document.querySelectorAll('.team-tab').forEach((tab, index) => {
            if (index === teamIndex) {
                tab.classList.remove('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
                tab.classList.add('bg-primary', 'text-white');
            } else {
                tab.classList.remove('bg-primary', 'text-white');
                tab.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
            }
        });
        
        const content = this.createTeamValidationContent(teamIndex);
        document.getElementById('team-validation-content').innerHTML = content;
    }

    replacePlayer(playerIndex, newName, playerId, role, team) {
        this.components.playerValidation.replacePlayer(playerIndex, newName, playerId, role, team);
    }

    showCustomNameInput(playerIndex) {
        this.currentPlayerIndex = playerIndex;
        const originalName = this.playerValidationResults.validationResults[playerIndex].inputName;
        
        const modalSubtitle = document.getElementById('modal-subtitle');
        modalSubtitle.textContent = `Select player for: "${originalName}"`;
        this.populateTeamFilter();
        
        const playerSearch = document.getElementById('player-search');
        playerSearch.value = '';
        this.filterModalPlayers();
        
        const playerSelectionModal = document.getElementById('player-selection-modal');
        playerSelectionModal.classList.remove('hidden');
        document.body.classList.add('modal-open');
        setTimeout(() => playerSearch.focus(), 100);
    }

    populateTeamFilter() {
        const teamFilter = document.getElementById('team-filter');
        teamFilter.innerHTML = '<option value="">All Teams</option>';
        
        const teams = [...new Set(this.availablePlayers.map(p => p.team_name))].sort();
        
        teams.forEach(team => {
            const option = document.createElement('option');
            option.value = team;
            option.textContent = team;
            teamFilter.appendChild(option);
        });
    }

    filterModalPlayers() {
        const searchTerm = document.getElementById('player-search').value.toLowerCase();
        const selectedTeam = document.getElementById('team-filter').value;
        
        let filteredPlayers = this.availablePlayers;
        
        if (selectedTeam) {
            filteredPlayers = filteredPlayers.filter(p => p.team_name === selectedTeam);
        }
        
        if (searchTerm) {
            filteredPlayers = filteredPlayers.filter(p => 
                p.player_name.toLowerCase().includes(searchTerm)
            );
        }
        
        this.displayModalPlayers(filteredPlayers);
    }

    displayModalPlayers(players) {
        const modalPlayersList = document.getElementById('modal-players-list');
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
                this.selectModalPlayer(player);
            });
            
            modalPlayersList.appendChild(playerDiv);
        });
    }

    selectModalPlayer(player) {
        this.components.playerValidation.selectPlayerFromModal(player);
        this.hidePlayerSelectionModal();
    }

    hidePlayerSelectionModal() {
        const playerSelectionModal = document.getElementById('player-selection-modal');
        playerSelectionModal.classList.add('hidden');
        document.body.classList.remove('modal-open');
        this.currentPlayerIndex = null;
    }

    updatePlayerInTeams(playerIndex, newName) {
        const playerData = this.getPlayerDataByIndex(playerIndex);
        if (playerData) {
            this.currentTeams[playerData.teamIndex].players[playerData.playerIndex] = newName;
        }
    }

    getPlayerDataByIndex(index) {
        let currentIndex = 0;
        for (let teamIndex = 0; teamIndex < this.currentTeams.length; teamIndex++) {
            for (let playerIndex = 0; playerIndex < this.currentTeams[teamIndex].players.length; playerIndex++) {
                if (currentIndex === index) {
                    return { teamIndex, playerIndex };
                }
                currentIndex++;
            }
        }
        return null;
    }

    refreshTeamValidationDisplay() {
        const currentTeamTab = document.querySelector('.team-tab.bg-primary');
        if (currentTeamTab) {
            const teamIndex = parseInt(currentTeamTab.id.replace('team-tab-', ''));
            document.getElementById('team-validation-content').innerHTML = this.createTeamValidationContent(teamIndex);
        }
    }

    displayBasicValidationResults(allPlayers) {
        const validationResults = document.getElementById('validation-results');
        validationResults.innerHTML = `
            <div class="bg-yellow-50 p-4 rounded-lg text-center mb-6">
                <div class="text-yellow-600 font-medium">Basic Validation Mode</div>
                <div class="text-sm text-yellow-700">Database validation unavailable - showing all players</div>
            </div>
            
            <div class="mb-4">
                <h4 class="font-medium text-gray-900 mb-3">All Players (Basic Mode)</h4>
                <div class="space-y-4">
                    ${allPlayers.map((playerData, index) => {
                        return this.createBasicPlayerCard(playerData, index);
                    }).join('')}
                </div>
            </div>
        `;
        
        this.components.toast.showSuccess(`✅ Basic validation complete for ${allPlayers.length} players`);
        
        setTimeout(() => {
            this.displayFinalTeamSummary();
        }, 2000);
    }

    createBasicPlayerCard(playerData, index) {
        const { player, teamIndex } = playerData;
        
        return `
            <div class="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div class="flex items-center">
                    <span class="text-gray-400 mr-3">👤</span>
                    <div>
                        <span class="font-medium text-gray-900">${player}</span>
                        <div class="text-xs text-gray-500">Team ${teamIndex + 1}</div>
                    </div>
                </div>
                <div class="text-xs text-gray-500">Basic validation</div>
            </div>
        `;
    }

    displayFinalTeamSummary() {
        const playerValidationSection = document.getElementById('player-validation-section');
        playerValidationSection.classList.add('hidden');
        
        const validatedTeams = this.currentTeams.map((team, teamIndex) => {
            const validatedPlayers = team.players.map((player, playerIndex) => {
                const globalIndex = this.getGlobalPlayerIndex(teamIndex, playerIndex);
                const validation = this.playerValidationResults.validationResults[globalIndex];
                return validation && validation.isValid ? validation.validatedName : player;
            });
            
            return {
                ...team,
                players: validatedPlayers
            };
        });
        
        const allValidatedPlayers = validatedTeams.flatMap(team => team.players);
        const uniqueValidatedPlayers = [...new Set(allValidatedPlayers)];
        
        const playerCounts = {};
        allValidatedPlayers.forEach(player => {
            playerCounts[player] = (playerCounts[player] || 0) + 1;
        });
        
        const mostCommonValidatedPlayers = Object.entries(playerCounts)
            .map(([player, count]) => ({ player, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 6);
        
        const summaryContent = document.getElementById('summary-content');
        summaryContent.innerHTML = `
            <div class="bg-green-50 p-4 rounded-lg text-center mb-4">
                <div class="text-lg font-medium text-green-700">✅ All Players Validated!</div>
                <div class="text-sm text-green-600">Teams ready for analysis with correct player names</div>
            </div>
            
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="bg-blue-50 p-4 rounded-lg text-center">
                    <div class="text-2xl font-bold text-blue-600">${validatedTeams.length}</div>
                    <div class="text-sm text-blue-700">Total Teams</div>
                </div>
                <div class="bg-green-50 p-4 rounded-lg text-center">
                    <div class="text-2xl font-bold text-green-600">${allValidatedPlayers.length}</div>
                    <div class="text-sm text-green-700">Total Players</div>
                </div>
                <div class="bg-purple-50 p-4 rounded-lg text-center">
                    <div class="text-2xl font-bold text-purple-600">${uniqueValidatedPlayers.length}</div>
                    <div class="text-sm text-purple-700">Unique Players</div>
                </div>
                <div class="bg-orange-50 p-4 rounded-lg text-center">
                    <div class="text-2xl font-bold text-orange-600">${Math.round(allValidatedPlayers.length / validatedTeams.length)}</div>
                    <div class="text-sm text-orange-700">Avg per Team</div>
                </div>
            </div>
            
            <div class="mt-6">
                <h4 class="font-medium text-gray-900 mb-3">Most Common Players (Validated)</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    ${mostCommonValidatedPlayers.map(player => `
                        <div class="bg-gray-50 p-3 rounded-lg">
                            <div class="font-medium text-gray-900">${player.player}</div>
                            <div class="text-sm text-gray-600">Selected in ${player.count} teams</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="mt-6">
                <h4 class="font-medium text-gray-900 mb-3">Team Breakdown</h4>
                <div class="space-y-3">
                    ${validatedTeams.map((team, index) => `
                        <div class="bg-white border border-gray-200 rounded-lg p-4">
                            <div class="flex items-center justify-between mb-2">
                                <h5 class="font-medium text-gray-900">Team ${index + 1}</h5>
                                <span class="text-sm text-gray-500">${team.players.length} players</span>
                            </div>
                            <div class="text-sm text-gray-600">
                                ${team.players.join(', ')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        this.components.toast.showSuccess('🎉 Team summary updated with validated player names!');
    }

    getGlobalPlayerIndex(teamIndex, playerIndex) {
        let globalIndex = 0;
        for (let i = 0; i < teamIndex; i++) {
            globalIndex += this.currentTeams[i].players.length;
        }
        return globalIndex + playerIndex;
    }

    // Loading state methods
    showCSVLoading(show) {
        const csvLoading = document.getElementById('csv-loading');
        const csvUploadContent = document.getElementById('csv-upload-content');
        
        if (show) {
            csvLoading.classList.remove('hidden');
            csvUploadContent.classList.add('hidden');
        } else {
            csvLoading.classList.add('hidden');
            csvUploadContent.classList.remove('hidden');
        }
    }

    showScreenshotsLoading(show, totalFiles = 0) {
        const screenshotsLoading = document.getElementById('screenshots-loading');
        const screenshotsUploadContent = document.getElementById('screenshots-upload-content');
        
        if (show) {
            screenshotsLoading.classList.remove('hidden');
            screenshotsUploadContent.classList.add('hidden');
            if (totalFiles > 0) {
                document.getElementById('screenshots-progress-count').textContent = `0/${totalFiles}`;
                document.getElementById('screenshots-progress-bar').style.width = '0%';
                document.getElementById('screenshots-progress-text').textContent = 'Starting...';
                document.getElementById('screenshots-status-main').textContent = 'Initializing...';
                document.getElementById('screenshots-status-sub').textContent = '';
            }
        } else {
            screenshotsLoading.classList.add('hidden');
            screenshotsUploadContent.classList.remove('hidden');
        }
    }

    showValidationLoading(show) {
        const validationResults = document.getElementById('validation-results');
        const validationLoading = document.getElementById('validation-loading');
        
        if (show) {
            validationResults.classList.add('hidden');
            validationLoading.classList.remove('hidden');
        } else {
            validationResults.classList.remove('hidden');
            validationLoading.classList.add('hidden');
        }
    }

    updateScreenshotsProgress(current, total, text) {
        const percentage = (current / total) * 100;
        document.getElementById('screenshots-progress-count').textContent = `${current}/${total}`;
        document.getElementById('screenshots-progress-bar').style.width = `${percentage}%`;
        document.getElementById('screenshots-progress-text').textContent = text;
    }

    updateScreenshotsStatus(mainText, subText) {
        document.getElementById('screenshots-status-main').textContent = mainText;
        document.getElementById('screenshots-status-sub').textContent = subText;
    }

    showScreenshotsPreview(files) {
        const screenshotsGrid = document.getElementById('screenshots-grid');
        screenshotsGrid.innerHTML = '';
        
        files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
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
        
        document.getElementById('screenshots-preview').classList.remove('hidden');
    }

    createCSVTemplate() {
        const template = `TeamName,Players,Captain,ViceCaptain
Team 1,"Virat Kohli, Rohit Sharma, MS Dhoni, Jasprit Bumrah, Ravindra Jadeja, Hardik Pandya, KL Rahul, Yuzvendra Chahal, Andre Russell, Jos Buttler, Rashid Khan",Virat Kohli,Rohit Sharma
Team 2,"Rohit Sharma, Virat Kohli, MS Dhoni, Jasprit Bumrah, Ravindra Jadeja, Hardik Pandya, KL Rahul, Yuzvendra Chahal, Andre Russell, Jos Buttler, Rashid Khan",Rohit Sharma,Virat Kohli`;
        
        window.csvTemplate = template;
    }

    downloadCSVTemplate() {
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

    async showSummary() {
        if (!this.currentTeams || this.currentTeams.length === 0) {
            this.components.toast.showError('No teams to summarize.');
            return;
        }

        if (!this.components.matchValidation.isMatchValidated()) {
            this.components.toast.showError('Please validate the match details (teams and date) before summarizing.');
            return;
        }

        try {
            this.showValidationLoading(true);
            const matchDetails = this.components.matchValidation.getCurrentMatchDetails();

            const summaryData = {
                teams: this.currentTeams,
                matchDetails: matchDetails
            };

            const response = await fetch(`${CONSTANTS.API_BASE_URL}/summary/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(summaryData)
            });

            const result = await response.json();

            if (result.success) {
                this.displayTeamsSummary(result.data);
                this.components.toast.showSuccess(`✅ Summary generated for ${result.data.totalTeams} teams!`);
            } else {
                this.components.toast.showError(result.message || 'Failed to generate summary.');
            }
        } catch (error) {
            console.error('Summary error:', error);
            this.components.toast.showError('Failed to generate summary. Please try again.');
        } finally {
            this.showValidationLoading(false);
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.bulkApp = new BulkCricketAnalyzerApp();
    window.bulkApp.createCSVTemplate();
});

// Global functions for backward compatibility
window.showError = function(message) {
    if (window.bulkApp) {
        window.bulkApp.components.toast.showError(message);
    }
};

window.showSuccess = function(message) {
    if (window.bulkApp) {
        window.bulkApp.components.toast.showSuccess(message);
    }
}; 