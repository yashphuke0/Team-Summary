// Tabbed Team Analysis App
class TabbedTeamAnalysisApp {
    constructor() {
        console.log('TabbedTeamAnalysisApp constructor called');
        
        this.components = {};
        this.currentTeams = [];
        this.currentMatchDetails = null;
        this.selectedTeamIndex = -1;
        this.currentTeamData = null;
        this.analysisData = null;
        this.activeTab = 'team-analysis';
        
        // Test DOM elements immediately
        this.testDOMElements();
        
        // Initialize components
        this.initializeComponents();
        this.setupEventListeners();
        this.loadDataFromSession();
        
        // Initialize tabs after a short delay to ensure DOM is ready
        setTimeout(() => {
            this.initializeTabs();
        }, 100);
    }
    
    testDOMElements() {
        console.log('Testing DOM elements...');
        const testElements = [
            'h2h-team-a-name',
            'h2h-team-b-name', 
            'h2h-total-matches',
            'recent-form-team-a-name',
            'recent-form-team-b-name'
        ];
        
        testElements.forEach(id => {
            const element = document.getElementById(id);
            console.log(`${id}: ${element ? 'FOUND' : 'NOT FOUND'}`);
        });
    }

    initializeComponents() {
        // Initialize Toast notifications
        this.components.toast = new Toast();
        
        // Initialize other components
        this.components.matchValidation = new MatchValidation(CONSTANTS.API_BASE_URL);
        this.components.playerValidation = new PlayerValidation(CONSTANTS.API_BASE_URL);
        this.components.teamAnalysis = new TeamAnalysis(CONSTANTS.API_BASE_URL);
        
        // Set up component callbacks
        this.setupComponentCallbacks();
    }

    setupComponentCallbacks() {
        // Set up analysis callbacks
        this.components.teamAnalysis.onAnalysisComplete((data) => {
            this.analysisData = data;
            this.populateAnalysisData();
        });

        this.components.teamAnalysis.onAnalysisError((error) => {
            this.components.toast.showError(`Analysis failed: ${error.message}`);
        });
    }

    setupEventListeners() {
        // Tab switching
        document.getElementById('team-analysis-tab').addEventListener('click', async () => await this.switchTab('team-analysis'));
        document.getElementById('venue-analysis-tab').addEventListener('click', async () => await this.switchTab('venue-analysis'));
        document.getElementById('team-details-tab').addEventListener('click', async () => await this.switchTab('team-details'));
        document.getElementById('teams-summary-tab').addEventListener('click', async () => await this.switchTab('teams-summary'));

        // Team selector
        document.getElementById('team-selector').addEventListener('change', (e) => this.handleTeamSelection(e));

        // Captain/Vice-captain selection
        document.getElementById('captain-select').addEventListener('change', (e) => this.handleCaptainSelection(e));
        document.getElementById('vice-captain-select').addEventListener('change', (e) => this.handleViceCaptainSelection(e));

        // Analysis buttons
        document.getElementById('analyze-all-btn').addEventListener('click', () => this.analyzeAllTeams());
        document.getElementById('compare-teams-btn').addEventListener('click', () => this.compareTeams());
    }

    async initializeTabs() {
        // Set initial active tab
        await this.switchTab('team-analysis');
    }

    async switchTab(tabName) {
        console.log(`Switching to tab: ${tabName}`);
        
        // Update active tab
        this.activeTab = tabName;

        // Update tab button styles
        const tabButtons = [
            'team-analysis-tab',
            'venue-analysis-tab', 
            'team-details-tab',
            'teams-summary-tab'
        ];

        tabButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (buttonId === `${tabName}-tab`) {
                button.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700');
                button.classList.add('border-primary', 'text-primary');
            } else {
                button.classList.remove('border-primary', 'text-primary');
                button.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700');
            }
        });

        // Show/hide tab content
        const tabContents = [
            'team-analysis-content',
            'venue-analysis-content',
            'team-details-content', 
            'teams-summary-content'
        ];

        tabContents.forEach(contentId => {
            const content = document.getElementById(contentId);
            if (contentId === `${tabName}-content`) {
                content.classList.remove('hidden');
                content.classList.add('active');
                console.log(`Made ${contentId} visible`);
                
                // Data will be loaded through loadTeamAnalysisData() when tab is activated
            } else {
                content.classList.add('hidden');
                content.classList.remove('active');
            }
        });

        // Load additional data for the active tab
        await this.loadTabData(tabName);
    }

    async loadTabData(tabName) {
        switch(tabName) {
            case 'team-analysis':
                await this.loadTeamAnalysisData();
                break;
            case 'venue-analysis':
                await this.loadVenueAnalysisData();
                break;
            case 'team-details':
                this.loadTeamDetailsData();
                break;
            case 'teams-summary':
                this.loadTeamsSummaryData();
                break;
        }
    }

    loadDataFromSession() {
        try {
            const teamsData = sessionStorage.getItem('uploadedTeams');
            const matchData = sessionStorage.getItem('matchDetails');

            if (teamsData) {
                this.currentTeams = JSON.parse(teamsData);
            }

            if (matchData) {
                this.currentMatchDetails = JSON.parse(matchData);
                this.displayMatchInfo();
            }

            // If no data exists, create sample data for testing
            if (!this.currentMatchDetails) {
                console.log('No match details found, creating sample data for testing');
                this.currentMatchDetails = {
                    teamA: 'Mumbai Indians',
                    teamB: 'Chennai Super Kings',
                    matchDate: '2024-04-15'
                };
                this.displayMatchInfo();
            }

            if (this.currentTeams.length === 0) {
                console.log('No teams found, creating sample data for testing');
                this.currentTeams = [
                    {
                        name: 'Team 1',
                        players: ['Virat Kohli', 'Rohit Sharma', 'MS Dhoni', 'Jasprit Bumrah', 'Ravindra Jadeja'],
                        captain: 'Virat Kohli',
                        viceCaptain: 'Rohit Sharma'
                    },
                    {
                        name: 'Team 2', 
                        players: ['KL Rahul', 'Shikhar Dhawan', 'Hardik Pandya', 'Yuzvendra Chahal', 'Bhuvneshwar Kumar'],
                        captain: 'KL Rahul',
                        viceCaptain: 'Hardik Pandya'
                    }
                ];
            }

            if (this.currentTeams.length > 0) {
                this.populateTeamSelector();
                this.displayTeamsSummary();
            }

        } catch (error) {
            console.error('Error loading session data:', error);
            this.components.toast.showError('Failed to load saved data');
        }
    }

    displayMatchInfo() {
        if (!this.currentMatchDetails) return;

        const matchInfo = document.getElementById('match-info');
        
        // Get team logo data
        const teamA = TabbedTeamAnalysisApp.TEAM_LOGOS[this.currentMatchDetails.teamA] || { 
            short: this.currentMatchDetails.teamA, 
            image: null, 
            fallbackColor: 'bg-gray-500' 
        };
        const teamB = TabbedTeamAnalysisApp.TEAM_LOGOS[this.currentMatchDetails.teamB] || { 
            short: this.currentMatchDetails.teamB, 
            image: null, 
            fallbackColor: 'bg-gray-500' 
        };
        
        matchInfo.innerHTML = `
            <div class="flex justify-between items-center p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg">
                <div class="text-center flex-1">
                    <div class="flex flex-col items-center">
                        <div class="w-12 h-12 rounded-full flex items-center justify-center mb-2 shadow-lg overflow-hidden bg-white">
                            ${teamA.image ? 
                                `<img src="${teamA.image}" alt="${teamA.short}" class="w-full h-full object-contain p-1" 
                                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                 <div class="w-full h-full ${teamA.fallbackColor} flex items-center justify-center" style="display: none;">
                                     <span class="font-bold text-lg text-white">${teamA.short}</span>
                                 </div>` :
                                `<div class="w-full h-full ${teamA.fallbackColor} flex items-center justify-center">
                                     <span class="font-bold text-lg text-white">${teamA.short}</span>
                                 </div>`
                            }
                        </div>
                        <div class="font-bold text-gray-800 text-sm">${teamA.short}</div>
                    </div>
                </div>
                <div class="mx-4 flex items-center">
                    <div class="bg-primary text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">VS</div>
                </div>
                <div class="text-center flex-1">
                    <div class="flex flex-col items-center">
                        <div class="w-12 h-12 rounded-full flex items-center justify-center mb-2 shadow-lg overflow-hidden bg-white">
                            ${teamB.image ? 
                                `<img src="${teamB.image}" alt="${teamB.short}" class="w-full h-full object-contain p-1" 
                                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                 <div class="w-full h-full ${teamB.fallbackColor} flex items-center justify-center" style="display: none;">
                                     <span class="font-bold text-lg text-white">${teamB.short}</span>
                                 </div>` :
                                `<div class="w-full h-full ${teamB.fallbackColor} flex items-center justify-center">
                                     <span class="font-bold text-lg text-white">${teamB.short}</span>
                                 </div>`
                            }
                        </div>
                        <div class="font-bold text-gray-800 text-sm">${teamB.short}</div>
                    </div>
                </div>
            </div>
            <div class="text-center mt-3">
                <div class="text-sm text-gray-600">Match Date: ${this.currentMatchDetails.matchDate}</div>
            </div>
        `;
    }

    populateTeamSelector() {
        const selector = document.getElementById('team-selector');
        selector.innerHTML = '<option value="">Choose a team to configure captain/vice-captain</option>';
        
        this.currentTeams.forEach((team, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = team.name;
            selector.appendChild(option);
        });
    }

    handleTeamSelection(e) {
        const teamIndex = parseInt(e.target.value);
        if (teamIndex >= 0 && teamIndex < this.currentTeams.length) {
            this.selectedTeamIndex = teamIndex;
            this.currentTeamData = this.currentTeams[teamIndex];
            this.displayTeamDetails();
            this.populateCaptainSelectors();
        } else {
            this.selectedTeamIndex = -1;
            this.currentTeamData = null;
            this.hideTeamDetails();
        }
    }

    displayTeamDetails() {
        const teamDetails = document.getElementById('team-details');
        const playersList = document.getElementById('players-list');
        
        if (!this.currentTeamData) return;

        // Display players
        playersList.innerHTML = this.currentTeamData.players.map((player, index) => `
            <div class="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                <span class="text-sm font-medium text-gray-900">${index + 1}. ${player}</span>
                <span class="text-xs text-gray-500">Player</span>
            </div>
        `).join('');

        teamDetails.classList.remove('hidden');
    }

    hideTeamDetails() {
        const teamDetails = document.getElementById('team-details');
        teamDetails.classList.add('hidden');
    }

    populateCaptainSelectors() {
        if (!this.currentTeamData) return;

        const captainSelect = document.getElementById('captain-select');
        const viceCaptainSelect = document.getElementById('vice-captain-select');

        // Clear existing options
        captainSelect.innerHTML = '<option value="">Select Captain</option>';
        viceCaptainSelect.innerHTML = '<option value="">Select Vice-Captain</option>';

        // Add player options
        this.currentTeamData.players.forEach(player => {
            const captainOption = document.createElement('option');
            captainOption.value = player;
            captainOption.textContent = player;
            captainSelect.appendChild(captainOption);

            const viceCaptainOption = document.createElement('option');
            viceCaptainOption.value = player;
            viceCaptainOption.textContent = player;
            viceCaptainSelect.appendChild(viceCaptainOption);
        });

        // Set current values if they exist
        if (this.currentTeamData.captain) {
            captainSelect.value = this.currentTeamData.captain;
        }
        if (this.currentTeamData.viceCaptain) {
            viceCaptainSelect.value = this.currentTeamData.viceCaptain;
        }
    }

    handleCaptainSelection(e) {
        if (this.currentTeamData) {
            this.currentTeamData.captain = e.target.value;
            this.updateTeamData();
        }
    }

    handleViceCaptainSelection(e) {
        if (this.currentTeamData) {
            this.currentTeamData.viceCaptain = e.target.value;
            this.updateTeamData();
        }
    }

    updateTeamData() {
        if (this.selectedTeamIndex >= 0) {
            this.currentTeams[this.selectedTeamIndex] = this.currentTeamData;
            sessionStorage.setItem('uploadedTeams', JSON.stringify(this.currentTeams));
        }
    }

    displayTeamsSummary() {
        const summaryList = document.getElementById('teams-summary-list');
        
        if (this.currentTeams.length === 0) {
            summaryList.innerHTML = '<div class="text-center text-gray-500">No teams available</div>';
            return;
        }

        summaryList.innerHTML = this.currentTeams.map((team, index) => `
            <div class="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div class="flex items-center justify-between mb-2">
                    <h4 class="font-semibold text-sm text-gray-900">${team.name}</h4>
                    <span class="text-xs text-gray-500">${team.players.length} players</span>
                </div>
                <div class="text-xs text-gray-600 mb-2">
                    <div>Captain: ${team.captain || 'Not selected'}</div>
                    <div>Vice-Captain: ${team.viceCaptain || 'Not selected'}</div>
                </div>
                <div class="text-xs text-gray-500">
                    ${team.source === 'screenshot' ? '📸 Screenshot' : '📊 CSV'}
                </div>
            </div>
        `).join('');
    }

    async loadTeamAnalysisData() {
        console.log('Loading additional team analysis data from API...');
        
        if (!this.currentMatchDetails) {
            console.log('No match details available');
            return;
        }

        try {
            // Fetch real data from APIs
            const [teamFormData, headToHeadData] = await Promise.all([
                this.fetchTeamRecentForm(),
                this.fetchHeadToHead()
            ]);

            // Populate with real data
            this.populateTeamFormData(teamFormData);
            this.populateHeadToHeadData(headToHeadData);
            console.log('Additional team analysis data loaded successfully from API');

        } catch (error) {
            console.error('Error loading additional team analysis data:', error);
            this.components.toast.showError('Failed to load additional team analysis data');
        }
    }
    
    populateTeamFormData(data) {
        console.log('Populating team form data with real API data...');
        
        if (!this.currentMatchDetails) return;

        // Helper to get short name
        const getShort = (name) => TabbedTeamAnalysisApp.TEAM_SHORT_NAMES[name] || name;
        const teamAShort = getShort(this.currentMatchDetails.teamA);
        const teamBShort = getShort(this.currentMatchDetails.teamB);

        // Get team logo data
        const teamA = TabbedTeamAnalysisApp.TEAM_LOGOS[this.currentMatchDetails.teamA] || { 
            short: teamAShort, 
            image: null, 
            fallbackColor: 'bg-gray-500' 
        };
        const teamB = TabbedTeamAnalysisApp.TEAM_LOGOS[this.currentMatchDetails.teamB] || { 
            short: teamBShort, 
            image: null, 
            fallbackColor: 'bg-gray-500' 
        };

        // Use real API data or fallback to sample data
        let teamAFormSquares = '';
        let teamBFormSquares = '';
        let teamAWins = 0;
        let teamBWins = 0;

        if (data && data.success && data.data) {
            const teamAData = data.data.teamA;
            const teamBData = data.data.teamB;
            
            // Create form squares for Team A
            if (teamAData && teamAData.matches) {
                teamAFormSquares = teamAData.matches.map(m => {
                    if (m.result === 'Win') {
                        return '<div class="w-4 h-4 bg-green-200 rounded flex items-center justify-center"><span class="text-green-600 font-bold text-xs">W</span></div>';
                    } else if (m.result === 'Loss') {
                        return '<div class="w-4 h-4 bg-red-100 rounded flex items-center justify-center"><span class="text-red-600 font-bold text-xs">L</span></div>';
                    } else {
                        return '<div class="w-4 h-4 bg-gray-100 rounded flex items-center justify-center"><span class="text-gray-500 font-bold text-xs">-</span></div>';
                    }
                }).join('');
                teamAWins = teamAData.matches.filter(m => m.result === 'Win').length;
            }
            
            // Create form squares for Team B
            if (teamBData && teamBData.matches) {
                teamBFormSquares = teamBData.matches.map(m => {
                    if (m.result === 'Win') {
                        return '<div class="w-4 h-4 bg-green-200 rounded flex items-center justify-center"><span class="text-green-600 font-bold text-xs">W</span></div>';
                    } else if (m.result === 'Loss') {
                        return '<div class="w-4 h-4 bg-red-100 rounded flex items-center justify-center"><span class="text-red-600 font-bold text-xs">L</span></div>';
                    } else {
                        return '<div class="w-4 h-4 bg-gray-100 rounded flex items-center justify-center"><span class="text-gray-500 font-bold text-xs">-</span></div>';
                    }
                }).join('');
                teamBWins = teamBData.matches.filter(m => m.result === 'Win').length;
            }
        } else {
            // Fallback to sample data if API fails
            teamAFormSquares = '<div class="w-4 h-4 bg-green-200 rounded flex items-center justify-center"><span class="text-green-600 font-bold text-xs">W</span></div>' +
                              '<div class="w-4 h-4 bg-red-100 rounded flex items-center justify-center"><span class="text-red-600 font-bold text-xs">L</span></div>' +
                              '<div class="w-4 h-4 bg-green-200 rounded flex items-center justify-center"><span class="text-green-600 font-bold text-xs">W</span></div>' +
                              '<div class="w-4 h-4 bg-gray-100 rounded flex items-center justify-center"><span class="text-gray-500 font-bold text-xs">-</span></div>' +
                              '<div class="w-4 h-4 bg-red-100 rounded flex items-center justify-center"><span class="text-red-600 font-bold text-xs">L</span></div>';

            teamBFormSquares = '<div class="w-4 h-4 bg-red-100 rounded flex items-center justify-center"><span class="text-red-600 font-bold text-xs">L</span></div>' +
                              '<div class="w-4 h-4 bg-green-200 rounded flex items-center justify-center"><span class="text-green-600 font-bold text-xs">W</span></div>' +
                              '<div class="w-4 h-4 bg-red-100 rounded flex items-center justify-center"><span class="text-red-600 font-bold text-xs">L</span></div>' +
                              '<div class="w-4 h-4 bg-green-200 rounded flex items-center justify-center"><span class="text-green-600 font-bold text-xs">W</span></div>' +
                              '<div class="w-4 h-4 bg-gray-100 rounded flex items-center justify-center"><span class="text-gray-500 font-bold text-xs">-</span></div>';

            teamAWins = 3;
            teamBWins = 2;
        }

        // Find the recent form container specifically within the team analysis tab
        const teamAnalysisContent = document.getElementById('team-analysis-content');
        const recentFormContainer = teamAnalysisContent ? teamAnalysisContent.querySelector('.bg-gray-50.rounded-lg.p-3.border.border-gray-100') : null;
        
        if (recentFormContainer) {
            recentFormContainer.innerHTML = `
                <div class="flex items-center mb-2">
                    <span class="font-bold text-sm text-gray-900">Recent Form (Last 5 Matches)</span>
                </div>
                
                <!-- Team A Row -->
                <div class="flex items-center justify-between text-xs font-medium mb-2">
                    <div class="flex items-center gap-2">
                        <div class="w-5 h-5 rounded-full flex items-center justify-center overflow-hidden bg-white shadow-sm">
                            ${teamA.image ? 
                                `<img src="${teamA.image}" alt="${teamA.short}" class="w-full h-full object-contain p-0.5" 
                                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                 <div class="w-full h-full ${teamA.fallbackColor} flex items-center justify-center" style="display: none;">
                                     <span class="font-bold text-xs text-white">${teamA.short}</span>
                                 </div>` :
                                `<div class="w-full h-full ${teamA.fallbackColor} flex items-center justify-center">
                                     <span class="font-bold text-xs text-white">${teamA.short}</span>
                                 </div>`
                            }
                        </div>
                        <div class="font-semibold text-xs">${teamAShort}</div>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="font-semibold text-xs">${teamBShort}</div>
                        <div class="w-5 h-5 rounded-full flex items-center justify-center overflow-hidden bg-white shadow-sm">
                            ${teamB.image ? 
                                `<img src="${teamB.image}" alt="${teamB.short}" class="w-full h-full object-contain p-0.5" 
                                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                 <div class="w-full h-full ${teamB.fallbackColor} flex items-center justify-center" style="display: none;">
                                     <span class="font-bold text-xs text-white">${teamB.short}</span>
                                 </div>` :
                                `<div class="w-full h-full ${teamB.fallbackColor} flex items-center justify-center">
                                     <span class="font-bold text-xs text-white">${teamB.short}</span>
                                 </div>`
                            }
                        </div>
                    </div>
                </div>
                
                <!-- Team B Row -->
                <div class="flex items-center justify-between text-xs font-medium">
                    <div class="flex gap-1">
                        ${teamAFormSquares}
                    </div>
                    <div class="flex gap-1">
                        ${teamBFormSquares}
                    </div>
                </div>
                
                <!-- Win counts -->
                <div class="flex justify-between mt-2">
                    <div class="text-gray-600 text-xs">${teamAWins}/5 wins</div>
                    <div class="text-gray-600 text-xs">${teamBWins}/5 wins</div>
                </div>
                
                <div class="text-center mt-2">
                    <div class="text-xs text-gray-500 italic">Most recent matches from left to right</div>
                </div>
            `;
            console.log('Enhanced team form data displayed successfully');
        } else {
            console.error('Recent form container not found');
        }
    }
    
    populateHeadToHeadData(data) {
        console.log('Populating head-to-head data with real API data...');
        if (!this.currentMatchDetails) return;

        // Helper to get short name
        const getShort = (name) => TabbedTeamAnalysisApp.TEAM_SHORT_NAMES[name] || name;
        const teamAShort = getShort(this.currentMatchDetails.teamA);
        const teamBShort = getShort(this.currentMatchDetails.teamB);

        // Use real API data or fallback to sample data
        let teamAWins = 0;
        let teamBWins = 0;
        let totalMatches = 0;
        let teamAWinRate = 0;
        let teamBWinRate = 0;

        if (data && data.success && data.data) {
            teamAWins = data.data.teamAWins || 0;
            teamBWins = data.data.teamBWins || 0;
            totalMatches = data.data.totalMatches || 0;
            
            // Calculate win rates
            if (totalMatches > 0) {
                teamAWinRate = Math.round((teamAWins / totalMatches) * 100);
                teamBWinRate = Math.round((teamBWins / totalMatches) * 100);
            }
        } else {
            // Fallback to sample data if API fails
            teamAWins = 8;
            teamBWins = 7;
            totalMatches = 15;
            teamAWinRate = Math.round((teamAWins / totalMatches) * 100);
            teamBWinRate = Math.round((teamBWins / totalMatches) * 100);
        }

        // Find the head-to-head container specifically within the team analysis tab
        const teamAnalysisContent = document.getElementById('team-analysis-content');
        const headToHeadContainers = teamAnalysisContent ? teamAnalysisContent.querySelectorAll('.bg-gray-50.rounded-lg.p-3.border.border-gray-100') : [];
        const headToHeadContainer = headToHeadContainers[1]; // Second container is head-to-head
        
        if (headToHeadContainer) {
            headToHeadContainer.innerHTML = `
                <div class="flex items-center mb-2">
                    <span class="font-bold text-sm text-gray-900">Head-to-Head Record</span>
                </div>
                <div class="grid grid-cols-3 gap-2 items-end text-center text-xs font-semibold mb-1">
                    <div class="flex flex-col gap-0.5 items-center border-r border-gray-200 pr-2">
                        <div class="text-xs text-gray-700 font-bold mb-1">${teamAShort}</div>
                        <div class="text-lg text-primary font-bold">${teamAWins}</div>
                        <div class="text-xs text-gray-700">Wins</div>
                    </div>
                    <div class="flex flex-col gap-0.5 items-center">
                        <div class="text-xs text-gray-700 font-bold mb-1">Matches</div>
                        <div class="text-lg text-gray-700 font-bold">${totalMatches}</div>
                        <div class="text-xs text-gray-700">Total</div>
                    </div>
                    <div class="flex flex-col gap-0.5 items-center border-l border-gray-200 pl-2">
                        <div class="text-xs text-gray-700 font-bold mb-1">${teamBShort}</div>
                        <div class="text-lg text-primary font-bold">${teamBWins}</div>
                        <div class="text-xs text-gray-700">Wins</div>
                    </div>
                </div>
                <div class="grid grid-cols-3 gap-2 text-xs mt-1 text-center">
                    <div class="text-green-700 text-xs">${teamAWinRate}% win rate</div>
                    <div></div>
                    <div class="text-orange-700 text-xs">${teamBWinRate}% win rate</div>
                </div>
            `;
            console.log('Compact head-to-head data displayed successfully');
        } else {
            console.error('Head-to-head container not found');
        }
    }

    async fetchTeamRecentForm() {
        const response = await fetch(`${CONSTANTS.API_BASE_URL}/team-recent-form`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                teamA: this.currentMatchDetails.teamA,
                teamB: this.currentMatchDetails.teamB,
                matchDate: this.currentMatchDetails.matchDate
            })
        });

        if (!response.ok) throw new Error('Failed to fetch team form data');
        const result = await response.json();
        return result; // Return the full result object
    }

    async fetchHeadToHead() {
        const response = await fetch(`${CONSTANTS.API_BASE_URL}/head-to-head`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                teamA: this.currentMatchDetails.teamA,
                teamB: this.currentMatchDetails.teamB,
                matchDate: this.currentMatchDetails.matchDate
            })
        });

        if (!response.ok) throw new Error('Failed to fetch head-to-head data');
        const result = await response.json();
        return result; // Return the full result object
    }



    async loadVenueAnalysisData() {
        if (!this.currentMatchDetails) return;

        try {
            // Fetch real venue data from API
            const venueStatsData = await this.fetchVenueStats();
            this.displayVenueData(venueStatsData);
        } catch (error) {
            console.error('Error loading venue analysis data:', error);
            this.components.toast.showError('Failed to load venue analysis data');
        }
    }

    async fetchVenueStats() {
        const response = await fetch(`${CONSTANTS.API_BASE_URL}/venue-stats`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                teamA: this.currentMatchDetails.teamA,
                teamB: this.currentMatchDetails.teamB,
                matchDate: this.currentMatchDetails.matchDate
            })
        });

        if (!response.ok) throw new Error('Failed to fetch venue stats');
        const result = await response.json();
        return result; // Return the full result object
    }

    displayVenueData(data) {
        console.log('Displaying venue data...');
        
        try {
            // Helper to get short name
            const getShort = (name) => TabbedTeamAnalysisApp.TEAM_SHORT_NAMES[name] || name;
            const teamAShort = getShort(this.currentMatchDetails.teamA);
            const teamBShort = getShort(this.currentMatchDetails.teamB);
            
            const venueNameElement = document.getElementById('venue-name');
            const venueLocationElement = document.getElementById('venue-location');
            const venuePitchTypeElement = document.getElementById('venue-pitch-type');
            const venue1stInningsElement = document.getElementById('venue-1st-innings');
            const venue2ndInningsElement = document.getElementById('venue-2nd-innings');
            const venueChaseSuccessElement = document.getElementById('venue-chase-success');
            const venueTeamARecordElement = document.getElementById('venue-team-a-record');
            const venueTeamBRecordElement = document.getElementById('venue-team-b-record');
            const venueTossStrategyElement = document.getElementById('venue-toss-strategy');
            const venueTossNoteElement = document.getElementById('venue-toss-note');
            
            if (venueNameElement && venueLocationElement && venuePitchTypeElement && 
                venue1stInningsElement && venue2ndInningsElement && venueChaseSuccessElement &&
                venueTeamARecordElement && venueTeamBRecordElement && venueTossStrategyElement && venueTossNoteElement) {
                
                // Use real API data or fallback to sample data
                if (data && data.success && data.data && data.data.venueStats) {
                    const stats = data.data.venueStats;
                    venueNameElement.textContent = stats.venue_name || 'Unknown Venue';
                    venueLocationElement.textContent = stats.location || 'Unknown Location';
                    venuePitchTypeElement.textContent = `${stats.pitch_type || 'Unknown'} ${stats.pitch_rating ? '(' + stats.pitch_rating + ')' : ''}`;
                    venue1stInningsElement.textContent = stats.avg_first_innings_score || 'N/A';
                    venue2ndInningsElement.textContent = stats.avg_second_innings_score || 'N/A';
                    venueChaseSuccessElement.textContent = stats.chase_success_rate ? stats.chase_success_rate + '%' : 'N/A';
                    
                    // Handle team records from team_venue_performance
                    const teamPerformance = stats.team_venue_performance || {};
                    const teamARecord = teamPerformance[this.currentMatchDetails.teamA]?.record;
                    const teamBRecord = teamPerformance[this.currentMatchDetails.teamB]?.record;
                    
                    venueTeamARecordElement.textContent = teamARecord ? `${teamAShort}: ${teamARecord}` : `${teamAShort}: N/A`;
                    venueTeamBRecordElement.textContent = teamBRecord ? `${teamBShort}: ${teamBRecord}` : `${teamBShort}: N/A`;
                    venueTossStrategyElement.textContent = stats.toss_decision_suggestion || 'N/A';
                    venueTossNoteElement.textContent = stats.chase_success_rate ? `Chase success rate: ${stats.chase_success_rate}%` : 'N/A';
                } else {
                    // Fallback to sample data if API fails
                    venueNameElement.textContent = 'M. Chinnaswamy Stadium';
                    venueLocationElement.textContent = 'Bangalore, Karnataka';
                    venuePitchTypeElement.textContent = 'Batting Friendly';
                    venue1stInningsElement.textContent = '185';
                    venue2ndInningsElement.textContent = '165';
                    venueChaseSuccessElement.textContent = '45%';
                    venueTeamARecordElement.textContent = `${teamAShort}: 8/12`;
                    venueTeamBRecordElement.textContent = `${teamBShort}: 5/10`;
                    venueTossStrategyElement.textContent = 'Prefer Batting First';
                    venueTossNoteElement.textContent = 'Low chase success rate';
                }
                
                console.log('Venue data displayed successfully');
            } else {
                console.error('Some venue elements not found');
            }
        } catch (error) {
            console.error('Error displaying venue data:', error);
        }
    }

    loadTeamDetailsData() {
        // Team details are loaded when tab is switched
        // Data is already populated from handleTeamSelection
    }

    loadTeamsSummaryData() {
        // Teams summary is loaded when tab is switched
        // Data is already populated from displayTeamsSummary
    }

    populateAnalysisData() {
        // Populate data for all tabs
        this.loadTeamAnalysisData();
        this.loadVenueAnalysisData();
    }

    async analyzeAllTeams() {
        if (this.currentTeams.length === 0) {
            this.components.toast.showError('No teams available for analysis');
            return;
        }

        try {
            this.components.toast.showSuccess('Starting analysis...');
            
            // Analyze each team
            const analysisPromises = this.currentTeams.map(async (team) => {
                if (!team.captain || !team.viceCaptain) {
                    return { team: team.name, error: 'Captain/Vice-captain not selected' };
                }

                const analysisData = {
                    teamA: this.currentMatchDetails.teamA,
                    teamB: this.currentMatchDetails.teamB,
                    matchDate: this.currentMatchDetails.matchDate,
                    players: team.players,
                    captain: team.captain,
                    viceCaptain: team.viceCaptain
                };

                try {
                    const summary = await this.components.teamAnalysis.generateTeamSummary(analysisData);
                    return { team: team.name, summary };
                } catch (error) {
                    return { team: team.name, error: error.message };
                }
            });

            const results = await Promise.all(analysisPromises);
            
            // Display results
            this.displayAnalysisResults(results);
            
        } catch (error) {
            console.error('Analysis error:', error);
            this.components.toast.showError('Failed to analyze teams');
        }
    }

    displayAnalysisResults(results) {
        // Create a modal or expand the teams summary to show results
        const summaryList = document.getElementById('teams-summary-list');
        
        summaryList.innerHTML = results.map(result => `
            <div class="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <h4 class="font-semibold text-sm text-gray-900 mb-2">${result.team}</h4>
                ${result.error ? 
                    `<div class="text-red-600 text-xs">${result.error}</div>` :
                    `<div class="text-sm text-gray-700 whitespace-pre-line">${result.summary}</div>`
                }
            </div>
        `).join('');

        this.components.toast.showSuccess('Analysis completed!');
    }

    compareTeams() {
        if (this.currentTeams.length < 2) {
            this.components.toast.showError('Need at least 2 teams to compare');
            return;
        }

        // Implement team comparison logic
        this.components.toast.showSuccess('Team comparison feature coming soon!');
    }

    // Loading and error handling methods
    showTabLoading(tabName) {
        const contentId = `${tabName}-content`;
        const content = document.getElementById(contentId);
        
        if (content) {
            // Store original content if not already stored
            if (!content.dataset.originalContent) {
                content.dataset.originalContent = content.innerHTML;
            }
            
            const loadingHtml = `
                <div class="flex items-center justify-center py-8">
                    <div class="relative">
                        <div class="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    </div>
                    <span class="ml-3 text-sm text-gray-600">Loading ${tabName.replace('-', ' ')}...</span>
                </div>
            `;
            content.innerHTML = loadingHtml;
        }
    }

    hideTabLoading(tabName) {
        const contentId = `${tabName}-content`;
        const content = document.getElementById(contentId);
        
        if (content && content.dataset.originalContent) {
            // Restore original content if it was stored
            content.innerHTML = content.dataset.originalContent;
            delete content.dataset.originalContent;
        }
    }

    showTabError(tabName) {
        const contentId = `${tabName}-content`;
        const content = document.getElementById(contentId);
        
        if (content) {
            const errorHtml = `
                <div class="flex items-center justify-center py-8">
                    <div class="text-center">
                        <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                            </svg>
                        </div>
                        <p class="text-sm text-gray-600">Failed to load data</p>
                        <button onclick="window.location.reload()" class="mt-2 text-xs text-primary hover:underline">Try again</button>
                    </div>
                </div>
            `;
            content.innerHTML = errorHtml;
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

    // Team logo and external URL mapping
    static TEAM_LOGOS = {
        'Chennai Super Kings': { 
            short: 'CSK', 
            image: 'https://r2.thesportsdb.com/images/media/team/badge/okceh51487601098.png/medium', 
            fallbackColor: 'bg-yellow-500' 
        },
        'Mumbai Indians': { 
            short: 'MI', 
            image: 'https://r2.thesportsdb.com/images/media/team/badge/l40j8p1487678631.png/medium',
            fallbackColor: 'bg-blue-600' 
        },
        'Royal Challengers Bengaluru': { 
            short: 'RCB', 
            image: 'https://r2.thesportsdb.com/images/media/team/badge/kynj5v1588331757.png/medium',
            fallbackColor: 'bg-red-600' 
        },
        'Sunrisers Hyderabad': { 
            short: 'SRH', 
            image: 'https://r2.thesportsdb.com/images/media/team/badge/sc7m161487419327.png/medium',
            fallbackColor: 'bg-orange-500' 
        },
        'Rajasthan Royals': { 
            short: 'RR', 
            image: 'https://r2.thesportsdb.com/images/media/team/badge/lehnfw1487601864.png/medium',
            fallbackColor: 'bg-pink-500' 
        },
        'Delhi Capitals': { 
            short: 'DC', 
            image: 'https://r2.thesportsdb.com/images/media/team/badge/dg4g0z1587334054.png/medium',
            fallbackColor: 'bg-blue-500' 
        },
        'Kolkata Knight Riders': { 
            short: 'KKR', 
            image: 'https://r2.thesportsdb.com/images/media/team/badge/ows99r1487678296.png/medium',
            fallbackColor: 'bg-purple-600' 
        },
        'Punjab Kings': { 
            short: 'PBKS', 
            image: 'https://r2.thesportsdb.com/images/media/team/badge/r1tcie1630697821.png/medium',
            fallbackColor: 'bg-red-500' 
        },
        'Lucknow Super Giants': { 
            short: 'LSG', 
            image: 'https://r2.thesportsdb.com/images/media/team/badge/4tzmfa1647445839.png/medium',
            fallbackColor: 'bg-green-600' 
        },
        'Gujarat Titans': { 
            short: 'GT', 
            image: 'https://r2.thesportsdb.com/images/media/team/badge/6qw4r71654174508.png/medium',
            fallbackColor: 'bg-blue-400' 
        },
    };
}

// Initialize the tabbed app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new TabbedTeamAnalysisApp();
}); 