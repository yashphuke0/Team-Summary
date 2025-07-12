// Team Performance Page JavaScript
class TeamPerformancePage {
    constructor() {
        this.apiBaseUrl = API_BASE_URL;
        this.teamAnalysis = new TeamAnalysis(this.apiBaseUrl);
        this.toast = new Toast();
        this.toast.initialize(
            'error-toast', 'error-message',
            'success-toast', 'success-message'
        );
        this.loadAndAnalyze();
        // Add summarize button handler
        const summarizeBtn = document.getElementById('summarize-btn');
        if (summarizeBtn) {
            summarizeBtn.addEventListener('click', () => this.handleSummarizeClick());
        }
    }

    async loadAndAnalyze() {
        try {
            // Load data from sessionStorage
            const teamData = JSON.parse(sessionStorage.getItem('teamData'));
            const matchData = JSON.parse(sessionStorage.getItem('matchData'));
            const validationResults = JSON.parse(sessionStorage.getItem('playerValidationResults'));

            console.log('Team Performance Page - Loaded data:', {
                teamData: teamData ? 'Found' : 'Not found',
                matchData: matchData ? 'Found' : 'Not found',
                validationResults: validationResults ? 'Found' : 'Not found'
            });

            if (!teamData || !matchData) {
                this.toast.showError('No team data found. Please go back and upload a team screenshot.');
                return;
            }

            // Get captain and vice-captain from sessionStorage
            let captainName = sessionStorage.getItem('selectedCaptain');
            let viceCaptainName = sessionStorage.getItem('selectedViceCaptain');
            
            console.log('Loading captain from sessionStorage:', captainName);
            console.log('Loading vice-captain from sessionStorage:', viceCaptainName);
            
            // If not found, try to get from validationResults or teamData
            if (!captainName || !viceCaptainName) {
                // fallback: try to get from validationResults or teamData
                captainName = teamData.captain || '';
                viceCaptainName = teamData.viceCaptain || '';
            }
            if (!captainName || !viceCaptainName) {
                this.toast.showError('Please select both Captain and Vice-Captain before analyzing.');
                return;
            }

            console.log('Proceeding with analysis using:', {
                captain: captainName,
                viceCaptain: viceCaptainName,
                teamA: matchData.teamA,
                teamB: matchData.teamB,
                matchDate: matchData.matchDate
            });

            // Show loading
            document.getElementById('ai-analysis').classList.remove('hidden');
            document.getElementById('analysis-loading').classList.remove('hidden');
            document.getElementById('analysis-content').classList.add('hidden');

            // Prepare players array (ensure array of strings)
            const players = teamData.players.map(p => typeof p === 'string' ? p : p.name);

            // Perform team analysis
            const analysisResult = await this.teamAnalysis.analyzeTeam({
                teamA: matchData.teamA,
                teamB: matchData.teamB,
                matchDate: matchData.matchDate,
                players,
                captain: captainName,
                viceCaptain: viceCaptainName
            });

            // Hide loading and show content
            document.getElementById('analysis-loading').classList.add('hidden');
            document.getElementById('analysis-content').classList.remove('hidden');

            // Display analysis results
            this.displayAnalysisResults(analysisResult);

        } catch (error) {
            console.error('Analysis error:', error);
            document.getElementById('analysis-loading').classList.add('hidden');
            this.toast.showError('Error analyzing team. Please try again.');
        }
    }

    async handleSummarizeClick() {
        // Gather all required data from sessionStorage
        const teamData = JSON.parse(sessionStorage.getItem('teamData') || '{}');
        const matchData = JSON.parse(sessionStorage.getItem('matchData') || '{}');
        const validatedPlayers = JSON.parse(sessionStorage.getItem('validatedPlayers') || '[]');
        const captain = sessionStorage.getItem('selectedCaptain') || '';
        const viceCaptain = sessionStorage.getItem('selectedViceCaptain') || '';
        // Compose summary input
        const summaryInput = {
            teamA: matchData.teamA,
            teamB: matchData.teamB,
            matchDate: matchData.matchDate,
            players: validatedPlayers,
            captain,
            viceCaptain
        };
        // Call backend /api/analyze endpoint
        await this.generateSummaryFromBackend(summaryInput);
    }

    async generateSummaryFromBackend(summaryInput) {
        try {
            // Show summary section and loading
            document.getElementById('team-summary').classList.remove('hidden');
            document.getElementById('summary-loading').classList.remove('hidden');
            document.getElementById('summary-content').classList.add('hidden');

            // POST to backend /api/team-summary
            const response = await fetch(`${this.apiBaseUrl}/team-summary`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(summaryInput)
            });
            const result = await response.json();

            // Hide loading and show content
            document.getElementById('summary-loading').classList.add('hidden');
            document.getElementById('summary-content').classList.remove('hidden');

            // Display summary
            const summaryText = result.summary || result.analysis || 'No summary available.';
            document.getElementById('summary-text').innerHTML = this.formatSummaryText(summaryText);
        } catch (error) {
            console.error('Summary generation error:', error);
            document.getElementById('summary-loading').classList.add('hidden');
            this.toast.showError('Error generating summary. Please try again.');
        }
    }

    displayAnalysisResults(results) {
        // Helper to extract .data if present
        function extractData(obj) {
            return obj && obj.data ? obj.data : obj;
        }

        // Extract data for each section
        const teamForm = extractData(results.teamForm);
        const headToHead = extractData(results.headToHead);
        const playerPerformance = extractData(results.playerPerformance);
        const venueStats = extractData(results.venueStats);

        // Team form
        if (teamForm && teamForm.teamA && teamForm.teamB) {
            document.getElementById('team-a-name').textContent = teamForm.teamA.name || 'Team A';
            document.getElementById('team-b-name').textContent = teamForm.teamB.name || 'Team B';
            // Format team form data
            const teamAForm = this.formatTeamForm(teamForm.teamA.matches || []);
            const teamBForm = this.formatTeamForm(teamForm.teamB.matches || []);
            document.getElementById('team-a-form').innerHTML = teamAForm;
            document.getElementById('team-b-form').innerHTML = teamBForm;
        } else {
            document.getElementById('team-a-form').innerHTML = '<div class="text-gray-500">No recent form data available</div>';
            document.getElementById('team-b-form').innerHTML = '<div class="text-gray-500">No recent form data available</div>';
        }

        // Head-to-head
        if (headToHead) {
            const h2hHtml = this.formatHeadToHead(headToHead);
            document.getElementById('head-to-head-content').innerHTML = h2hHtml;
        } else {
            document.getElementById('head-to-head-content').innerHTML = '<div class="text-gray-500">No head-to-head data available</div>';
        }

        // Captain performance
        if (playerPerformance && playerPerformance.captain) {
            const captainName = playerPerformance.captain.name || 'Captain';
            document.getElementById('captain-performance-name').textContent = captainName;
            const captainStats = this.formatPlayerPerformance(playerPerformance.captain);
            document.getElementById('captain-performance').innerHTML = captainStats;
        } else {
            document.getElementById('captain-performance-name').textContent = 'Captain';
            document.getElementById('captain-performance').innerHTML = '<div class="text-gray-500">No performance data available</div>';
        }

        // Vice-captain performance
        if (playerPerformance && playerPerformance.viceCaptain) {
            const viceCaptainName = playerPerformance.viceCaptain.name || 'Vice-Captain';
            document.getElementById('vice-captain-performance-name').textContent = viceCaptainName;
            const viceCaptainStats = this.formatPlayerPerformance(playerPerformance.viceCaptain);
            document.getElementById('vice-captain-performance').innerHTML = viceCaptainStats;
        } else {
            document.getElementById('vice-captain-performance-name').textContent = 'Vice-Captain';
            document.getElementById('vice-captain-performance').innerHTML = '<div class="text-gray-500">No performance data available</div>';
        }

        // Venue stats
        if (venueStats) {
            const venueHtml = this.formatVenueStats(venueStats);
            document.getElementById('venue-stats-content').innerHTML = venueHtml;
        } else {
            document.getElementById('venue-stats-content').innerHTML = '<div class="text-gray-500">No venue statistics available</div>';
        }

        // Team balance (if you have this section)
        if (results.teamBalance) {
            document.getElementById('team-balance-content').innerHTML = results.teamBalance;
        } else if (document.getElementById('team-balance-content')) {
            document.getElementById('team-balance-content').innerHTML = '';
        }
        // Team balance (Team Composition)
        this.displayTeamComposition();
        // Log all validated team players
        const validatedPlayers = JSON.parse(sessionStorage.getItem('validatedPlayers') || '[]');
        console.log('All validated team players:', validatedPlayers);
    }

    displayTeamComposition() {
        const validatedPlayers = JSON.parse(sessionStorage.getItem('validatedPlayers') || '[]');
        if (!validatedPlayers.length) {
            document.getElementById('team-balance-content').innerHTML = '<div class="text-gray-500">No team balance analysis available</div>';
            return;
        }
        // Count roles and teams
        const roleCounts = {};
        const teamCounts = {};
        validatedPlayers.forEach(player => {
            const role = player.role || 'Unknown';
            const team = player.team || 'Unknown';
            roleCounts[role] = (roleCounts[role] || 0) + 1;
            teamCounts[team] = (teamCounts[team] || 0) + 1;
        });
        // Build HTML
        let html = '<div class="mb-2 font-semibold text-gray-800">Role Distribution:</div><ul>';
        Object.entries(roleCounts).forEach(([role, count]) => {
            html += `<li>${role}: <span class="font-bold">${count}</span></li>`;
        });
        html += '</ul>';
        html += '<div class="mt-2 mb-2 font-semibold text-gray-800">Team Distribution:</div><ul>';
        Object.entries(teamCounts).forEach(([team, count]) => {
            html += `<li>${team}: <span class="font-bold">${count}</span></li>`;
        });
        html += '</ul>';
        document.getElementById('team-balance-content').innerHTML = html;
    }

    formatTeamForm(matches) {
        if (!matches || matches.length === 0) {
            return '<div class="text-gray-500">No recent matches</div>';
        }

        const formString = matches.map(match => 
            match.result === 'Win' ? 'W' : match.result === 'Loss' ? 'L' : 'D'
        ).join('-');
        const wins = matches.filter(m => m.result === 'Win').length;

        return `
            <div class="font-mono font-bold text-base mb-2 text-blue-700">${formString}</div>
            <div class="text-gray-600 font-medium">${wins}/${matches.length} wins</div>
            <div class="text-xs text-gray-500 mt-1">Recent form</div>
        `;
    }

    formatHeadToHead(h2hData) {
        if (!h2hData || !h2hData.allHistoricalMatches) {
            return '<div class="text-gray-500">No head-to-head data available</div>';
        }

        const matches = h2hData.allHistoricalMatches.slice(0, 8);
        const teamAWins = h2hData.teamAWins || 0;
        const teamBWins = h2hData.teamBWins || 0;
        const draws = h2hData.draws || 0;

        const matchHistoryHtml = matches.length > 0 ? 
            matches.map(match => {
                const winnerIcon = h2hData.teamA === match.winner ? '🔵' : 
                                 h2hData.teamB === match.winner ? '🟣' : '⚪';
                const formattedDate = new Date(match.match_date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                });
                return `
                <div class="flex justify-between items-center py-1 text-xs border-b border-gray-100 last:border-0">
                    <span class="text-gray-600">${formattedDate}</span>
                    <div class="flex items-center gap-1">
                        <span class="text-gray-500">${match.team1} vs ${match.team2}</span>
                        <span>${winnerIcon}</span>
                    </div>
                </div>
                `;
            }).join('') : 
            '<div class="text-xs text-gray-500 text-center py-2">No match history available</div>';

        return `
            <div class="mb-3">
                <div class="text-sm font-semibold text-gray-800 mb-2">
                    ${h2hData.teamA} ${teamAWins} - ${teamBWins} ${h2hData.teamB}
                </div>
                <div class="text-xs text-gray-600 mb-3">
                    Total: ${h2hData.totalMatches || matches.length} matches (${draws} draws)
                </div>
            </div>
            <div class="max-h-32 overflow-y-auto">
                ${matchHistoryHtml}
            </div>
        `;
    }

    formatPlayerPerformance(playerData) {
        if (!playerData || !playerData.recentMatches || playerData.recentMatches.length === 0) {
            return '<div class="text-gray-500">No recent performance data available</div>';
        }

        const matches = playerData.recentMatches.slice(0, 5);
        const role = playerData.role || 'Unknown';
        
        const matchesHtml = matches.map(match => {
            const date = new Date(match.match_date).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            });
            const runs = match.runs_scored || 0;
            const wickets = match.wickets_taken || 0;
            const balls = match.balls_faced || 0;
            const strikeRate = match.strike_rate || 0;
            const economy = match.economy_rate || 0;
            
            let performanceText = '';
            if (role.toLowerCase().includes('batsman') || role.toLowerCase().includes('all-rounder')) {
                performanceText = `${runs} runs`;
                if (balls > 0) performanceText += ` (${balls} balls)`;
                if (strikeRate > 0) performanceText += `, SR: ${strikeRate}`;
            }
            if (role.toLowerCase().includes('bowler') || role.toLowerCase().includes('all-rounder')) {
                if (performanceText) performanceText += ' | ';
                performanceText += `${wickets} wickets`;
                if (economy > 0) performanceText += `, Econ: ${economy}`;
            }
            
            return `
                <div class="flex justify-between items-center py-1 text-xs border-b border-gray-100 last:border-0">
                    <span class="text-gray-600">${date}</span>
                    <span class="text-gray-800 font-medium">${performanceText}</span>
                </div>
            `;
        }).join('');

        return `
            <div class="mb-2">
                <div class="text-xs text-gray-600 mb-1">Role: ${role}</div>
            </div>
            <div class="max-h-24 overflow-y-auto">
                ${matchesHtml}
            </div>
        `;
    }

    formatVenueStats(venueData) {
        if (!venueData || !venueData.venueStats) {
            return '<div class="text-gray-500">No venue statistics available</div>';
        }

        const stats = venueData.venueStats;
        
        return `
            <div class="space-y-2">
                <div class="text-sm font-semibold text-gray-800">
                    ${stats.venue_name || 'Unknown Venue'} (${stats.location || 'Unknown'})
                </div>
                <div class="text-xs text-gray-600">
                    <div>Avg 1st Inn: ${stats.avg_first_innings_score || 'N/A'}</div>
                    <div>Avg 2nd Inn: ${stats.avg_second_innings_score || 'N/A'}</div>
                    <div>Pitch: ${stats.pitch_type || 'neutral'} (${stats.pitch_rating || 'balanced'})</div>
                    <div>Chase Success: ${stats.chase_success_rate || 0}%</div>
                    <div>Toss Suggestion: ${stats.toss_decision_suggestion || 'bat first'}</div>
                </div>
            </div>
        `;
    }

    formatSummaryText(summaryText) {
        if (!summaryText || summaryText === 'No summary available.') {
            return '<div class="text-gray-500 text-center py-4">No summary available</div>';
        }

        // Split the text into paragraphs and process each
        const paragraphs = summaryText.split('\n').filter(p => p.trim());
        
        let formattedHtml = '';
        
        paragraphs.forEach((paragraph, index) => {
            const trimmedParagraph = paragraph.trim();
            
            // Skip empty paragraphs
            if (!trimmedParagraph) return;
            
            // Check if paragraph starts with common bullet point indicators
            const bulletPatterns = [
                /^[-•*]\s+/,
                /^\d+\.\s+/,
                /^[A-Z]\.\s+/,
                /^[a-z]\.\s+/
            ];
            
            const isBulletPoint = bulletPatterns.some(pattern => pattern.test(trimmedParagraph));
            
            if (isBulletPoint) {
                // Format as bullet point
                const cleanText = trimmedParagraph.replace(/^[-•*\d]+\.?\s*/, '').replace(/^[A-Za-z]\.\s*/, '');
                formattedHtml += `
                    <div class="flex items-start space-x-2 mb-2">
                        <span class="text-primary font-bold mt-0.5">•</span>
                        <span class="text-gray-800 text-sm leading-relaxed">${cleanText}</span>
                    </div>
                `;
            } else {
                // Check if it's a heading (all caps, short text, or contains keywords)
                const isHeading = (
                    trimmedParagraph.length < 50 && 
                    (trimmedParagraph.toUpperCase() === trimmedParagraph || 
                     /^(Team|Overall|Rating|Summary|Analysis|Strengths|Weaknesses|Recommendations?)/i.test(trimmedParagraph))
                );
                
                if (isHeading) {
                    // Format as heading
                    formattedHtml += `
                        <div class="mb-3">
                            <h3 class="text-base font-bold text-gray-900 border-b border-gray-200 pb-1">
                                ${trimmedParagraph}
                            </h3>
                        </div>
                    `;
                } else {
                    // Format as regular paragraph
                    formattedHtml += `
                        <div class="mb-3">
                            <p class="text-gray-800 text-sm leading-relaxed">${trimmedParagraph}</p>
                        </div>
                    `;
                }
            }
        });
        
        // If no formatting was applied, wrap the entire text as a paragraph
        if (!formattedHtml) {
            formattedHtml = `
                <div class="mb-3">
                    <p class="text-gray-800 text-sm leading-relaxed">${summaryText}</p>
                </div>
            `;
        }
        
        return formattedHtml;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TeamPerformancePage();
}); 