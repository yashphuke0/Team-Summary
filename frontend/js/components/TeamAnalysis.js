// Team Analysis Component
class TeamAnalysis {
    constructor(apiBaseUrl) {
        this.apiBaseUrl = apiBaseUrl;
        this.analysisData = null;
        this.onAnalysisCompleteCallback = null;
        this.onAnalysisErrorCallback = null;
    }

    async analyzeTeam(teamData) {
        try {
            const analysisData = {
                teamA: teamData.teamA,
                teamB: teamData.teamB,
                matchDate: teamData.matchDate,
                players: teamData.players,
                captain: teamData.captain,
                viceCaptain: teamData.viceCaptain
            };

            // Fetch all analysis data in parallel
            const [teamFormData, headToHeadData, playerPerformanceData, venueStatsData] = await Promise.all([
                this.fetchTeamRecentForm(analysisData),
                this.fetchHeadToHead(analysisData),
                this.fetchPlayerPerformance(analysisData),
                this.fetchVenueStats(analysisData)
            ]);

            this.analysisData = {
                teamForm: teamFormData,
                headToHead: headToHeadData,
                playerPerformance: playerPerformanceData,
                venueStats: venueStatsData
            };

            if (this.onAnalysisCompleteCallback) {
                this.onAnalysisCompleteCallback(this.analysisData);
            }

            return this.analysisData;

        } catch (error) {
            console.error('Analysis error:', error);
            if (this.onAnalysisErrorCallback) {
                this.onAnalysisErrorCallback(error);
            }
            throw error;
        }
    }

    async fetchTeamRecentForm(analysisData) {
        const response = await fetch(`${this.apiBaseUrl}/team-recent-form`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(analysisData)
        });
        if (!response.ok) throw new Error('Failed to fetch team form');
        return await response.json();
    }

    async fetchHeadToHead(analysisData) {
        const response = await fetch(`${this.apiBaseUrl}/head-to-head`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(analysisData)
        });
        if (!response.ok) throw new Error('Failed to fetch head-to-head');
        return await response.json();
    }

    async fetchPlayerPerformance(analysisData) {
        const response = await fetch(`${this.apiBaseUrl}/player-performance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(analysisData)
        });
        if (!response.ok) throw new Error('Failed to fetch player performance');
        return await response.json();
    }

    async fetchVenueStats(analysisData) {
        const response = await fetch(`${this.apiBaseUrl}/venue-stats`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(analysisData)
        });
        if (!response.ok) throw new Error('Failed to fetch venue stats');
        return await response.json();
    }

    async generateTeamSummary(teamData) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/team-summary`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(teamData)
            });

            const result = await response.json();

            if (result.success) {
                return result.summary;
            } else {
                throw new Error(result.message || 'Failed to generate team summary');
            }
        } catch (error) {
            console.error('Summary error:', error);
            throw error;
        }
    }

    // Display methods for UI components
    displayTeamRecentForm(data) {
        if (!data.success || !data.data) {
            return {
                teamA: '<div class="text-gray-500">No data available</div>',
                teamB: '<div class="text-gray-500">No data available</div>'
            };
        }

        const teamAMatches = data.data.teamA.matches;
        const teamBMatches = data.data.teamB.matches;

        const formatTeamForm = (matches) => {
            if (matches.length === 0) {
                return '<div class="text-gray-500">No recent matches</div>';
            }

            const formString = matches.map(match => 
                match.result === 'Win' ? 'W' : match.result === 'Loss' ? 'L' : 'D'
            ).join('-');
            const wins = matches.filter(m => m.result === 'Win').length;

            return `
                <div class="font-mono font-bold text-base mb-2 text-blue-700">${formString}</div>
                <div class="text-gray-600 font-medium">${wins}/5 wins</div>
                <div class="text-xs text-gray-500 mt-1">Recent form</div>
            `;
        };

        return {
            teamA: formatTeamForm(teamAMatches),
            teamB: formatTeamForm(teamBMatches)
        };
    }

    displayHeadToHead(data) {
        if (!data.success || !data.data) {
            return '<div class="text-gray-500">No head-to-head data available</div>';
        }

        const h2h = data.data;
        const allMatches = h2h.allHistoricalMatches || [];
        
        const matchHistoryHtml = allMatches.length > 0 ? 
            allMatches.slice(0, 8).map(match => {
                const winnerIcon = h2h.teamA === match.winner ? '🔵' : 
                                 h2h.teamB === match.winner ? '🟣' : '⚪';
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
            <div class="bg-white rounded-lg p-3 space-y-3">
                <div class="flex justify-between items-center">
                    <div class="text-center">
                        <div class="text-xl font-bold text-blue-600">${h2h.teamAWins}</div>
                        <div class="text-gray-600 text-xs">${h2h.teamA}</div>
                    </div>
                    <div class="text-center px-4">
                        <div class="text-lg font-bold text-gray-600">${h2h.totalMatches}</div>
                        <div class="text-gray-600 text-xs">Total Matches</div>
                    </div>
                    <div class="text-center">
                        <div class="text-xl font-bold text-purple-600">${h2h.teamBWins}</div>
                        <div class="text-gray-600 text-xs">${h2h.teamB}</div>
                    </div>
                </div>
                <div class="flex gap-2 text-xs">
                    <div class="flex-1 bg-blue-100 rounded px-2 py-1 text-center text-blue-800">
                        ${h2h.totalMatches > 0 ? Math.round((h2h.teamAWins / h2h.totalMatches) * 100) : 0}% win rate
                    </div>
                    <div class="flex-1 bg-purple-100 rounded px-2 py-1 text-center text-purple-800">
                        ${h2h.totalMatches > 0 ? Math.round((h2h.teamBWins / h2h.totalMatches) * 100) : 0}% win rate
                    </div>
                </div>
            </div>
        `;
    }

    displayPlayerPerformance(data) {
        if (!data.success || !data.data) {
            return {
                captain: '<div class="text-gray-500">No data available</div>',
                viceCaptain: '<div class="text-gray-500">No data available</div>'
            };
        }

        const formatPlayerStats = (playerData, bgColor, textColor) => {
            const matches = playerData.recentMatches;
            const role = playerData.role;
            
            if (matches.length === 0) {
                return '<div class="text-gray-500">No recent data</div>';
            }

            const isBatsman = role && (role.toLowerCase().includes('batsman') || role.toLowerCase().includes('bats'));
            const isBowler = role && (role.toLowerCase().includes('bowler') || role.toLowerCase().includes('bowl'));
            
            let primaryStat, primaryLabel, secondaryStat, secondaryLabel;
            
            if (isBatsman) {
                primaryStat = (matches.reduce((sum, m) => sum + m.runs_scored, 0) / matches.length).toFixed(1);
                primaryLabel = 'Avg Runs';
                secondaryStat = matches.map(m => m.runs_scored).join(', ');
                secondaryLabel = 'Last 5 Scores';
            } else if (isBowler) {
                primaryStat = (matches.reduce((sum, m) => sum + m.wickets_taken, 0) / matches.length).toFixed(1);
                primaryLabel = 'Avg Wickets';
                secondaryStat = matches.map(m => m.wickets_taken).join(', ');
                secondaryLabel = 'Last 5 Wickets';
            } else {
                primaryStat = (matches.reduce((sum, m) => sum + m.runs_scored, 0) / matches.length).toFixed(1);
                primaryLabel = 'Avg Runs';
                secondaryStat = (matches.reduce((sum, m) => sum + m.wickets_taken, 0) / matches.length).toFixed(1);
                secondaryLabel = 'Avg Wickets';
            }
            
            return `
                <div class="bg-${bgColor}-100 rounded-lg p-3">
                    <div class="flex justify-between items-center mb-2">
                        <span class="font-semibold text-${textColor}-800">Recent Performance</span>
                        <span class="text-xs text-${textColor}-600">${matches.length} matches</span>
                    </div>
                    <div class="text-xs text-${textColor}-600 mb-2 capitalize">${role || 'Player'}</div>
                    <div class="grid grid-cols-1 gap-2 text-sm">
                        <div>
                            <div class="font-bold text-${textColor}-700">${primaryStat}</div>
                            <div class="text-xs text-${textColor}-600">${primaryLabel}</div>
                        </div>
                        <div>
                            <div class="font-mono text-xs text-${textColor}-700">${secondaryStat}</div>
                            <div class="text-xs text-${textColor}-600">${secondaryLabel}</div>
                        </div>
                    </div>
                </div>
            `;
        };

        return {
            captain: formatPlayerStats(data.data.captain, 'yellow', 'yellow'),
            viceCaptain: formatPlayerStats(data.data.viceCaptain, 'blue', 'blue')
        };
    }

    displayVenueStats(data) {
        if (!data.success || !data.data || !data.data.venueStats) {
            return '<div class="text-gray-500">No venue data available</div>';
        }

        const venue = data.data.venueStats;
        const pitchColorClass = venue.pitch_type === 'batting' ? 'bg-green-100 text-green-800 border-green-200' : 
                               venue.pitch_type === 'bowling' ? 'bg-red-100 text-red-800 border-red-200' : 
                               'bg-yellow-100 text-yellow-800 border-yellow-200';
        
        const teamPerformance = venue.team_venue_performance || {};
        const teamNames = Object.keys(teamPerformance);

        return `
            <div class="bg-white rounded-lg p-3 space-y-3">
                <div class="text-center border-b pb-2">
                    <div class="font-bold text-gray-800">${venue.venue_name || 'Unknown Venue'}</div>
                    <div class="text-xs text-gray-600">${venue.location || ''}</div>
                </div>
                <div class="space-y-2">
                    <div class="text-center">
                        <div class="inline-block px-3 py-1 rounded-full border text-xs font-medium ${pitchColorClass}">
                            ${venue.pitch_type ? venue.pitch_type.toUpperCase() : 'NEUTRAL'} PITCH
                        </div>
                        <div class="text-xs text-gray-600 mt-1">${venue.pitch_rating || 'Balanced conditions'}</div>
                    </div>
                </div>
                <div class="grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                        <div class="font-bold text-gray-700">${venue.avg_first_innings_score || 'N/A'}</div>
                        <div class="text-gray-600">1st Innings</div>
                    </div>
                    <div>
                        <div class="font-bold text-gray-700">${venue.avg_second_innings_score || 'N/A'}</div>
                        <div class="text-gray-600">2nd Innings</div>
                    </div>
                    <div>
                        <div class="font-bold text-gray-700">${venue.chase_success_rate || 0}%</div>
                        <div class="text-gray-600">Chase Success</div>
                    </div>
                </div>
                ${teamNames.length > 0 ? `
                <div class="border-t pt-2 space-y-1">
                    <div class="text-xs font-medium text-gray-700 text-center">Team Records at Venue</div>
                    ${teamNames.map(teamName => {
                        const team = teamPerformance[teamName];
                        return `
                        <div class="flex justify-between items-center text-xs">
                            <span class="text-gray-600">${teamName}</span>
                            <span class="font-mono font-medium">${team.record} (${team.win_percentage}%)</span>
                        </div>
                        `;
                    }).join('')}
                </div>
                ` : ''}
                <div class="text-center border-t pt-2">
                    <div class="text-xs text-gray-600">Toss Strategy</div>
                    <div class="font-medium text-sm ${venue.toss_decision_suggestion === 'bat first' ? 'text-blue-700' : 'text-green-700'}">
                        ${venue.toss_decision_suggestion ? venue.toss_decision_suggestion.toUpperCase() : 'FIELD FIRST'}
                    </div>
                </div>
                <div class="text-center text-xs text-gray-500">
                    Based on ${venue.total_matches || 0} historical matches
                </div>
            </div>
        `;
    }

    onAnalysisComplete(callback) {
        this.onAnalysisCompleteCallback = callback;
    }

    onAnalysisError(callback) {
        this.onAnalysisErrorCallback = callback;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TeamAnalysis;
} else {
    window.TeamAnalysis = TeamAnalysis;
} 