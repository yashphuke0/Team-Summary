// Team Analysis Page - Handles analysis workflow after teams are uploaded
class TeamAnalysisPage {
    constructor() {
        this.components = {};
        this.currentTeams = [];
        this.currentMatchDetails = null;
        this.selectedTeamIndex = -1;
        this.currentTeamData = null;
        
        // Initialize components
        this.initializeComponents();
        this.setupEventListeners();
        this.loadDataFromSessionStorage();
    }

    initializeComponents() {
        // Initialize Toast notifications
        this.components.toast = new Toast();
        this.components.toast.initialize(
            'error-toast', 'error-message',
            'success-toast', 'success-message'
        );

        // Initialize Player Validation
        this.components.playerValidation = new PlayerValidation(CONSTANTS.API_BASE_URL);

        // Initialize Team Analysis
        this.components.teamAnalysis = new TeamAnalysis(CONSTANTS.API_BASE_URL);
    }

    setupEventListeners() {
        // Team selection
        const teamSelector = document.getElementById('team-selector');
        teamSelector.addEventListener('change', (e) => this.handleTeamSelection(e));

        // Captain/Vice-Captain selection
        const captainSelect = document.getElementById('captain-select');
        const viceCaptainSelect = document.getElementById('vice-captain-select');
        
        captainSelect.addEventListener('change', () => this.handleCaptainSelection());
        viceCaptainSelect.addEventListener('change', () => this.handleViceCaptainSelection());

        // Analysis buttons
        const analyzeAllBtn = document.getElementById('analyze-all-btn');
        const compareTeamsBtn = document.getElementById('compare-teams-btn');

        analyzeAllBtn.addEventListener('click', () => this.analyzeSelectedTeam());
        compareTeamsBtn.addEventListener('click', () => this.compareTeams());

        // Override modal events
        const closeOverrideModal = document.getElementById('close-override-modal');
        const saveOverride = document.getElementById('save-override');
        const cancelOverride = document.getElementById('cancel-override');

        closeOverrideModal.addEventListener('click', () => this.closeOverrideModal());
        saveOverride.addEventListener('click', () => this.saveOverrideChanges());
        cancelOverride.addEventListener('click', () => this.closeOverrideModal());
    }

    loadDataFromSessionStorage() {
        try {
            // Load teams data
            const teamsData = sessionStorage.getItem('uploadedTeams');
            if (teamsData) {
                this.currentTeams = JSON.parse(teamsData);
            }

            // Load match details
            const matchData = sessionStorage.getItem('matchDetails');
            if (matchData) {
                this.currentMatchDetails = JSON.parse(matchData);
            }

            // If no data, redirect back to main page
            if (!this.currentTeams || this.currentTeams.length === 0) {
                this.components.toast.showError('No teams data found. Please upload teams first.');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
                return;
            }

            // Display the data
            this.displayMatchInfo();
            this.displayTeamsSummary();

        } catch (error) {
            console.error('Error loading data from sessionStorage:', error);
            this.components.toast.showError('Error loading data. Please try again.');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        }
    }

    displayMatchInfo() {
        const matchInfo = document.getElementById('match-info');
        
        if (this.currentMatchDetails) {
            matchInfo.innerHTML = `
                <div class="flex justify-between items-center p-3 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg">
                    <div class="text-center flex-1">
                        <div class="font-bold text-gray-800 text-sm">${this.currentMatchDetails.teamA}</div>
                        <div class="text-xs text-gray-600">Team A</div>
                    </div>
                    <div class="mx-4">
                        <div class="bg-primary text-white px-3 py-1 rounded-full text-xs font-bold">VS</div>
                    </div>
                    <div class="text-center flex-1">
                        <div class="font-bold text-gray-800 text-sm">${this.currentMatchDetails.teamB}</div>
                        <div class="text-xs text-gray-600">Team B</div>
                    </div>
                </div>
                <div class="text-center mt-2">
                    <div class="text-sm text-gray-600">Match Date: ${this.currentMatchDetails.matchDate}</div>
                </div>
            `;
            
            // Load match context after displaying match info
            this.loadMatchContext();
        } else {
            matchInfo.innerHTML = `
                <div class="text-center text-gray-500 text-sm">
                    No match details available
                </div>
            `;
        }
    }

    // Mapping of full team names to short forms
    static TEAM_SHORT_NAMES = {
        'Chennai Super Kings': 'CSK',
        'Mumbai Indians': 'MI',
        'Royal Challengers Bengaluru': 'RCB',
        'Sunrisers Hyderabad': 'SRH',
        'Rajasthan Royals': 'RR',
        'Delhi Capitals': 'DC',
        'Kolkata Knight Riders': 'KKR',
        'Punjab Kings': 'PBKS',
        'Lucknow Super Giants': 'LSG',
        'Gujarat Titans': 'GT',
        // Add more as needed
    };

    async loadMatchContext() {
        if (!this.currentMatchDetails) return;
        try {
            const matchContextSection = document.getElementById('match-context');
            matchContextSection.classList.remove('hidden');

            // Fetch match context data
            const [teamFormData, headToHeadData, venueStatsData] = await Promise.all([
                this.fetchTeamForm(),
                this.fetchHeadToHead(),
                this.fetchVenueStats()
            ]);

            // Helper to get short name
            const getShort = (name) => TeamAnalysisPage.TEAM_SHORT_NAMES[name] || name;
            const teamAShort = getShort(this.currentMatchDetails.teamA);
            const teamBShort = getShort(this.currentMatchDetails.teamB);

            // --- Recent Form ---
            document.getElementById('recent-form-team-a-name').textContent = teamAShort;
            document.getElementById('recent-form-team-b-name').textContent = teamBShort;
            if (teamFormData.success && teamFormData.data) {
                const teamA = teamFormData.data.teamA;
                const teamB = teamFormData.data.teamB;
                // Calculate wins if not provided or 0
                let teamAWins = (teamA && teamA.wins) ? teamA.wins : (teamA && teamA.matches ? teamA.matches.filter(m => m.result === 'Win').length : null);
                let teamBWins = (teamB && teamB.wins) ? teamB.wins : (teamB && teamB.matches ? teamB.matches.filter(m => m.result === 'Win').length : null);
                // Show N/A if no data
                document.getElementById('recent-form-team-a-wins').textContent = (teamAWins !== null && teamAWins !== undefined) ? `${teamAWins}/5 wins` : 'N/A';
                document.getElementById('recent-form-team-b-wins').textContent = (teamBWins !== null && teamBWins !== undefined) ? `${teamBWins}/5 wins` : 'N/A';
                // Form sequence
                if (teamA && teamA.matches) {
                    const formSeqHtml = teamA.matches.map(m => {
                        if (m.result === 'Win') return '<span class="text-green-600 font-bold">W</span>';
                        if (m.result === 'Loss') return '<span class="text-red-600 font-bold">L</span>';
                        return '<span>' + (m.result ? m.result[0] : '-') + '</span>';
                    }).join('<span class="mx-0.5 text-gray-400">-</span>');
                    document.getElementById('recent-form-team-a-seq').innerHTML = formSeqHtml;
                }
                if (teamB && teamB.matches) {
                    const formSeqHtml = teamB.matches.map(m => {
                        if (m.result === 'Win') return '<span class="text-green-600 font-bold">W</span>';
                        if (m.result === 'Loss') return '<span class="text-red-600 font-bold">L</span>';
                        return '<span>' + (m.result ? m.result[0] : '-') + '</span>';
                    }).join('<span class="mx-0.5 text-gray-400">-</span>');
                    document.getElementById('recent-form-team-b-seq').innerHTML = formSeqHtml;
                }
            } else {
                document.getElementById('recent-form-team-a-wins').textContent = 'N/A';
                document.getElementById('recent-form-team-b-wins').textContent = 'N/A';
            }
            // --- Head-to-Head ---
            if (headToHeadData.success && headToHeadData.data) {
                const teamAWins = headToHeadData.data.teamAWins;
                const teamBWins = headToHeadData.data.teamBWins;
                const totalMatches = headToHeadData.data.totalMatches;
                // Prefer backend win rates, else calculate
                let teamAWinRate = (typeof headToHeadData.data.teamAWinRate === 'number') ? headToHeadData.data.teamAWinRate : (totalMatches ? Math.round((teamAWins / totalMatches) * 100) : null);
                let teamBWinRate = (typeof headToHeadData.data.teamBWinRate === 'number') ? headToHeadData.data.teamBWinRate : (totalMatches ? Math.round((teamBWins / totalMatches) * 100) : null);
                document.getElementById('h2h-team-a-wins').textContent = teamAWins !== undefined ? teamAWins : 'N/A';
                document.getElementById('h2h-team-b-wins').textContent = teamBWins !== undefined ? teamBWins : 'N/A';
                document.getElementById('h2h-total-matches').textContent = totalMatches !== undefined ? totalMatches : 'N/A';
                document.getElementById('h2h-team-a-name').textContent = teamAShort;
                document.getElementById('h2h-team-b-name').textContent = teamBShort;
                document.getElementById('h2h-team-a-rate').textContent = (teamAWinRate !== null && teamAWinRate !== undefined) ? `${teamAWinRate}% win rate` : 'N/A';
                document.getElementById('h2h-team-b-rate').textContent = (teamBWinRate !== null && teamBWinRate !== undefined) ? `${teamBWinRate}% win rate` : 'N/A';
            } else {
                document.getElementById('h2h-team-a-wins').textContent = 'N/A';
                document.getElementById('h2h-team-b-wins').textContent = 'N/A';
                document.getElementById('h2h-total-matches').textContent = 'N/A';
                document.getElementById('h2h-team-a-rate').textContent = 'N/A';
                document.getElementById('h2h-team-b-rate').textContent = 'N/A';
            }
            // --- Venue Analysis ---
            if (venueStatsData.success && venueStatsData.data && venueStatsData.data.venueStats) {
                const stats = venueStatsData.data.venueStats;
                document.getElementById('venue-name').textContent = stats.venue_name || '';
                document.getElementById('venue-location').textContent = stats.venue_location || '';
                document.getElementById('venue-pitch-type').textContent = `${stats.pitch_type || ''} ${stats.pitch_rating ? '(' + stats.pitch_rating + ')' : ''}`;
                document.getElementById('venue-1st-innings').textContent = stats.avg_first_innings_score || 'N/A';
                document.getElementById('venue-2nd-innings').textContent = stats.avg_second_innings_score || 'N/A';
                document.getElementById('venue-chase-success').textContent = stats.chase_success_rate ? stats.chase_success_rate + '%' : 'N/A';
                // Team records: prefer backend, else N/A
                document.getElementById('venue-team-a-record').textContent = stats.teamA_record ? `${teamAShort}: ${stats.teamA_record}` : `${teamAShort}: N/A`;
                document.getElementById('venue-team-b-record').textContent = stats.teamB_record ? `${teamBShort}: ${stats.teamB_record}` : `${teamBShort}: N/A`;
                document.getElementById('venue-toss-strategy').textContent = stats.toss_strategy || '';
                document.getElementById('venue-toss-note').textContent = stats.toss_note || '';
            } else {
                document.getElementById('venue-1st-innings').textContent = 'N/A';
                document.getElementById('venue-2nd-innings').textContent = 'N/A';
                document.getElementById('venue-chase-success').textContent = 'N/A';
                document.getElementById('venue-team-a-record').textContent = `${teamAShort}: N/A`;
                document.getElementById('venue-team-b-record').textContent = `${teamBShort}: N/A`;
            }

            // Set font-family: inter for all inner context text
            [
                'recent-form-team-a-name', 'recent-form-team-b-name', 'recent-form-team-a-seq', 'recent-form-team-b-seq',
                'recent-form-team-a-wins', 'recent-form-team-b-wins',
                'h2h-team-a-wins', 'h2h-team-b-wins', 'h2h-total-matches',
                'h2h-team-a-name', 'h2h-team-b-name', 'h2h-team-a-rate', 'h2h-team-b-rate',
                'venue-name', 'venue-location', 'venue-pitch-type',
                'venue-1st-innings', 'venue-2nd-innings', 'venue-chase-success',
                'venue-team-a-record', 'venue-team-b-record', 'venue-toss-strategy', 'venue-toss-note'
            ].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.fontFamily = 'Inter, sans-serif';
            });
        } catch (error) {
            console.error('Error loading match context:', error);
            this.components.toast.showError('Failed to load match context');
        }
    }

    async fetchTeamForm() {
        try {
            const response = await fetch(`${CONSTANTS.API_BASE_URL}/team-recent-form`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    teamA: this.currentMatchDetails.teamA,
                    teamB: this.currentMatchDetails.teamB,
                    matchDate: this.currentMatchDetails.matchDate
                })
            });
            return await response.json();
        } catch (error) {
            console.error('Error fetching team form:', error);
            return { success: false, message: 'Failed to fetch team form' };
        }
    }

    async fetchHeadToHead() {
        try {
            const response = await fetch(`${CONSTANTS.API_BASE_URL}/head-to-head`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    teamA: this.currentMatchDetails.teamA,
                    teamB: this.currentMatchDetails.teamB,
                    matchDate: this.currentMatchDetails.matchDate
                })
            });
            return await response.json();
        } catch (error) {
            console.error('Error fetching head-to-head:', error);
            return { success: false, message: 'Failed to fetch head-to-head data' };
        }
    }

    async fetchVenueStats() {
        try {
            const response = await fetch(`${CONSTANTS.API_BASE_URL}/venue-stats`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    teamA: this.currentMatchDetails.teamA,
                    teamB: this.currentMatchDetails.teamB,
                    matchDate: this.currentMatchDetails.matchDate
                })
            });
            return await response.json();
        } catch (error) {
            console.error('Error fetching venue stats:', error);
            return { success: false, message: 'Failed to fetch venue stats' };
        }
    }

    displayHeadToHead(data) {
        const headToHeadDiv = document.getElementById('head-to-head');
        if (data.success && data.data && typeof data.data.teamAWins === 'number' && typeof data.data.teamBWins === 'number') {
            headToHeadDiv.innerHTML = `
                <div class="font-medium">${this.currentMatchDetails.teamA}: ${data.data.teamAWins} wins | ${this.currentMatchDetails.teamB}: ${data.data.teamBWins} wins</div>
            `;
        } else {
            headToHeadDiv.innerHTML = '<div class="text-gray-500 text-sm">No head-to-head data available</div>';
        }
    }

    displayTeamForm(data) {
        const teamAFormDiv = document.getElementById('team-a-form');
        const teamBFormDiv = document.getElementById('team-b-form');
        
        if (data.success && data.data) {
            const teamA = data.data.teamA;
            const teamB = data.data.teamB;
            
            // Team A Form
            if (teamA && teamA.matches) {
                const formResults = teamA.matches.map(m => {
                    const result = m.result || 'Unknown';
                    return result.replace('Win', 'W').replace('Loss', 'L').replace(/\s+/g, '-');
                }).join(', ');
                teamAFormDiv.innerHTML = `<div class="font-medium">${formResults}</div>`;
            } else {
                teamAFormDiv.innerHTML = '<div class="text-gray-500 text-sm">No recent matches</div>';
            }
            
            // Team B Form
            if (teamB && teamB.matches) {
                const formResults = teamB.matches.map(m => {
                    const result = m.result || 'Unknown';
                    return result.replace('Win', 'W').replace('Loss', 'L').replace(/\s+/g, '-');
                }).join(', ');
                teamBFormDiv.innerHTML = `<div class="font-medium">${formResults}</div>`;
            } else {
                teamBFormDiv.innerHTML = '<div class="text-gray-500 text-sm">No recent matches</div>';
            }
        } else {
            teamAFormDiv.innerHTML = '<div class="text-gray-500 text-sm">No form data available</div>';
            teamBFormDiv.innerHTML = '<div class="text-gray-500 text-sm">No form data available</div>';
        }
    }

    displayVenueStats(data) {
        const venueStatsDiv = document.getElementById('venue-stats');
        
        if (data.success && data.data && data.data.venueStats) {
            const stats = data.data.venueStats;
            venueStatsDiv.innerHTML = `
                <div class="space-y-2">
                    <div class="font-medium">${stats.venue_name || 'Unknown Venue'}</div>
                    <div class="text-xs text-gray-600">
                        <div>Avg 1st Inn: ${stats.avg_first_innings_score || 'N/A'}</div>
                        <div>Avg 2nd Inn: ${stats.avg_second_innings_score || 'N/A'}</div>
                        <div>Pitch: ${stats.pitch_type || 'neutral'} (${stats.pitch_rating || 'balanced'})</div>
                        <div>Chase Success: ${stats.chase_success_rate || 'N/A'}%</div>
                    </div>
                </div>
            `;
        } else {
            venueStatsDiv.innerHTML = '<div class="text-gray-500 text-sm">No venue stats available</div>';
        }
    }

    displayTeamsSummary() {
        const summaryContent = document.getElementById('teams-summary-content');
        const teamSelector = document.getElementById('team-selector');
        const compareTeamsBtn = document.getElementById('compare-teams-btn');

        // Clear previous content
        summaryContent.innerHTML = '';
        teamSelector.innerHTML = '<option value="">Choose a team to configure captain/vice-captain</option>';

        // Add helpful message for multiple teams
        if (this.currentTeams.length > 1) {
            const infoCard = document.createElement('div');
            infoCard.className = 'bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3';
            infoCard.innerHTML = `
                <div class="flex items-start">
                    <div class="text-blue-600 mr-2 mt-0.5">💡</div>
                    <div class="text-xs text-blue-800">
                        <strong>Tip:</strong> Select each team above to configure captain/vice-captain. 
                        The "Analyze All Teams" button will analyze all teams together with your selections.
                    </div>
                </div>
            `;
            summaryContent.appendChild(infoCard);
        }

        // Display teams
        this.currentTeams.forEach((team, index) => {
            const teamCard = document.createElement('div');
            teamCard.className = 'bg-gray-50 rounded-lg p-3 border border-gray-200';
            teamCard.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <h3 class="font-semibold text-sm text-gray-800">${team.name}</h3>
                    <span class="text-xs text-gray-500">${team.players.length} players</span>
                </div>
                <div class="text-xs text-gray-600 mb-2">
                    <div>Captain: ${team.captain || 'Not set'}</div>
                    <div>Vice-Captain: ${team.viceCaptain || 'Not set'}</div>
                </div>
                <div class="text-xs text-gray-500">
                    Players: ${team.players.slice(0, 5).join(', ')}${team.players.length > 5 ? '...' : ''}
                </div>
            `;
            summaryContent.appendChild(teamCard);

            // Add to team selector
            const option = document.createElement('option');
            option.value = index;
            option.textContent = team.name;
            teamSelector.appendChild(option);
        });

        // Show/hide compare button based on team count
        if (this.currentTeams.length >= 2) {
            compareTeamsBtn.classList.remove('hidden');
        } else {
            compareTeamsBtn.classList.add('hidden');
        }

        // If single team, auto-select it
        if (this.currentTeams.length === 1) {
            teamSelector.value = '0';
            this.handleTeamSelection({ target: { value: '0' } }).catch(error => {
                console.error('Error auto-selecting team:', error);
            });
        }
    }

    async handleTeamSelection(e) {
        const teamIndex = parseInt(e.target.value);
        
        if (isNaN(teamIndex) || teamIndex < 0 || teamIndex >= this.currentTeams.length) {
            document.getElementById('team-details').classList.add('hidden');
            return;
        }

        this.selectedTeamIndex = teamIndex;
        this.currentTeamData = this.currentTeams[teamIndex];
        
        await this.displayTeamData();
    }

    async displayTeamData() {
        const teamDetails = document.getElementById('team-details');
        const playersList = document.getElementById('players-list');
        const captainSelect = document.getElementById('captain-select');
        const viceCaptainSelect = document.getElementById('vice-captain-select');

        // Validate players against database
        const validationResults = await this.validatePlayers(this.currentTeamData.players);
        
        // Display players with validation status
        playersList.innerHTML = '';
        validationResults.forEach(result => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'flex items-center justify-between p-2 rounded border';
            
            if (result.isValid) {
                playerDiv.className += ' bg-green-50 border-green-200';
                const matchedName = result.matchedName || result.inputName;
                playerDiv.innerHTML = `
                    <div class="text-gray-700">• ${result.inputName}</div>
                    <div class="text-xs text-green-600">✓ ${matchedName}</div>
                `;
            } else {
                playerDiv.className += ' bg-red-50 border-red-200';
                playerDiv.innerHTML = `
                    <div class="text-gray-700">• ${result.inputName}</div>
                    <button onclick="teamAnalysisPage.showOverrideModal('${result.inputName}')" class="text-xs text-red-600 hover:text-red-800 underline">
                        🔍 Override
                    </button>
                `;
            }
            playersList.appendChild(playerDiv);
        });

        // Populate captain/vice-captain dropdowns with validated players
        captainSelect.innerHTML = '<option value="">Select Captain</option>';
        viceCaptainSelect.innerHTML = '<option value="">Select Vice-Captain</option>';

        // Use a Set to ensure unique player names
        const uniquePlayerNames = Array.from(new Set(validationResults.map(result => result.isValid ? (result.matchedName || result.inputName) : result.inputName)));

        uniquePlayerNames.forEach(playerName => {
            const capOption = document.createElement('option');
            capOption.value = playerName;
            capOption.textContent = playerName;
            captainSelect.appendChild(capOption);

            const vcOption = document.createElement('option');
            vcOption.value = playerName;
            vcOption.textContent = playerName;
            viceCaptainSelect.appendChild(vcOption);
        });

        // Set current values if available
        if (this.currentTeamData.captain) {
            captainSelect.value = this.currentTeamData.captain;
        }
        if (this.currentTeamData.viceCaptain) {
            viceCaptainSelect.value = this.currentTeamData.viceCaptain;
        }

        // Store validation results for later use
        this.currentTeamData.validationResults = validationResults;

        teamDetails.classList.remove('hidden');
    }

    handleCaptainSelection() {
        const captainSelect = document.getElementById('captain-select');
        if (this.currentTeamData) {
            this.currentTeamData.captain = captainSelect.value;
            // Update the teams array
            this.currentTeams[this.selectedTeamIndex] = this.currentTeamData;
            // Update sessionStorage
            sessionStorage.setItem('uploadedTeams', JSON.stringify(this.currentTeams));
            // Update team summary display
            this.updateTeamSummaryDisplay();
        }
    }

    handleViceCaptainSelection() {
        const viceCaptainSelect = document.getElementById('vice-captain-select');
        if (this.currentTeamData) {
            this.currentTeamData.viceCaptain = viceCaptainSelect.value;
            // Update the teams array
            this.currentTeams[this.selectedTeamIndex] = this.currentTeamData;
            // Update sessionStorage
            sessionStorage.setItem('uploadedTeams', JSON.stringify(this.currentTeams));
            // Update team summary display
            this.updateTeamSummaryDisplay();
        }
    }

    async validatePlayers(players) {
        if (!this.currentMatchDetails) {
            this.components.toast.showError('Please validate match details first');
            return [];
        }

        try {
            const response = await fetch(`${CONSTANTS.API_BASE_URL}/validate-players`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    players: players,
                    teamA: this.currentMatchDetails.teamA,
                    teamB: this.currentMatchDetails.teamB
                })
            });

            const result = await response.json();
            
            if (result.success) {
                // Store validation results in current team data
                this.currentTeamData.validationResults = result.validationResults;
                return result.validationResults;
            } else {
                this.components.toast.showError(result.message || 'Validation failed');
                return players.map(player => ({
                    inputName: player,
                    isValid: false,
                    matchedName: player,
                    suggestions: []
                }));
            }
        } catch (error) {
            console.error('Validation error:', error);
            this.components.toast.showError('Failed to validate players');
            return players.map(player => ({
                inputName: player,
                isValid: false,
                matchedName: player,
                suggestions: []
            }));
        }
    }

    showOverrideModal(playerName) {
        const modal = document.getElementById('player-override-modal');
        const content = document.getElementById('override-modal-content');
        // Find the player's validation result
        const playerResult = this.currentTeamData.validationResults.find(r => r.inputName === playerName);
        if (!playerResult) {
            this.components.toast.showError('Player not found');
            return;
        }
        // Helper to handle override instantly
        const handleInstantOverride = (newPlayerName) => {
            let selectedSuggestion = null;
            if (playerResult && playerResult.suggestions) {
                selectedSuggestion = playerResult.suggestions.find(s => s.playerName === newPlayerName);
            }
            const playerIndex = this.currentTeamData.players.indexOf(this.currentOverridePlayer);
            if (playerIndex !== -1) {
                this.currentTeamData.players[playerIndex] = newPlayerName;
            }
            const validationResult = this.currentTeamData.validationResults.find(r => r.inputName === this.currentOverridePlayer);
            if (validationResult) {
                validationResult.inputName = newPlayerName;
                validationResult.matchedName = newPlayerName;
                validationResult.isValid = true;
                if (selectedSuggestion) {
                    validationResult.playerId = selectedSuggestion.playerId;
                    validationResult.role = selectedSuggestion.role;
                    validationResult.team = selectedSuggestion.team;
                    validationResult.confidence = selectedSuggestion.similarity;
                }
            }
            if (this.currentTeamData.captain === this.currentOverridePlayer) {
                this.currentTeamData.captain = newPlayerName;
            }
            if (this.currentTeamData.viceCaptain === this.currentOverridePlayer) {
                this.currentTeamData.viceCaptain = newPlayerName;
            }
            this.currentTeams[this.selectedTeamIndex] = this.currentTeamData;
            sessionStorage.setItem('uploadedTeams', JSON.stringify(this.currentTeams));
            this.closeOverrideModal();
            this.displayTeamData();
            this.updateTeamSummaryDisplay();
            this.components.toast.showSuccess(`Player updated to: ${newPlayerName}`);
        };
        // Modal content with scrollable area
        let suggestionsHtml = '';
        if (playerResult.suggestions && playerResult.suggestions.length > 0) {
            suggestionsHtml = playerResult.suggestions.map(suggestion => `
                <label class="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors override-suggestion" data-player="${suggestion.playerName}">
                    <input type="radio" name="override-player" value="${suggestion.playerName}" class="mr-3" tabindex="-1">
                    <div class="flex-1">
                        <div class="font-medium text-sm text-gray-800">${suggestion.playerName}</div>
                        <div class="text-xs text-gray-500">
                            ${suggestion.role || 'Unknown'} • ${suggestion.team || 'Unknown'} • ${Math.round(suggestion.similarity * 100)}% match
                        </div>
                    </div>
                    <div class="text-xs font-medium ${suggestion.similarity >= 0.8 ? 'text-green-600' : suggestion.similarity >= 0.6 ? 'text-yellow-600' : 'text-red-600'}">
                        ${Math.round(suggestion.similarity * 100)}%
                    </div>
                </label>
            `).join('');
        } else {
            suggestionsHtml = '<div class="text-sm text-gray-500 italic p-2">No similar players found in database</div>';
        }
        suggestionsHtml += `
            <label class="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors bg-gray-50 override-suggestion" data-player="${playerName}">
                <input type="radio" name="override-player" value="${playerName}" class="mr-3" tabindex="-1">
                <div class="flex-1">
                    <div class="font-medium text-sm text-gray-800">${playerName}</div>
                    <div class="text-xs text-gray-500">Keep Original (Not in Database)</div>
                </div>
                <div class="text-xs font-medium text-gray-400">0%</div>
            </label>
        `;
        content.innerHTML = `
            <div class="mb-4 max-h-[60vh] overflow-y-auto pr-1">
                <h4 class="font-semibold text-gray-800 mb-2">Input Player: ${playerName}</h4>
                <p class="text-sm text-gray-600 mb-3">Select the correct player from the database:</p>
                <div class="space-y-2">${suggestionsHtml}</div>
            </div>
        `;
        this.currentOverridePlayer = playerName;
        setTimeout(() => {
            const suggestionLabels = content.querySelectorAll('.override-suggestion');
            suggestionLabels.forEach(label => {
                label.addEventListener('click', (e) => {
                    const player = label.getAttribute('data-player');
                    handleInstantOverride(player);
                });
            });
        }, 50);
        // ESC key closes modal
        this._escListener = (e) => {
            if (e.key === 'Escape') {
                this.closeOverrideModal();
            }
        };
        document.addEventListener('keydown', this._escListener);
        // Click outside closes modal
        modal.addEventListener('mousedown', this._outsideClickListener = (e) => {
            if (e.target === modal) {
                this.closeOverrideModal();
            }
        });
        modal.classList.remove('hidden');
    }

    closeOverrideModal() {
        const modal = document.getElementById('player-override-modal');
        const content = document.getElementById('override-modal-content');
        content.innerHTML = '';
        modal.classList.add('hidden');
        this.currentOverridePlayer = null;
        // Remove ESC and outside click listeners
        if (this._escListener) document.removeEventListener('keydown', this._escListener);
        if (this._outsideClickListener) modal.removeEventListener('mousedown', this._outsideClickListener);
        this._escListener = null;
        this._outsideClickListener = null;
    }

    saveOverrideChanges() {
        console.log('Save override changes called');
        console.log('Current override player:', this.currentOverridePlayer);
        
        const selectedValue = document.querySelector('input[name="override-player"]:checked');
        console.log('Selected value:', selectedValue);
        
        if (!selectedValue) {
            this.components.toast.showError('Please select a player');
            return;
        }

        const newPlayerName = selectedValue.value;
        console.log('New player name:', newPlayerName);
        
        // Find the suggestion data if it's a database player
        const playerResult = this.currentTeamData.validationResults.find(r => r.inputName === this.currentOverridePlayer);
        let selectedSuggestion = null;
        
        if (playerResult && playerResult.suggestions) {
            selectedSuggestion = playerResult.suggestions.find(s => s.playerName === newPlayerName);
        }
        
        console.log('Player result:', playerResult);
        console.log('Selected suggestion:', selectedSuggestion);
        
        // Update the player in the current team data
        const playerIndex = this.currentTeamData.players.indexOf(this.currentOverridePlayer);
        console.log('Player index:', playerIndex);
        
        if (playerIndex !== -1) {
            this.currentTeamData.players[playerIndex] = newPlayerName;
            console.log('Updated player in team data');
        }

        // Update validation results
        const validationResult = this.currentTeamData.validationResults.find(r => r.inputName === this.currentOverridePlayer);
        if (validationResult) {
            validationResult.inputName = newPlayerName;
            validationResult.matchedName = newPlayerName;
            validationResult.isValid = true;
            
            // Update with suggestion data if available
            if (selectedSuggestion) {
                validationResult.playerId = selectedSuggestion.playerId;
                validationResult.role = selectedSuggestion.role;
                validationResult.team = selectedSuggestion.team;
                validationResult.confidence = selectedSuggestion.similarity;
            }
            console.log('Updated validation result');
        }

        // Update captain/vice-captain if they were the overridden player
        if (this.currentTeamData.captain === this.currentOverridePlayer) {
            this.currentTeamData.captain = newPlayerName;
            console.log('Updated captain');
        }
        if (this.currentTeamData.viceCaptain === this.currentOverridePlayer) {
            this.currentTeamData.viceCaptain = newPlayerName;
            console.log('Updated vice-captain');
        }

        // Update the teams array and sessionStorage
        this.currentTeams[this.selectedTeamIndex] = this.currentTeamData;
        sessionStorage.setItem('uploadedTeams', JSON.stringify(this.currentTeams));
        console.log('Updated sessionStorage');

        // Close modal first
        this.closeOverrideModal();
        
        // Then refresh display
        this.displayTeamData();
        this.updateTeamSummaryDisplay();
        
        this.components.toast.showSuccess(`Player updated to: ${newPlayerName}`);
    }

    updateTeamSummaryDisplay() {
        // Refresh the teams summary to show updated captain/vice-captain
        this.displayTeamsSummary();
    }

    async analyzeSelectedTeam() {
        if (!this.currentMatchDetails) {
            this.components.toast.showError('Please validate match details first');
            return;
        }

        // Always analyze ALL teams, not just the selected one
        const teamsToAnalyze = this.currentTeams;
        
        if (!teamsToAnalyze || teamsToAnalyze.length === 0) {
            this.components.toast.showError('No teams to analyze');
            return;
        }

        // Check if all teams have captain and vice-captain selected
        const teamsWithoutCaptain = teamsToAnalyze.filter(team => !team.captain || !team.viceCaptain);
        if (teamsWithoutCaptain.length > 0) {
            this.components.toast.showError('Please select Captain and Vice-Captain for all teams before analyzing');
            return;
        }

        // Check if any team has same captain and vice-captain
        const teamsWithSameCaptain = teamsToAnalyze.filter(team => team.captain === team.viceCaptain);
        if (teamsWithSameCaptain.length > 0) {
            this.components.toast.showError('Captain and Vice-Captain cannot be the same player in any team');
            return;
        }

        const analyzeBtn = document.getElementById('analyze-all-btn');
        const originalText = analyzeBtn.textContent;
        analyzeBtn.textContent = '🏆 Analyzing...';
        analyzeBtn.disabled = true;

        try {
            // Prepare teams data for enhanced analysis
            const formattedTeams = teamsToAnalyze.map(team => {
                // Convert players to the format expected by the analysis service
                const formattedPlayers = team.players.map(playerName => {
                    // Find validation result for this player to get role and team info
                    const validationResult = team.validationResults?.find(v => v.inputName === playerName);
                    return {
                        name: playerName,
                        role: validationResult?.role || 'Unknown',
                        team: validationResult?.team || 'Unknown'
                    };
                });

                return {
                    name: team.name,
                    players: formattedPlayers,
                    captain: team.captain,
                    viceCaptain: team.viceCaptain
                };
            });

            // Get venue stats data if available
            let venueStatsData = { success: false, data: null };
            try {
                const venueResponse = await fetch(`${CONSTANTS.API_BASE_URL}/venue-stats`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        teamA: this.currentMatchDetails.teamA,
                        teamB: this.currentMatchDetails.teamB,
                        matchDate: this.currentMatchDetails.matchDate
                    })
                });
                venueStatsData = await venueResponse.json();
            } catch (error) {
                console.log('Venue stats not available, proceeding without them');
            }

            // Use the enhanced multiple teams analysis
            const analysisData = {
                teams: formattedTeams,
                teamA: this.currentMatchDetails.teamA,
                teamB: this.currentMatchDetails.teamB,
                matchDate: this.currentMatchDetails.matchDate,
                venueStatsData: venueStatsData
            };

            const response = await fetch(`${CONSTANTS.API_BASE_URL}/analyze-multiple`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(analysisData)
            });

            const result = await response.json();
            
            if (result.success) {
                const title = this.currentTeams.length > 1 ? 'Enhanced Teams Analysis' : 'Enhanced Team Analysis';
                this.displayAnalysisResults(result.analysis, title);
            } else {
                this.components.toast.showError(result.message || 'Analysis failed');
            }

        } catch (error) {
            console.error('Team analysis error:', error);
            this.components.toast.showError('Failed to analyze team. Please try again.');
        } finally {
            analyzeBtn.textContent = originalText;
            analyzeBtn.disabled = false;
        }
    }



    async compareTeams() {
        if (this.currentTeams.length < 2) {
            this.components.toast.showError('Need at least 2 teams to compare');
            return;
        }

        const compareBtn = document.getElementById('compare-teams-btn');
        const originalText = compareBtn.textContent;
        compareBtn.textContent = '📈 Comparing...';
        compareBtn.disabled = true;

        try {
            const comparisonData = {
                teams: this.currentTeams,
                teamA: this.currentMatchDetails.teamA,
                teamB: this.currentMatchDetails.teamB,
                matchDate: this.currentMatchDetails.matchDate
            };

            const result = await this.components.teamAnalysis.compareTeams(comparisonData);
            
            if (result.success) {
                this.displayAnalysisResults(result.comparison, 'Teams Comparison');
            } else {
                this.components.toast.showError(result.message || 'Comparison failed');
            }

        } catch (error) {
            console.error('Team comparison error:', error);
            this.components.toast.showError('Failed to compare teams. Please try again.');
        } finally {
            compareBtn.textContent = originalText;
            compareBtn.disabled = false;
        }
    }

    displayAnalysisResults(content, title) {
        const resultsSection = document.getElementById('analysis-results');
        const analysisContent = document.getElementById('analysis-content');

        // Define the 7 criteria we're looking for
        const criteria = [
            'Team Balance',
            'Captaincy Choice', 
            'Match Advantage',
            'Venue Strategy',
            'Covariance Analysis',
            'Pitch Conditions',
            'Overall Rating'
        ];

        let html = '';

        // Split content by team sections (looking for **Team Name:** pattern)
        const teamMatches = content.match(/\*\*(.*?)\*\*:/g);
        
        if (teamMatches && teamMatches.length > 0) {
            // Multiple teams analysis
            teamMatches.forEach((teamMatch, index) => {
                const teamName = teamMatch.replace(/\*\*/g, '').replace(/:/g, '');
                // Find the content for this team
                const teamStart = content.indexOf(teamMatch);
                const nextTeamStart = content.indexOf('**', teamStart + teamMatch.length);
                const teamContent = nextTeamStart !== -1 
                    ? content.substring(teamStart + teamMatch.length, nextTeamStart)
                    : content.substring(teamStart + teamMatch.length);

                html += `<div class="font-bold text-2xl mb-3">${teamName}</div>`;

                // Parse each criterion for this team
                criteria.forEach((criterion) => {
                    const criterionPattern = new RegExp(`${criterion}:\\s*\\[Rating:\\s*([\d.]+/5)\\]\\s*-\\s*(.*?)(?=\\n|$)`, 'i');
                    const match = teamContent.match(criterionPattern);
                    if (match) {
                        const rating = match[1];
                        const explanation = this.convertMarkdownToHtml(match[2].trim());
                        html += `<div class="mb-3"><span class="font-bold text-2xl">${criterion}:</span> <span class="font-bold text-2xl">[Rating: ${rating}]</span> - <span class="text-base">${explanation}</span></div>`;
                    } else {
                        html += `<div class="mb-3"><span class="font-bold text-2xl">${criterion}:</span> <span class="text-gray-500 italic">Analysis pending</span></div>`;
                    }
                });
                html += `<br>`;
            });
        } else {
            // Fallback: Try to parse as a single team block with bold headings
            // Try to find a team name (e.g. **Team 1:**)
            const teamNameMatch = content.match(/\*\*(.*?)\*\*:/);
            if (teamNameMatch) {
                const teamName = teamNameMatch[1];
                html += `<div class="font-bold text-2xl mb-3">${teamName}</div>`;
                const teamContent = content.substring(teamNameMatch.index + teamNameMatch[0].length);
                criteria.forEach((criterion) => {
                    const criterionPattern = new RegExp(`${criterion}:\\s*\\[Rating:\\s*([\d.]+/5)\\]\\s*-\\s*(.*?)(?=\\n|$)`, 'i');
                    const match = teamContent.match(criterionPattern);
                    if (match) {
                        const rating = match[1];
                        const explanation = this.convertMarkdownToHtml(match[2].trim());
                        html += `<div class="mb-3"><span class="font-bold text-2xl">${criterion}:</span> <span class="font-bold text-2xl">[Rating: ${rating}]</span> - <span class="text-base">${explanation}</span></div>`;
                    } else {
                        html += `<div class="mb-3"><span class="font-bold text-2xl">${criterion}:</span> <span class="text-gray-500 italic">Analysis pending</span></div>`;
                    }
                });
            } else {
                // If not even a team name, just show the raw content with markdown conversion
                const convertedContent = this.convertMarkdownToHtml(content);
                html += `<div>${convertedContent}</div>`;
            }
        }

        analysisContent.innerHTML = html;
        resultsSection.classList.remove('hidden');
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    convertMarkdownToHtml(text) {
        if (!text) return text;
        
        // Convert **text** to <strong>text</strong>
        let converted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Convert *text* to <em>text</em> (italics)
        converted = converted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Convert line breaks to <br> tags
        converted = converted.replace(/\n/g, '<br>');
        
        return converted;
    }
}

// Initialize the team analysis page when DOM is loaded
let teamAnalysisPage;
document.addEventListener('DOMContentLoaded', function() {
    teamAnalysisPage = new TeamAnalysisPage();
}); 