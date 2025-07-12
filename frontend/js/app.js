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



        // Setup component callbacks
        this.setupComponentCallbacks();
    }

    setupComponentCallbacks() {
        // Match validation callbacks
        this.components.matchValidation.onValidationSuccess((matchDetails) => {
            // Clear relevant sessionStorage keys when a new match is validated
            sessionStorage.removeItem('teamData');
            sessionStorage.removeItem('matchData');
            sessionStorage.removeItem('playerValidationResults');
            sessionStorage.removeItem('selectedCaptain');
            sessionStorage.removeItem('selectedViceCaptain');
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






    }

    setupEventListeners() {
        // Remove image button
        const removeImageBtn = document.getElementById('remove-image');
        if (removeImageBtn) {
            removeImageBtn.addEventListener('click', () => this.removeImage());
        }






    }

    showUploadSection() {
        const uploadSection = document.getElementById('upload-section');
        if (uploadSection) {
            uploadSection.classList.remove('hidden');
            uploadSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    async handleFileUpload(file) {
        // Clear relevant sessionStorage keys before uploading a new screenshot
        sessionStorage.removeItem('teamData');
        sessionStorage.removeItem('matchData');
        sessionStorage.removeItem('playerValidationResults');
        sessionStorage.removeItem('selectedCaptain');
        sessionStorage.removeItem('selectedViceCaptain');
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
                this.components.toast.showSuccess(`✅ Extracted ${result.data.players.length} players from screenshot. Redirecting to team analysis...`);
                
                // Save basic team data to sessionStorage
                this.saveBasicTeamData(result.data);
                // Debug log
                console.log('Saved to sessionStorage (handleFileUpload):', {
                  teamData: JSON.parse(sessionStorage.getItem('teamData')),
                  matchData: JSON.parse(sessionStorage.getItem('matchData'))
                });
                // Navigate directly to team analysis page
                setTimeout(() => {
                    this.navigateToAnalysis();
                }, 1500);
            } else {
                this.components.toast.showError(result.message || 'Failed to process image');
            }

        } catch (error) {
            console.error('Image processing error:', error);
            this.components.fileUpload.showLoading(false);
            this.components.toast.showError('Failed to process image. Please try again.');
        }
    }





    removeImage() {
        const imagePreview = document.getElementById('image-preview');
        const uploadContent = document.getElementById('upload-content');

        // Hide preview and show upload content
        imagePreview.classList.add('hidden');
        uploadContent.classList.remove('hidden');

        // Reset data
        this.currentFile = null;
        this.extractedTeamData = null;
        this.playerValidationResults = null;

        this.components.toast.showSuccess('Image removed successfully');
    }

    saveBasicTeamData(extractedData) {
        try {
            // Save basic team data
            const teamData = {
                players: extractedData.players.map(playerName => ({
                    name: playerName,
                    role: 'Unknown',
                    team: 'Unknown',
                    isValid: false,
                    inputName: playerName
                })),
                totalPlayers: extractedData.players.length,
                validPlayers: 0
            };

            // Save match data
            const matchData = this.components.matchValidation.getCurrentMatchDetails();

            sessionStorage.setItem('teamData', JSON.stringify(teamData));
            sessionStorage.setItem('matchData', JSON.stringify(matchData));
            // Debug log
            console.log('Saved to sessionStorage (saveBasicTeamData):', { teamData, matchData });
        } catch (error) {
            console.error('Error saving basic team data to sessionStorage:', error);
        }
    }

    saveTeamDataToStorage(validationResult) {
        try {
            // Save team data
            const teamData = {
                players: validationResult.validationResults.map(player => ({
                    name: player.isValid ? player.validatedName : player.inputName,
                    role: player.role || 'Unknown',
                    team: player.team || 'Unknown',
                    isValid: player.isValid,
                    inputName: player.inputName
                })),
                totalPlayers: validationResult.totalPlayers || 11,
                validPlayers: validationResult.validationResults.filter(p => p.isValid).length
            };

            // Save match data
            const matchData = this.components.matchValidation.getCurrentMatchDetails();

            sessionStorage.setItem('teamData', JSON.stringify(teamData));
            sessionStorage.setItem('matchData', JSON.stringify(matchData));
            sessionStorage.setItem('playerValidationResults', JSON.stringify(validationResult));
            // Debug log
            console.log('Saved to sessionStorage (saveTeamDataToStorage):', { teamData, matchData, validationResult });
        } catch (error) {
            console.error('Error saving data to sessionStorage:', error);
        }
    }

    navigateToAnalysis() {
        window.location.href = 'team-analysis.html';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    window.cricketAnalyzerApp = new CricketAnalyzerApp();
});