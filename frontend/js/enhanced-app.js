// Enhanced Cricket Analyzer App - Unified Single & Multiple Team Analysis
class EnhancedCricketAnalyzerApp {
    constructor() {
        this.components = {};
        this.currentTeams = [];
        this.currentMatchDetails = null;
        this.selectedTeamIndex = -1;
        this.currentTeamData = null;
        this.analysisMode = 'single'; // 'single' or 'multiple'
        
        // Initialize components
        this.initializeComponents();
        this.setupEventListeners();
        this.populateTeamDropdowns();
        this.setDefaultDate();
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

        // Initialize Team Analysis
        this.components.teamAnalysis = new TeamAnalysis(CONSTANTS.API_BASE_URL);

        // Setup component callbacks
        this.setupComponentCallbacks();
    }

    setupComponentCallbacks() {
        // Match validation callbacks
        this.components.matchValidation.onValidationSuccess((matchDetails) => {
            this.currentMatchDetails = matchDetails;
            this.components.toast.showSuccess(`Match validated successfully!`);
            this.showUploadSection();
        });

        this.components.matchValidation.onValidationError((message) => {
            this.components.toast.showError(message);
        });
    }

    setupEventListeners() {
        // Tab switching
        const screenshotTab = document.getElementById('screenshot-tab');
        const csvTab = document.getElementById('csv-tab');

        screenshotTab.addEventListener('click', () => this.switchTab('screenshots'));
        csvTab.addEventListener('click', () => this.switchTab('csv'));

        // Screenshots upload
        const screenshotsUploadArea = document.getElementById('screenshots-upload-area');
        const screenshotsInput = document.getElementById('screenshots-input');
        
        screenshotsUploadArea.addEventListener('click', () => screenshotsInput.click());
        screenshotsInput.addEventListener('change', (e) => this.handleScreenshotsUpload(e));

        // CSV upload
        const csvUploadArea = document.getElementById('csv-upload-area');
        const csvInput = document.getElementById('csv-input');
        const downloadTemplateBtn = document.getElementById('download-template');
        
        csvUploadArea.addEventListener('click', () => csvInput.click());
        csvInput.addEventListener('change', (e) => this.handleCSVUpload(e));
        downloadTemplateBtn.addEventListener('click', () => this.downloadCSVTemplate());
    }

    switchTab(tabName) {
        const screenshotTab = document.getElementById('screenshot-tab');
        const csvTab = document.getElementById('csv-tab');
        const screenshotsSection = document.getElementById('screenshots-section');
        const csvSection = document.getElementById('csv-section');

        if (tabName === 'screenshots') {
            screenshotTab.classList.add('border-primary', 'text-primary');
            screenshotTab.classList.remove('border-transparent', 'text-gray-500');
            csvTab.classList.remove('border-primary', 'text-primary');
            csvTab.classList.add('border-transparent', 'text-gray-500');
            
            screenshotsSection.classList.remove('hidden');
            csvSection.classList.add('hidden');
        } else {
            csvTab.classList.add('border-primary', 'text-primary');
            csvTab.classList.remove('border-transparent', 'text-gray-500');
            screenshotTab.classList.remove('border-primary', 'text-primary');
            screenshotTab.classList.add('border-transparent', 'text-gray-500');
            
            csvSection.classList.remove('hidden');
            screenshotsSection.classList.add('hidden');
        }
    }

    populateTeamDropdowns() {
        const teamASelect = document.getElementById('team-a');
        const teamBSelect = document.getElementById('team-b');

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

    setDefaultDate() {
        const matchDateInput = document.getElementById('match-date');
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        matchDateInput.value = tomorrow.toISOString().split('T')[0];
    }

    showUploadSection() {
        const uploadSection = document.getElementById('upload-section');
        if (uploadSection) {
            uploadSection.classList.remove('hidden');
            uploadSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    async handleScreenshotsUpload(e) {
        const files = Array.from(e.target.files);
        
        if (files.length === 0) return;

        // Validate files
        if (files.length > 10) {
            this.components.toast.showError('Maximum 10 screenshots allowed');
            return;
        }

        const validFiles = files.filter(file => {
            if (file.size > 5 * 1024 * 1024) {
                this.components.toast.showError(`${file.name} is too large (max 5MB)`);
                return false;
            }
            if (!file.type.startsWith('image/')) {
                this.components.toast.showError(`${file.name} is not an image file`);
                return false;
            }
            return true;
        });

        if (validFiles.length === 0) return;

        // Show preview
        this.showScreenshotsPreview(validFiles);

        // Process screenshots
        this.showScreenshotsLoading(true);
        
        try {
            const teams = [];
            
            for (let i = 0; i < validFiles.length; i++) {
                const file = validFiles[i];
                const formData = new FormData();
                formData.append('image', file);

                const response = await fetch(`${CONSTANTS.API_BASE_URL}/ocr/process`, {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();
                
                if (result.success) {
                    teams.push({
                        name: `Team ${i + 1}`,
                        players: result.data.players,
                        captain: result.data.captain || '',
                        viceCaptain: result.data.vice_captain || '',
                        source: 'screenshot',
                        fileName: file.name
                    });
                } else {
                    this.components.toast.showError(`Failed to process ${file.name}: ${result.message}`);
                }
            }

            this.showScreenshotsLoading(false);
            
            if (teams.length > 0) {
                this.currentTeams = teams;
                this.analysisMode = teams.length === 1 ? 'single' : 'multiple';
                this.displayTeamsSummary();
                this.components.toast.showSuccess(`Successfully processed ${teams.length} team(s)`);
            }

        } catch (error) {
            console.error('Screenshots processing error:', error);
            this.showScreenshotsLoading(false);
            this.components.toast.showError('Failed to process screenshots. Please try again.');
        }
    }

    async handleCSVUpload(e) {
        const file = e.target.files[0];
        
        if (!file) return;

        // Validate file
        if (file.size > 1024 * 1024) {
            this.components.toast.showError('CSV file is too large (max 1MB)');
            return;
        }

        if (!file.name.endsWith('.csv')) {
            this.components.toast.showError('Please upload a CSV file');
            return;
        }

        this.showCSVLoading(true);

        try {
            const formData = new FormData();
            formData.append('csv', file);

            const response = await fetch(`${CONSTANTS.API_BASE_URL}/csv/process-teams`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            this.showCSVLoading(false);

            if (result.success) {
                this.currentTeams = result.data.teams;
                this.analysisMode = this.currentTeams.length === 1 ? 'single' : 'multiple';
                this.displayTeamsSummary();
                this.components.toast.showSuccess(`Successfully processed ${this.currentTeams.length} team(s) from CSV`);
            } else {
                this.components.toast.showError(result.message || 'Failed to process CSV file');
            }

        } catch (error) {
            console.error('CSV processing error:', error);
            this.showCSVLoading(false);
            this.components.toast.showError('Failed to process CSV file. Please try again.');
        }
    }

    showScreenshotsPreview(files) {
        const preview = document.getElementById('screenshots-preview');
        const grid = document.getElementById('screenshots-grid');
        
        grid.innerHTML = '';
        
        files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const div = document.createElement('div');
                div.className = 'relative rounded-lg overflow-hidden border border-gray-200';
                div.innerHTML = `
                    <img src="${e.target.result}" class="w-full h-20 object-cover" alt="Preview ${index + 1}">
                    <div class="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center">
                        ${file.name.substring(0, 15)}${file.name.length > 15 ? '...' : ''}
                    </div>
                `;
                grid.appendChild(div);
            };
            reader.readAsDataURL(file);
        });
        
        preview.classList.remove('hidden');
    }

    showScreenshotsLoading(show) {
        const loading = document.getElementById('screenshots-loading');
        const content = document.getElementById('screenshots-upload-content');
        
        if (show) {
            loading.classList.remove('hidden');
            content.classList.add('hidden');
        } else {
            loading.classList.add('hidden');
            content.classList.remove('hidden');
        }
    }

    showCSVLoading(show) {
        const loading = document.getElementById('csv-loading');
        const content = document.getElementById('csv-upload-content');
        
        if (show) {
            loading.classList.remove('hidden');
            content.classList.add('hidden');
        } else {
            loading.classList.add('hidden');
            content.classList.remove('hidden');
        }
    }

    displayTeamsSummary() {
        // Save data to sessionStorage for the analysis page
        sessionStorage.setItem('uploadedTeams', JSON.stringify(this.currentTeams));
        sessionStorage.setItem('matchDetails', JSON.stringify(this.currentMatchDetails));
        
        // Show success message and redirect
        this.components.toast.showSuccess(`✅ Successfully processed ${this.currentTeams.length} team(s). Redirecting to analysis...`);
        
        // Redirect to the team analysis page
        setTimeout(() => {
            window.location.href = 'team-analysis-enhanced.html';
        }, 1500);
    }



    downloadCSVTemplate() {
        const csvContent = `TeamName,Players,Captain,ViceCaptain
Team Alpha,"Virat Kohli, Rohit Sharma, MS Dhoni, Jasprit Bumrah, Ravindra Jadeja, Hardik Pandya, KL Rahul, Yuzvendra Chahal, Andre Russell, Jos Buttler, Rashid Khan",Virat Kohli,Rohit Sharma
Team Beta,"Rohit Sharma, Virat Kohli, MS Dhoni, Jasprit Bumrah, Ravindra Jadeja, Hardik Pandya, KL Rahul, Yuzvendra Chahal, Andre Russell, Jos Buttler, Rashid Khan",Rohit Sharma,Virat Kohli`;

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'team_template.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.components.toast.showSuccess('CSV template downloaded successfully');
    }
}

// Initialize the enhanced app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new EnhancedCricketAnalyzerApp();
}); 