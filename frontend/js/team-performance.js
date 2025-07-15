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

            // Prepare players array and convert to the format expected by analyzeTeam function
            const formattedPlayers = teamData.players.map(p => {
                const playerName = typeof p === 'string' ? p : p.name;
                return {
                    name: playerName,
                    role: 'Unknown',
                    team: 'Unknown'
                };
            });

            // Perform team analysis using the analyzeTeam function
            const response = await fetch(`${CONSTANTS.API_BASE_URL}/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                teamA: matchData.teamA,
                teamB: matchData.teamB,
                matchDate: matchData.matchDate,
                    players: formattedPlayers,
                captain: captainName,
                viceCaptain: viceCaptainName
                })
            });

            const analysisResult = await response.json();

            // Hide loading and show content
            document.getElementById('analysis-loading').classList.add('hidden');
            document.getElementById('analysis-content').classList.remove('hidden');

            // Display analysis results
            if (analysisResult.success) {
                this.displayAnalysisResults(analysisResult.analysis);
            } else {
                this.toast.showError(analysisResult.message || 'Analysis failed');
            }

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
        // this.displayTeamComposition(); // Removed as Team Composition block is gone
        // Log all validated team players
        const validatedPlayers = JSON.parse(sessionStorage.getItem('validatedPlayers') || '[]');
        console.log('All validated team players:', validatedPlayers);
    }

    // Removed displayTeamComposition() function as Team Composition block is gone

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

        const teamAWins = h2hData.teamAWins || 0;
        const teamBWins = h2hData.teamBWins || 0;
        const draws = h2hData.draws || 0;
        const totalMatches = h2hData.totalMatches || teamAWins + teamBWins + draws;
        
        const teamAWinRate = Math.round((teamAWins / totalMatches) * 100);
        const teamBWinRate = Math.round((teamBWins / totalMatches) * 100);

        return `
            <div class="flex justify-center items-center text-center">
                <div class="flex-1 text-center">
                    <div class="text-2xl font-bold text-gray-800">${teamAWins}</div>
                    <div class="text-xs text-gray-600">${h2hData.teamA}</div>
                    <div class="text-xs font-medium mt-1">${teamAWinRate}% win rate</div>
                </div>
                <div class="px-4">
                    <div class="text-2xl font-bold text-gray-600">${totalMatches}</div>
                    <div class="text-xs text-gray-500">Matches</div>
                </div>
                <div class="flex-1 text-center">
                    <div class="text-2xl font-bold text-gray-800">${teamBWins}</div>
                    <div class="text-xs text-gray-600">${h2hData.teamB}</div>
                    <div class="text-xs font-medium mt-1">${teamBWinRate}% win rate</div>
                </div>
            </div>
        `;
    }

    formatPlayerPerformance(playerData) {
        if (!playerData || !playerData.recentMatches || playerData.recentMatches.length === 0) {
            return '<div class="text-gray-500">No recent performance data available</div>';
        }

        const matches = playerData.recentMatches.slice(0, 5);
        const role = playerData.role || 'Unknown';
        
        // Calculate average stats
        let totalRuns = 0, totalWickets = 0, matchCount = matches.length;
        
        matches.forEach(match => {
            if (role.toLowerCase().includes('batsman') || role.toLowerCase().includes('all-rounder')) {
                totalRuns += (match.runs_scored || 0);
            }
            if (role.toLowerCase().includes('bowler') || role.toLowerCase().includes('all-rounder')) {
                totalWickets += (match.wickets_taken || 0);
            }
        });
        
        const avgRuns = (totalRuns / matchCount).toFixed(1);
        const avgWickets = (totalWickets / matchCount).toFixed(1);
        
        // Determine which stat to show based on role
        const statValue = role.toLowerCase().includes('batsman') ? avgRuns : avgWickets;
        const statLabel = role.toLowerCase().includes('batsman') ? 'Avg Runs' : 'Avg Wickets';
        
        // Format exactly like the screenshot
        return `
            <div class="text-xs text-gray-600">${role.toLowerCase()}</div>
            <div class="flex justify-between items-center">
                <div class="font-bold text-xl text-gray-800">${statValue}</div>
                <div class="text-xs text-gray-500">${matchCount} matches</div>
            </div>
            <div class="text-xs text-gray-600">${statLabel}</div>
        `;
    }

    formatVenueStats(venueData) {
        if (!venueData || !venueData.venueStats) {
            return '<div class="text-gray-500">No venue statistics available</div>';
        }

        const stats = venueData.venueStats;
        const teamARecord = venueData.teamARecord || { wins: 0, losses: 0, total: 0 };
        const teamBRecord = venueData.teamBRecord || { wins: 0, losses: 0, total: 0 };
        
        const teamAWinRate = teamARecord.total > 0 ? Math.round((teamARecord.wins / teamARecord.total) * 100) : 0;
        const teamBWinRate = teamBRecord.total > 0 ? Math.round((teamBRecord.wins / teamBRecord.total) * 100) : 0;
        
        return `
            <div class="text-center mb-3">
                <div class="font-semibold text-gray-800">${stats.venue_name || 'Unknown Venue'}</div>
                <div class="text-xs text-gray-600">${stats.location || 'Unknown'}</div>
            </div>
            
            <div class="text-center border-b pb-2 mb-3">
                <div class="uppercase text-xs font-bold text-gray-700">${stats.pitch_type || 'BATTING'} PITCH</div>
                <div class="text-xs text-gray-600">${stats.pitch_rating || 'good for batting'}</div>
            </div>
            
            <div class="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                <div>
                    <div class="font-semibold text-lg">${stats.avg_first_innings_score || 'N/A'}</div>
                    <div class="text-gray-600">1st Innings</div>
                </div>
                <div>
                    <div class="font-semibold text-lg">${stats.avg_second_innings_score || 'N/A'}</div>
                    <div class="text-gray-600">2nd Innings</div>
                </div>
                <div>
                    <div class="font-semibold text-lg">${stats.chase_success_rate || '0'}%</div>
                    <div class="text-gray-600">Chase Success</div>
                </div>
            </div>
            
            <div class="text-xs border-t border-gray-200 pt-2">
                <div class="font-medium mb-1">Team Records at Venue</div>
                <div class="flex justify-between items-center mb-1">
                    <div>${venueData.teamA || 'Team A'}</div>
                    <div class="font-semibold">${teamARecord.wins}/${teamARecord.total} (${teamAWinRate}%)</div>
                </div>
                <div class="flex justify-between items-center">
                    <div>${venueData.teamB || 'Team B'}</div>
                    <div class="font-semibold">${teamBRecord.wins}/${teamBRecord.total} (${teamBWinRate}%)</div>
                </div>
            </div>
            
            <div class="text-xs border-t border-gray-200 pt-2 mt-2 text-center">
                <div class="font-medium mb-1">Toss Strategy</div>
                <div class="font-bold text-gray-800">${stats.toss_decision_suggestion?.toUpperCase() || 'BAT FIRST'}</div>
                <div class="text-gray-500 text-xs">Based on ${stats.historical_matches || 0} historical matches</div>
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