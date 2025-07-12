// Match Validation Component
class MatchValidation {
    constructor(apiBaseUrl) {
        this.apiBaseUrl = apiBaseUrl;
        this.matchValidated = false;
        this.currentMatchDetails = null;
        this.onValidationSuccessCallback = null;
        this.onValidationErrorCallback = null;
        
        // IPL 2025 Teams
        this.iplTeams = [
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
    }

    initialize(teamAId, teamBId, matchDateId, validateBtnId) {
        this.teamASelect = document.getElementById(teamAId);
        this.teamBSelect = document.getElementById(teamBId);
        this.matchDateInput = document.getElementById(matchDateId);
        this.validateMatchBtn = document.getElementById(validateBtnId);
        
        this.populateTeamDropdowns();
        this.setDefaultDate();
        this.setupEventListeners();
    }

    populateTeamDropdowns() {
        this.iplTeams.forEach(team => {
            const optionA = document.createElement('option');
            optionA.value = team;
            optionA.textContent = team;
            this.teamASelect.appendChild(optionA);

            const optionB = document.createElement('option');
            optionB.value = team;
            optionB.textContent = team;
            this.teamBSelect.appendChild(optionB);
        });
    }

    setDefaultDate() {
        const today = new Date();
        this.matchDateInput.value = today.toISOString().split('T')[0];
    }

    setupEventListeners() {
        this.validateMatchBtn.addEventListener('click', this.validateMatch.bind(this));
        this.teamASelect.addEventListener('change', this.resetMatchValidation.bind(this));
        this.teamBSelect.addEventListener('change', this.resetMatchValidation.bind(this));
        this.matchDateInput.addEventListener('change', this.resetMatchValidation.bind(this));
    }

    async validateMatch() {
        const teamA = this.teamASelect.value;
        const teamB = this.teamBSelect.value;
        const matchDate = this.matchDateInput.value;

        if (!teamA || !teamB || !matchDate) {
            this.showError('Please select both teams and match date');
            return;
        }

        if (teamA === teamB) {
            this.showError('Please select different teams');
            return;
        }

        try {
            this.setValidateMatchButtonLoading(true);

            const response = await fetch(`${this.apiBaseUrl}/validate-match`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ teamA, teamB, matchDate })
            });

            const result = await response.json();

            if (result.success) {
                this.matchValidated = true;
                this.currentMatchDetails = { teamA, teamB, matchDate };
                
                this.showSuccess(`✅ Match validated: ${teamA} vs ${teamB} on ${this.formatDate(matchDate)}`);
                this.updateValidateMatchButton('✅ Match Validated', true);
                this.setValidateMatchButtonLoading(false);
                
                if (this.onValidationSuccessCallback) {
                    this.onValidationSuccessCallback(this.currentMatchDetails);
                }
            } else {
                this.matchValidated = false;
                this.currentMatchDetails = null;
                this.showError(result.message);
                this.updateValidateMatchButton('🔍 Validate Match', false);
                this.setValidateMatchButtonLoading(false);
                
                if (this.onValidationErrorCallback) {
                    this.onValidationErrorCallback(result.message);
                }
            }
        } catch (error) {
            console.error('Match validation error:', error);
            this.showError('Failed to validate match. Please try again.');
            this.setValidateMatchButtonLoading(false);
        }
    }

    resetMatchValidation() {
        this.matchValidated = false;
        this.currentMatchDetails = null;
        this.updateValidateMatchButton('🔍 Validate Match', false);
        
        // Hide upload section when match validation is reset
        const uploadSection = document.getElementById('upload-section');
        if (uploadSection) {
            uploadSection.classList.add('hidden');
        }
    }

    setValidateMatchButtonLoading(loading) {
        if (loading) {
            this.validateMatchBtn.innerHTML = '<div class="inline-flex items-center"><div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>Validating...</div>';
            this.validateMatchBtn.disabled = true;
        }
    }

    updateValidateMatchButton(text, validated) {
        this.validateMatchBtn.innerHTML = text;
        this.validateMatchBtn.disabled = false;
        
        if (validated) {
            this.validateMatchBtn.classList.remove('from-primary', 'to-primary-light', 'hover:from-primary-light', 'hover:to-secondary');
            this.validateMatchBtn.classList.add('from-success', 'to-cricket-green', 'hover:from-cricket-green', 'hover:to-success');
        } else {
            this.validateMatchBtn.classList.remove('from-success', 'to-cricket-green', 'hover:from-cricket-green', 'hover:to-success');
            this.validateMatchBtn.classList.add('from-primary', 'to-primary-light', 'hover:from-primary-light', 'hover:to-secondary');
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }

    isMatchValidated() {
        return this.matchValidated;
    }

    getCurrentMatchDetails() {
        return this.currentMatchDetails;
    }

    onValidationSuccess(callback) {
        this.onValidationSuccessCallback = callback;
    }

    onValidationError(callback) {
        this.onValidationErrorCallback = callback;
    }

    showError(message) {
        if (this.onValidationErrorCallback) {
            this.onValidationErrorCallback(message);
        }
    }

    showSuccess(message) {
        // This will be handled by the main app's toast system
        if (window.showSuccess) {
            window.showSuccess(message);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MatchValidation;
} else {
    window.MatchValidation = MatchValidation;
} 

