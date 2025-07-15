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
                
                // Immediately populate data for team analysis tab
                if (contentId === 'team-analysis-content' && this.currentMatchDetails) {
                    console.log('Immediately populating team analysis data...');
                    this.populateTeamFormData();
                    this.populateHeadToHeadData();
                }
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
        matchInfo.innerHTML = `
            <div class="grid grid-cols-2 gap-4 text-center">
                <div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div class="font-semibold text-sm text-gray-900">${this.currentMatchDetails.teamA}</div>
                    <div class="text-xs text-gray-500">Team A</div>
                </div>
                <div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div class="font-semibold text-sm text-gray-900">${this.currentMatchDetails.teamB}</div>
                    <div class="text-xs text-gray-500">Team B</div>
                </div>
            </div>
            <div class="text-center mt-3">
                <div class="text-sm font-medium text-gray-700">${new Date(this.currentMatchDetails.matchDate).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                })}</div>
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
        console.log('Loading additional team analysis data...');
        
        if (!this.currentMatchDetails) {
            console.log('No match details available');
            return;
        }

        try {
            // Populate the data directly without showing loading state
            // since the data is already available
            this.populateTeamFormData();
            this.populateHeadToHeadData();
            console.log('Additional team analysis data loaded successfully');

        } catch (error) {
            console.error('Error loading additional team analysis data:', error);
            this.components.toast.showError('Failed to load additional team analysis data');
        }
    }
    
    populateTeamFormData() {
        console.log('Populating team form data directly...');
        
        // Debug: Check DOM state
        console.log('Current DOM state:');
        console.log('All elements with "recent-form" in ID:', document.querySelectorAll('[id*="recent-form"]').length);
        console.log('All elements with "h2h" in ID:', document.querySelectorAll('[id*="h2h"]').length);
        
        // Check if team analysis content exists
        const teamAnalysisContent = document.getElementById('team-analysis-content');
        console.log('Team analysis content exists:', !!teamAnalysisContent);
        if (teamAnalysisContent) {
            console.log('Team analysis content classes:', teamAnalysisContent.className);
            console.log('Team analysis content innerHTML length:', teamAnalysisContent.innerHTML.length);
        }
        
        // Direct element access and population
        const elements = {
            'recent-form-team-a-name': this.currentMatchDetails.teamA,
            'recent-form-team-a-seq': 'W-L-W-D-L',
            'recent-form-team-a-wins': '3/5 wins',
            'recent-form-team-b-name': this.currentMatchDetails.teamB,
            'recent-form-team-b-seq': 'L-W-L-W-D',
            'recent-form-team-b-wins': '2/5 wins'
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
                console.log(`Populated ${id}: ${value}`);
                // Debug: Check if element is visible
                const computedStyle = window.getComputedStyle(element);
                console.log(`Element ${id} visibility:`, {
                    display: computedStyle.display,
                    visibility: computedStyle.visibility,
                    opacity: computedStyle.opacity,
                    textContent: element.textContent,
                    innerHTML: element.innerHTML
                });
            } else {
                console.error(`Element not found: ${id}`);
                // Try to find it in the entire document
                const allElements = document.querySelectorAll(`[id="${id}"]`);
                console.log(`Elements with ID "${id}" found:`, allElements.length);
            }
        });
    }
    
    populateHeadToHeadData() {
        console.log('Populating head-to-head data directly...');
        
        // Debug: Check DOM state
        console.log('Current DOM state for head-to-head:');
        console.log('All elements with "h2h" in ID:', document.querySelectorAll('[id*="h2h"]').length);
        
        // Check if team analysis content exists
        const teamAnalysisContent = document.getElementById('team-analysis-content');
        console.log('Team analysis content exists for h2h:', !!teamAnalysisContent);
        if (teamAnalysisContent) {
            console.log('Team analysis content classes for h2h:', teamAnalysisContent.className);
            console.log('Team analysis content innerHTML length for h2h:', teamAnalysisContent.innerHTML.length);
        }
        
        // Direct element access and population
        const elements = {
            'h2h-team-a-name': this.currentMatchDetails.teamA,
            'h2h-team-b-name': this.currentMatchDetails.teamB,
            'h2h-total-matches': '15',
            'h2h-team-a-wins': '8',
            'h2h-team-b-wins': '7',
            'h2h-team-a-rate': '53%',
            'h2h-team-b-rate': '47%'
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
                console.log(`Populated ${id}: ${value}`);
                // Debug: Check if element is visible
                const computedStyle = window.getComputedStyle(element);
                console.log(`Element ${id} visibility:`, {
                    display: computedStyle.display,
                    visibility: computedStyle.visibility,
                    opacity: computedStyle.opacity,
                    textContent: element.textContent,
                    innerHTML: element.innerHTML
                });
            } else {
                console.error(`Element not found: ${id}`);
                // Try to find it in the entire document
                const allElements = document.querySelectorAll(`[id="${id}"]`);
                console.log(`Elements with ID "${id}" found:`, allElements.length);
            }
        });
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
        return result.success ? result.data : result;
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
        return result.success ? result.data : result;
    }

    displayTeamFormData(data) {
        console.log('Displaying team form data...');
        
        try {
            // Ensure the team analysis tab is visible
            const teamAnalysisContent = document.getElementById('team-analysis-content');
            if (teamAnalysisContent) {
                teamAnalysisContent.classList.remove('hidden');
                teamAnalysisContent.classList.add('active');
            }
            
            // For now, show placeholder data since team form service might not be fully implemented
            // We'll show sample data to demonstrate the interface
            const teamANameElement = document.getElementById('recent-form-team-a-name');
            const teamASeqElement = document.getElementById('recent-form-team-a-seq');
            const teamAWinsElement = document.getElementById('recent-form-team-a-wins');
            
            const teamBNameElement = document.getElementById('recent-form-team-b-name');
            const teamBSeqElement = document.getElementById('recent-form-team-b-seq');
            const teamBWinsElement = document.getElementById('recent-form-team-b-wins');
            
            if (teamANameElement && teamASeqElement && teamAWinsElement && 
                teamBNameElement && teamBSeqElement && teamBWinsElement) {
                
                teamANameElement.textContent = this.currentMatchDetails.teamA;
                teamASeqElement.innerHTML = '<div class="font-mono font-bold text-base mb-1 text-blue-700">W-L-W-D-L</div>';
                teamAWinsElement.textContent = '3/5 wins';
                
                teamBNameElement.textContent = this.currentMatchDetails.teamB;
                teamBSeqElement.innerHTML = '<div class="font-mono font-bold text-base mb-1 text-blue-700">L-W-L-W-D</div>';
                teamBWinsElement.textContent = '2/5 wins';
                
                console.log('Team form data displayed successfully');
            } else {
                console.error('Some team form elements not found');
            }
        } catch (error) {
            console.error('Error displaying team form data:', error);
        }
    }

    displayHeadToHeadData(data) {
        console.log('Displaying head-to-head data...');
        
        try {
            // Try multiple approaches to find elements
            let teamANameElement = document.getElementById('h2h-team-a-name');
            let teamBNameElement = document.getElementById('h2h-team-b-name');
            let totalMatchesElement = document.getElementById('h2h-total-matches');
            let teamAWinsElement = document.getElementById('h2h-team-a-wins');
            let teamBWinsElement = document.getElementById('h2h-team-b-wins');
            let teamARateElement = document.getElementById('h2h-team-a-rate');
            let teamBRateElement = document.getElementById('h2h-team-b-rate');
            
            // If elements not found by ID, try querySelector
            if (!teamANameElement) {
                teamANameElement = document.querySelector('#h2h-team-a-name');
            }
            if (!teamBNameElement) {
                teamBNameElement = document.querySelector('#h2h-team-b-name');
            }
            if (!totalMatchesElement) {
                totalMatchesElement = document.querySelector('#h2h-total-matches');
            }
            if (!teamAWinsElement) {
                teamAWinsElement = document.querySelector('#h2h-team-a-wins');
            }
            if (!teamBWinsElement) {
                teamBWinsElement = document.querySelector('#h2h-team-b-wins');
            }
            if (!teamARateElement) {
                teamARateElement = document.querySelector('#h2h-team-a-rate');
            }
            if (!teamBRateElement) {
                teamBRateElement = document.querySelector('#h2h-team-b-rate');
            }
            
            // Debug: Log which elements are found
            console.log('Head-to-head elements found:', {
                teamAName: !!teamANameElement,
                teamBName: !!teamBNameElement,
                totalMatches: !!totalMatchesElement,
                teamAWins: !!teamAWinsElement,
                teamBWins: !!teamBWinsElement,
                teamARate: !!teamARateElement,
                teamBRate: !!teamBRateElement
            });
            
            if (teamANameElement && teamBNameElement && totalMatchesElement && 
                teamAWinsElement && teamBWinsElement && teamARateElement && teamBRateElement) {
                
                teamANameElement.textContent = this.currentMatchDetails.teamA;
                teamBNameElement.textContent = this.currentMatchDetails.teamB;
                totalMatchesElement.textContent = '15';
                teamAWinsElement.textContent = '8';
                teamBWinsElement.textContent = '7';
                teamARateElement.textContent = '53%';
                teamBRateElement.textContent = '47%';
                
                console.log('Head-to-head data displayed successfully');
            } else {
                console.error('Some head-to-head elements not found. Missing elements:');
                if (!teamANameElement) console.error('- h2h-team-a-name');
                if (!teamBNameElement) console.error('- h2h-team-b-name');
                if (!totalMatchesElement) console.error('- h2h-total-matches');
                if (!teamAWinsElement) console.error('- h2h-team-a-wins');
                if (!teamBWinsElement) console.error('- h2h-team-b-wins');
                if (!teamARateElement) console.error('- h2h-team-a-rate');
                if (!teamBRateElement) console.error('- h2h-team-b-rate');
                
                // Try to create elements if they don't exist
                this.createHeadToHeadElements();
            }
        } catch (error) {
            console.error('Error displaying head-to-head data:', error);
        }
    }
    
    createHeadToHeadElements() {
        console.log('Creating head-to-head elements dynamically...');
        
        // Find the head-to-head section
        const headToHeadSection = document.querySelector('.bg-gray-50.rounded-lg.p-3.border.border-gray-100');
        if (!headToHeadSection) {
            console.error('Head-to-head section not found');
            return;
        }
        
        // Create and populate elements
        const teamAName = document.createElement('div');
        teamAName.id = 'h2h-team-a-name';
        teamAName.textContent = this.currentMatchDetails.teamA;
        teamAName.className = 'text-2xs text-gray-700';
        
        const teamBName = document.createElement('div');
        teamBName.id = 'h2h-team-b-name';
        teamBName.textContent = this.currentMatchDetails.teamB;
        teamBName.className = 'text-2xs text-gray-700';
        
        const totalMatches = document.createElement('div');
        totalMatches.id = 'h2h-total-matches';
        totalMatches.textContent = '15';
        totalMatches.className = 'text-lg text-gray-700 font-bold';
        
        const teamAWins = document.createElement('div');
        teamAWins.id = 'h2h-team-a-wins';
        teamAWins.textContent = '8';
        teamAWins.className = 'text-lg text-primary font-bold';
        
        const teamBWins = document.createElement('div');
        teamBWins.id = 'h2h-team-b-wins';
        teamBWins.textContent = '7';
        teamBWins.className = 'text-lg text-primary font-bold';
        
        const teamARate = document.createElement('div');
        teamARate.id = 'h2h-team-a-rate';
        teamARate.textContent = '53%';
        teamARate.className = 'text-green-700 text-xs';
        
        const teamBRate = document.createElement('div');
        teamBRate.id = 'h2h-team-b-rate';
        teamBRate.textContent = '47%';
        teamBRate.className = 'text-orange-700 text-xs';
        
        console.log('Head-to-head elements created successfully');
    }

    async loadVenueAnalysisData() {
        if (!this.currentMatchDetails) return;

        try {
            // For now, use sample data to demonstrate the interface
            // In production, you would fetch real data from the API
            this.displayVenueData(null);
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
        return result.success ? result.data : result;
    }

    displayVenueData(data) {
        console.log('Displaying venue data...');
        
        try {
            // Show sample data for demonstration
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
                
                venueNameElement.textContent = 'M. Chinnaswamy Stadium';
                venueLocationElement.textContent = 'Bangalore, Karnataka';
                venuePitchTypeElement.textContent = 'Batting Friendly';
                venue1stInningsElement.textContent = '185';
                venue2ndInningsElement.textContent = '165';
                venueChaseSuccessElement.textContent = '45%';
                venueTeamARecordElement.textContent = `${this.currentMatchDetails.teamA}: 8/12`;
                venueTeamBRecordElement.textContent = `${this.currentMatchDetails.teamB}: 5/10`;
                venueTossStrategyElement.textContent = 'Prefer Batting First';
                venueTossNoteElement.textContent = 'Low chase success rate';
                
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
}

// Initialize the tabbed app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new TabbedTeamAnalysisApp();
}); 