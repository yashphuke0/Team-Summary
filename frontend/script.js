// Configuration
const API_BASE_URL = 'http://localhost:3001/api';

// IPL 2025 Teams
const iplTeams = [
    'Chennai Super Kings',
    'Mumbai Indians', 
    'Royal Challengers Bangalore',
    'Kolkata Knight Riders',
    'Delhi Capitals',
    'Punjab Kings',
    'Rajasthan Royals',
    'Sunrisers Hyderabad',
    'Gujarat Titans',
    'Lucknow Super Giants'
];

// DOM Elements
let fileInput, uploadArea, uploadContent, uploadLoading, imagePreview, previewImg, removeImageBtn;
let teamASelect, teamBSelect, matchDateInput;
let teamDataSection, playersListDiv, captainNameEl, viceCaptainNameEl, analyzeBtn;
let aiAnalysisSection, analysisLoading, analysisContent, analysisText;
let errorToast, errorMessage, successToast, successMessage;

// Global state
let currentFile = null;
let extractedTeamData = null;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    initializeEventListeners();
    populateTeamDropdowns();
    setDefaultDate();
});

function initializeElements() {
    // File upload elements
    fileInput = document.getElementById('file-input');
    uploadArea = document.getElementById('upload-area');
    uploadContent = document.getElementById('upload-content');
    uploadLoading = document.getElementById('upload-loading');
    imagePreview = document.getElementById('image-preview');
    previewImg = document.getElementById('preview-img');
    removeImageBtn = document.getElementById('remove-image');

    // Match details elements
    teamASelect = document.getElementById('team-a');
    teamBSelect = document.getElementById('team-b');
    matchDateInput = document.getElementById('match-date');

    // Team data elements
    teamDataSection = document.getElementById('team-data');
    playersListDiv = document.getElementById('players-list');
    captainNameEl = document.getElementById('captain-name');
    viceCaptainNameEl = document.getElementById('vice-captain-name');
    analyzeBtn = document.getElementById('analyze-btn');

    // AI analysis elements
    aiAnalysisSection = document.getElementById('ai-analysis');
    analysisLoading = document.getElementById('analysis-loading');
    analysisContent = document.getElementById('analysis-content');
    analysisText = document.getElementById('analysis-text');

    // Toast elements
    errorToast = document.getElementById('error-toast');
    errorMessage = document.getElementById('error-message');
    successToast = document.getElementById('success-toast');
    successMessage = document.getElementById('success-message');
}

function initializeEventListeners() {
    // File upload events
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);
    removeImageBtn.addEventListener('click', removeImage);

    // Team selection events
    teamASelect.addEventListener('change', validateTeamSelection);
    teamBSelect.addEventListener('change', validateTeamSelection);

    // Analyze button
    analyzeBtn.addEventListener('click', analyzeTeam);
}

function populateTeamDropdowns() {
    iplTeams.forEach(team => {
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

function setDefaultDate() {
    const today = new Date();
    matchDateInput.value = today.toISOString().split('T')[0];
}

// File handling functions
function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('border-primary', 'bg-blue-50');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('border-primary', 'bg-blue-50');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFile(file) {
    // Validate file
    if (!validateFile(file)) {
        return;
    }

    currentFile = file;
    showImagePreview(file);
    processImage(file);
}

function validateFile(file) {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];

    if (!allowedTypes.includes(file.type)) {
        showError('Please upload a valid image file (JPG, PNG)');
        return false;
    }

    if (file.size > maxSize) {
        showError('File size must be less than 5MB');
        return false;
    }

    return true;
}

function showImagePreview(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        previewImg.src = e.target.result;
        imagePreview.classList.remove('hidden');
        uploadContent.classList.add('hidden');
    };
    reader.readAsDataURL(file);
}

function removeImage() {
    currentFile = null;
    extractedTeamData = null;
    fileInput.value = '';
    imagePreview.classList.add('hidden');
    uploadContent.classList.remove('hidden');
    teamDataSection.classList.add('hidden');
    aiAnalysisSection.classList.add('hidden');
}

async function processImage(file) {
    try {
        showUploadLoading(true);
        
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch(`${API_BASE_URL}/ocr/process`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
            extractedTeamData = data.data;
            displayTeamData(data.data);
            showSuccess('Team data extracted successfully!');
        } else {
            throw new Error(data.message || 'Failed to process image');
        }

    } catch (error) {
        console.error('Error processing image:', error);
        showError('Failed to process image. Please try again.');
    } finally {
        showUploadLoading(false);
    }
}

function showUploadLoading(show) {
    if (show) {
        uploadContent.classList.add('hidden');
        uploadLoading.classList.remove('hidden');
    } else {
        uploadContent.classList.remove('hidden');
        uploadLoading.classList.add('hidden');
    }
}

function displayTeamData(data) {
    // Display players
    playersListDiv.innerHTML = '';
    data.players.forEach((player, index) => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'flex items-center justify-between py-1 px-2 bg-gray-50 rounded text-sm';
        playerDiv.innerHTML = `
            <span>${index + 1}. ${player}</span>
            ${player === data.captain ? '<span class="text-yellow-600 font-bold">C</span>' : ''}
            ${player === data.vice_captain ? '<span class="text-blue-600 font-bold">VC</span>' : ''}
        `;
        playersListDiv.appendChild(playerDiv);
    });

    // Display captain and vice-captain
    captainNameEl.textContent = data.captain || 'Not detected';
    viceCaptainNameEl.textContent = data.vice_captain || 'Not detected';

    // Show team data section
    teamDataSection.classList.remove('hidden');

    // Enable analyze button if match details are filled
    updateAnalyzeButton();
}

function validateTeamSelection() {
    const teamA = teamASelect.value;
    const teamB = teamBSelect.value;

    if (teamA && teamB && teamA === teamB) {
        showError('Team A and Team B cannot be the same');
        return false;
    }

    updateAnalyzeButton();
    return true;
}

function updateAnalyzeButton() {
    const hasTeamData = extractedTeamData && extractedTeamData.players.length > 0;
    const hasMatchDetails = teamASelect.value && teamBSelect.value && matchDateInput.value;
    const teamsAreDifferent = teamASelect.value !== teamBSelect.value;

    analyzeBtn.disabled = !(hasTeamData && hasMatchDetails && teamsAreDifferent);
}

async function analyzeTeam() {
    if (!extractedTeamData) {
        showError('Please upload and process a team screenshot first');
        return;
    }

    if (!validateTeamSelection()) {
        return;
    }

    try {
        showAnalysisLoading(true);
        aiAnalysisSection.classList.remove('hidden');

        const analysisData = {
            players: extractedTeamData.players,
            captain: extractedTeamData.captain,
            vice_captain: extractedTeamData.vice_captain,
            teamA: teamASelect.value,
            teamB: teamBSelect.value,
            matchDate: matchDateInput.value
        };

        const response = await fetch(`${API_BASE_URL}/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(analysisData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
            displayAnalysis(data.analysis);
            showSuccess('AI analysis completed!');
        } else {
            throw new Error(data.message || 'Failed to analyze team');
        }

    } catch (error) {
        console.error('Error analyzing team:', error);
        showError('Failed to analyze team. Please try again.');
    } finally {
        showAnalysisLoading(false);
    }
}

function showAnalysisLoading(show) {
    if (show) {
        analysisLoading.classList.remove('hidden');
        analysisContent.classList.add('hidden');
    } else {
        analysisLoading.classList.add('hidden');
        analysisContent.classList.remove('hidden');
    }
}

function displayAnalysis(analysis) {
    analysisText.innerHTML = formatAnalysisText(analysis);
}

function formatAnalysisText(text) {
    // Convert line breaks to HTML and add basic formatting
    return text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
            if (line.includes(':')) {
                const [title, ...content] = line.split(':');
                return `<p class="mb-2"><strong>${title.trim()}:</strong> ${content.join(':').trim()}</p>`;
            }
            return `<p class="mb-2">${line}</p>`;
        })
        .join('');
}

// Toast notification functions
function showError(message) {
    errorMessage.textContent = message;
    errorToast.classList.remove('translate-y-full');
    setTimeout(() => {
        errorToast.classList.add('translate-y-full');
    }, 5000);
}

function showSuccess(message) {
    successMessage.textContent = message;
    successToast.classList.remove('translate-y-full');
    setTimeout(() => {
        successToast.classList.add('translate-y-full');
    }, 3000);
}

// Utility functions
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
} 