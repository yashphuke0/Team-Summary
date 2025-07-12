// Team Analysis Page JavaScript
class TeamAnalysisPage {
    constructor() {
        this.apiBaseUrl = API_BASE_URL;
        this.playerValidation = new PlayerValidation(this.apiBaseUrl);
        this.teamAnalysis = new TeamAnalysis(this.apiBaseUrl);
        this.toast = new Toast();
        
        // Initialize Toast
        this.toast.initialize(
            'error-toast', 'error-message',
            'success-toast', 'success-message'
        );
        
        // Store data for player validation
        this.extractedTeamData = null;
        this.playerValidationResults = null;
        this._lastPlayerIndex = null;
        this._lastOriginalName = null;
        this._lastEligiblePlayers = [];
        
        this.initializeEventListeners();
        this.loadTeamData();
    }

    initializeEventListeners() {
        // Captain and Vice-Captain selection
        document.getElementById('captain-select').addEventListener('change', (e) => {
            this.updateCaptainDisplay(e.target.value);
        });

        document.getElementById('vice-captain-select').addEventListener('change', (e) => {
            this.updateViceCaptainDisplay(e.target.value);
        });

        // Validate players button
        document.getElementById('validate-players-btn').addEventListener('click', () => {
            this.validateAllPlayers();
        });

        // Analysis buttons
        document.getElementById('analyze-btn').addEventListener('click', () => {
            this.analyzeTeam();
        });

        document.getElementById('summarize-btn').addEventListener('click', () => {
            this.generateSummary();
        });

        // Player selection modal events
        this.initializeModalEvents();
    }

    loadTeamData() {
        try {
            // Load team data from localStorage
            const teamData = JSON.parse(sessionStorage.getItem('teamData'));
            const matchData = JSON.parse(sessionStorage.getItem('matchData'));
            const validationResults = JSON.parse(sessionStorage.getItem('playerValidationResults'));
            
            if (!teamData || !matchData) {
                this.toast.showError('No team data found. Please go back and upload a team screenshot.');
                return;
            }

            this.extractedTeamData = teamData;
            this.playerValidationResults = validationResults;

            // Display players with validation results
            if (validationResults) {
                this.displayTeamDataWithValidation(validationResults);
                // Hide validate button if already validated
                const validateBtn = document.getElementById('validate-players-btn');
                if (validateBtn) {
                    validateBtn.style.display = 'none';
                }
            } else {
                this.displayPlayers(teamData.players);
                // Show validate button if not validated
                const validateBtn = document.getElementById('validate-players-btn');
                if (validateBtn) {
                    validateBtn.style.display = 'block';
                }
                // Automatically trigger validation
                this.validateAllPlayers();
            }
            
            // Populate captain/vice-captain dropdowns
            this.populateLeadershipDropdowns(teamData.players);
            
            // Load previously selected captain and vice-captain from sessionStorage
            const selectedCaptain = sessionStorage.getItem('selectedCaptain');
            const selectedViceCaptain = sessionStorage.getItem('selectedViceCaptain');
            
            if (selectedCaptain) {
                const captainSelect = document.getElementById('captain-select');
                captainSelect.value = selectedCaptain;
                this.updateCaptainDisplay(selectedCaptain);
            }
            
            if (selectedViceCaptain) {
                const viceCaptainSelect = document.getElementById('vice-captain-select');
                viceCaptainSelect.value = selectedViceCaptain;
                this.updateViceCaptainDisplay(selectedViceCaptain);
            }
            
            // Update player count
            document.getElementById('player-count').textContent = teamData.players.length;

            console.log('Team data loaded successfully:', teamData);
            console.log('Match data loaded successfully:', matchData);
            console.log('Selected captain:', selectedCaptain);
            console.log('Selected vice-captain:', selectedViceCaptain);

        } catch (error) {
            console.error('Error loading team data:', error);
            this.toast.showError('Error loading team data. Please try again.');
        }
    }

    displayTeamDataWithValidation(validationResult) {
        const playersListDiv = document.getElementById('players-list');
        const playerCountEl = document.getElementById('player-count');
        
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
                this.replacePlayer(playerIndex, name, id, role, team);
            } else if (action === 'showPlayerSelectionModal') {
                const name = target.getAttribute('data-player-name');
                this.showPlayerSelectionModal(playerIndex, name);
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
            this.toast.showSuccess(summaryMessage);
        } else {
            const issues = [];
            if (missingPlayers.length > 0) issues.push(`${missingPlayers.length} missing`);
            if (invalidPlayers.length > 0) issues.push(`${invalidPlayers.length} need correction`);
            
            summaryMessage = `${validPlayers.length}/11 players validated`;
            if (issues.length > 0) summaryMessage += ` (${issues.join(', ')})`;
            
            this.toast.showError(summaryMessage + '. Complete your team to continue.');
        }
    }

    displayPlayers(players) {
        const playersList = document.getElementById('players-list');
        playersList.innerHTML = '';

        players.forEach((player, index) => {
            // Create a simple player card for unvalidated players
            const playerName = typeof player === 'string' ? player : player.name;
            const playerCard = `
                <div class="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div class="flex items-center justify-between">
                        <div>
                            <span class="font-medium text-gray-900">${playerName}</span>
                            <div class="text-xs text-gray-500">Awaiting validation</div>
                        </div>
                        <div class="text-xs text-gray-400 font-medium">⏳</div>
                    </div>
                </div>
            `;
            
            playersList.innerHTML += playerCard;
        });

        // No need to attach events for unvalidated players
    }

    populateLeadershipDropdowns(players) {
        const captainSelect = document.getElementById('captain-select');
        const viceCaptainSelect = document.getElementById('vice-captain-select');
        
        // Clear existing options
        captainSelect.innerHTML = '<option value="">Choose Captain</option>';
        viceCaptainSelect.innerHTML = '<option value="">Choose Vice-Captain</option>';
        
        // Add player options
        players.forEach(player => {
            const playerName = typeof player === 'string' ? player : player.name;
            const playerRole = typeof player === 'string' ? 'Unknown' : (player.role || 'Unknown');
            
            const option = document.createElement('option');
            option.value = playerName;
            option.textContent = `${playerName} (${playerRole})`;
            
            captainSelect.appendChild(option.cloneNode(true));
            viceCaptainSelect.appendChild(option);
        });
    }

    populateCaptainDropdowns(players) {
        const captainSelect = document.getElementById('captain-select');
        const viceCaptainSelect = document.getElementById('vice-captain-select');
        
        if (captainSelect) {
            captainSelect.innerHTML = '<option value="">Choose Captain</option>';
            players.forEach(player => {
                const option = document.createElement('option');
                option.value = player;
                option.textContent = player;
                captainSelect.appendChild(option);
            });
        }
        
        if (viceCaptainSelect) {
            viceCaptainSelect.innerHTML = '<option value="">Choose Vice-Captain</option>';
            players.forEach(player => {
                const option = document.createElement('option');
                option.value = player;
                option.textContent = player;
                viceCaptainSelect.appendChild(option);
            });
        }
    }

    updateCaptainDisplay(captainName) {
        const captainNameElement = document.getElementById('captain-name');
        captainNameElement.textContent = captainName || 'Not selected';
        
        // Save captain selection to sessionStorage
        if (captainName) {
            sessionStorage.setItem('selectedCaptain', captainName);
            console.log('Saved captain to sessionStorage:', captainName);
        } else {
            sessionStorage.removeItem('selectedCaptain');
        }
    }

    updateViceCaptainDisplay(viceCaptainName) {
        const viceCaptainNameElement = document.getElementById('vice-captain-name');
        viceCaptainNameElement.textContent = viceCaptainName || 'Not selected';
        
        // Save vice-captain selection to sessionStorage
        if (viceCaptainName) {
            sessionStorage.setItem('selectedViceCaptain', viceCaptainName);
            console.log('Saved vice-captain to sessionStorage:', viceCaptainName);
        } else {
            sessionStorage.removeItem('selectedViceCaptain');
        }
    }

    async analyzeTeam() {
        // Get current captain and vice-captain selections
        const captainName = document.getElementById('captain-select').value;
        const viceCaptainName = document.getElementById('vice-captain-select').value;
        
        // Validate that both are selected
        if (!captainName || !viceCaptainName) {
            this.toast.showError('Please select both Captain and Vice-Captain before analyzing.');
            return;
        }
        
        // Save to sessionStorage (in case they weren't saved by the change events)
        sessionStorage.setItem('selectedCaptain', captainName);
        sessionStorage.setItem('selectedViceCaptain', viceCaptainName);
        
        // Save validated players to sessionStorage (for use in team-performance page)
        const validationResults = JSON.parse(sessionStorage.getItem('playerValidationResults'));
        if (validationResults && Array.isArray(validationResults.validationResults)) {
            const validatedPlayers = validationResults.validationResults.map(player => ({
                name: player.isValid ? player.validatedName : player.inputName,
                role: player.role || 'Unknown',
                team: player.team || 'Unknown',
                isValid: player.isValid,
                inputName: player.inputName
            }));
            sessionStorage.setItem('validatedPlayers', JSON.stringify(validatedPlayers));
            console.log('Saved validatedPlayers on analyzeTeam:', validatedPlayers);
        }
        
        console.log('Saving captain and vice-captain before analysis:', { captainName, viceCaptainName });
        
        // Navigate to team-performance.html
        window.location.href = 'team-performance.html';
    }

    displayAnalysisResults(results) {
        // Team form
        if (results.teamForm) {
            document.getElementById('team-a-name').textContent = results.teamForm.teamA.name;
            document.getElementById('team-b-name').textContent = results.teamForm.teamB.name;
            document.getElementById('team-a-form').innerHTML = results.teamForm.teamA.form;
            document.getElementById('team-b-form').innerHTML = results.teamForm.teamB.form;
        }

        // Head-to-head
        if (results.headToHead) {
            document.getElementById('head-to-head-content').innerHTML = results.headToHead;
        }

        // Captain performance
        if (results.captainPerformance) {
            document.getElementById('captain-performance-name').textContent = results.captainPerformance.name;
            document.getElementById('captain-performance').innerHTML = results.captainPerformance.stats;
        }

        // Vice-captain performance
        if (results.viceCaptainPerformance) {
            document.getElementById('vice-captain-performance-name').textContent = results.viceCaptainPerformance.name;
            document.getElementById('vice-captain-performance').innerHTML = results.viceCaptainPerformance.stats;
        }

        // Venue stats
        if (results.venueStats) {
            document.getElementById('venue-stats-content').innerHTML = results.venueStats;
        }

        // Team balance
        if (results.teamBalance) {
            document.getElementById('team-balance-content').innerHTML = results.teamBalance;
        }
    }

    async generateSummary() {
        try {
            const matchData = JSON.parse(sessionStorage.getItem('matchData'));
            const captainName = document.getElementById('captain-select').value;
            const viceCaptainName = document.getElementById('vice-captain-select').value;

            if (!captainName || !viceCaptainName) {
                this.toast.showError('Please select both Captain and Vice-Captain before generating summary.');
                return;
            }

            // Show summary section and loading
            document.getElementById('team-summary').classList.remove('hidden');
            document.getElementById('summary-loading').classList.remove('hidden');
            document.getElementById('summary-content').classList.add('hidden');

            // Generate summary
            const summaryResult = await this.teamAnalysis.generateSummary({
                teamA: matchData.teamA,
                teamB: matchData.teamB,
                matchDate: matchData.matchDate,
                captain: captainName,
                viceCaptain: viceCaptainName
            });

            // Hide loading and show content
            document.getElementById('summary-loading').classList.add('hidden');
            document.getElementById('summary-content').classList.remove('hidden');

            // Display summary
            document.getElementById('summary-text').innerHTML = summaryResult.summary;

        } catch (error) {
            console.error('Summary generation error:', error);
            document.getElementById('summary-loading').classList.add('hidden');
            this.toast.showError('Error generating summary. Please try again.');
        }
    }

    initializeModalEvents() {
        // Close modal
        document.getElementById('close-modal').addEventListener('click', () => {
            document.getElementById('player-selection-modal').classList.add('hidden');
        });

        document.getElementById('cancel-selection').addEventListener('click', () => {
            document.getElementById('player-selection-modal').classList.add('hidden');
        });

        // Search functionality
        document.getElementById('player-search').addEventListener('input', (e) => {
            this.filterPlayers(e.target.value);
        });

        // Team filter
        document.getElementById('team-filter').addEventListener('change', (e) => {
            this.filterPlayersByTeam(e.target.value);
        });

        // Close modal when clicking outside
        const playerSelectionModal = document.getElementById('player-selection-modal');
        if (playerSelectionModal) {
            playerSelectionModal.addEventListener('click', (e) => {
                if (e.target === playerSelectionModal) {
                    this.hidePlayerSelectionModal();
                }
            });
        }
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
        const matchData = JSON.parse(sessionStorage.getItem('matchData'));
        if (!matchData) {
            this.toast.showError('Please go back and validate match details first.');
            return;
        }
        const { teamA, teamB, matchDate } = matchData;

        // Show loading state in modal
        playersListDiv.innerHTML = '<div class="text-gray-500 text-center py-2">Loading players...</div>';
        if (modalSubtitle) modalSubtitle.textContent = `Loading players from ${teamA} and ${teamB}...`;
        modal.classList.remove('hidden');

        // Fetch eligible players from backend
        let eligiblePlayers = [];
        try {
            const response = await fetch(`${this.apiBaseUrl}/eligible-players`, {
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
                    this.toast.showSuccess(`Added ${player.player_name}`);
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
                this.toast.showSuccess(`Added ${player.player_name}`);
            });
            playersListDiv.appendChild(div);
        });
    }

    // Hide the player selection modal
    hidePlayerSelectionModal() {
        const modal = document.getElementById('player-selection-modal');
        if (modal) modal.classList.add('hidden');
    }

    async validateAllPlayers() {
        try {
            if (!this.extractedTeamData || !this.extractedTeamData.players) {
                this.toast.showError('No team data found. Please go back and upload a team screenshot.');
                return;
            }

            // Show loading state
            const validateBtn = document.getElementById('validate-players-btn');
            const originalText = validateBtn.textContent;
            validateBtn.textContent = '🔍 Validating Players...';
            validateBtn.disabled = true;

            // Get player names for validation
            const playerNames = this.extractedTeamData.players.map(player => 
                typeof player === 'string' ? player : player.name
            );

            // Get match data for validation
            const matchData = JSON.parse(sessionStorage.getItem('matchData'));
            if (!matchData) {
                this.toast.showError('Please go back and validate the match details first.');
                validateBtn.textContent = originalText;
                validateBtn.disabled = false;
                return;
            }

            // Use PlayerValidation component to validate players
            const validationResult = await this.playerValidation.validatePlayers(
                playerNames, 
                matchData.teamA, 
                matchData.teamB
            );
            
            if (validationResult && validationResult.success) {
                this.playerValidationResults = validationResult;
                
                // Save validated data to sessionStorage
                this.saveValidatedData(validationResult);
                
                // Display validated players
                this.displayTeamDataWithValidation(validationResult);
                
                this.toast.showSuccess(`✅ Validated ${validationResult.validationResults.length} players successfully!`);
                
                // Update button to show completion
                validateBtn.textContent = '✅ Players Validated';
                validateBtn.classList.remove('bg-warning', 'hover:bg-warning/90');
                validateBtn.classList.add('bg-success', 'hover:bg-success/90');
                
                // Hide the validate button
                validateBtn.style.display = 'none';
            } else {
                this.toast.showError(validationResult?.message || 'Failed to validate players');
                
                // Reset button
                validateBtn.textContent = originalText;
                validateBtn.disabled = false;
            }
        } catch (error) {
            console.error('Validation error:', error);
            this.toast.showError('Error validating players. Please try again.');
            
            // Reset button
            const validateBtn = document.getElementById('validate-players-btn');
            validateBtn.textContent = '🔍 Validate & Auto-Correct Players';
            validateBtn.disabled = false;
        }
    }

    saveValidatedData(validationResult) {
        try {
            // Save validated team data
            const validatedPlayers = validationResult.validationResults.map(player => ({
                name: player.isValid ? player.validatedName : player.inputName,
                role: player.role || 'Unknown',
                team: player.team || 'Unknown',
                isValid: player.isValid,
                inputName: player.inputName
            }));
            const teamData = {
                players: validatedPlayers,
                totalPlayers: validationResult.totalPlayers || validatedPlayers.length,
                validPlayers: validatedPlayers.filter(p => p.isValid).length
            };

            // Save to sessionStorage
            sessionStorage.setItem('teamData', JSON.stringify(teamData));
            sessionStorage.setItem('playerValidationResults', JSON.stringify(validationResult));
            sessionStorage.setItem('validatedPlayers', JSON.stringify(validatedPlayers));
            
            console.log('Saved validated data to sessionStorage:', { teamData, validationResult, validatedPlayers });
        } catch (error) {
            console.error('Error saving validated data:', error);
        }
    }

    async validatePlayers(players) {
        // Block validation if match is not validated
        const matchData = JSON.parse(sessionStorage.getItem('matchData'));
        if (!matchData) {
            this.toast.showError('Please go back and validate the match details first.');
            return { success: false, message: 'Match not validated' };
        }
        // FIX: ensure array of strings
        const playerNames = players.map(p => typeof p === 'string' ? p : p.name);
        try {
            const result = await this.playerValidation.validatePlayers(
                playerNames, 
                matchData.teamA, 
                matchData.teamB
            );
            
            this.playerValidationResults = result;
            this.displayTeamDataWithValidation(result);
            
            // Update sessionStorage with new validated players
            const validatedPlayers = validationResults.validationResults.map(player => ({
                name: player.isValid ? player.validatedName : player.inputName,
                role: player.role || 'Unknown',
                team: player.team || 'Unknown',
                isValid: player.isValid,
                inputName: player.inputName
            }));
            const teamData = {
                players: validatedPlayers,
                totalPlayers: result.totalPlayers || validatedPlayers.length,
                validPlayers: validatedPlayers.filter(p => p.isValid).length
            };
            sessionStorage.setItem('teamData', JSON.stringify(teamData));
            sessionStorage.setItem('playerValidationResults', JSON.stringify(result));
            
            return { success: true, ...result };
        } catch (error) {
            this.toast.showError('Failed to validate players. Please try again.');
            return { success: false, message: 'Validation failed', error: error.message };
        }
    }

    replacePlayer(playerIndex, name, id, role, team) {
        // Update the player in the extracted team data
        if (this.extractedTeamData && this.extractedTeamData.players) {
            // Replace with just the name (string)
            this.extractedTeamData.players[playerIndex] = name;
            // Re-validate the team
            this.validatePlayers(this.extractedTeamData.players);
            this.toast.showSuccess(`Replaced with ${name}`);
        }
    }

    attachPlayerCardEvents() {
        // Player selection buttons
        document.querySelectorAll('.player-select-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const playerIndex = parseInt(e.target.dataset.playerIndex);
                const playerName = e.target.dataset.playerName;

                if (action === 'showPlayerSelectionModal') {
                    this.showPlayerSelectionModal(playerIndex, playerName);
                }
            });
        });

        // Player suggestion buttons
        document.querySelectorAll('.player-suggestion-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const playerIndex = parseInt(e.target.dataset.playerIndex);
                const playerName = e.target.dataset.playerName;
                const playerId = e.target.dataset.playerId;
                const role = e.target.dataset.playerRole;
                const team = e.target.dataset.playerTeam;

                this.replacePlayer(playerIndex, playerName, playerId, role, team);
            });
        });
    }

    loadAvailablePlayers() {
        const availablePlayers = this.playerValidation.getAvailablePlayers();
        const playersList = document.getElementById('modal-players-list');
        
        playersList.innerHTML = '';
        
        availablePlayers.forEach(player => {
            const playerElement = document.createElement('div');
            playerElement.className = 'p-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer';
            playerElement.innerHTML = `
                <div class="font-medium text-gray-900">${player.player_name}</div>
                <div class="text-xs text-gray-500">${player.role} • ${player.team_name}</div>
            `;
            
            playerElement.addEventListener('click', () => {
                this.playerValidation.selectPlayerFromModal(player);
                document.getElementById('player-selection-modal').classList.add('hidden');
                this.loadTeamData(); // Refresh display
            });
            
            playersList.appendChild(playerElement);
        });
    }

    filterPlayers(searchTerm) {
        const players = document.querySelectorAll('#modal-players-list > div');
        players.forEach(player => {
            const name = player.querySelector('.font-medium').textContent.toLowerCase();
            if (name.includes(searchTerm.toLowerCase())) {
                player.style.display = 'block';
            } else {
                player.style.display = 'none';
            }
        });
    }

    filterPlayersByTeam(teamName) {
        const players = document.querySelectorAll('#modal-players-list > div');
        players.forEach(player => {
            const team = player.querySelector('.text-xs').textContent;
            if (!teamName || team.includes(teamName)) {
                player.style.display = 'block';
            } else {
                player.style.display = 'none';
            }
        });
    }
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TeamAnalysisPage();
}); 