const openai = require('./openaiClient');
const supabase = require('./supabaseClient');

// Helper: Fetch head-to-head from team_head_to_head view
async function fetchHeadToHead(teamA, teamB, venueName = null) {
  let query = supabase.from('team_head_to_head').select('*');
  query = query.or(`and(team1.eq.${teamA},team2.eq.${teamB}),and(team1.eq.${teamB},team2.eq.${teamA})`);
  if (venueName) query = query.eq('venue_name', venueName);
  const { data, error } = await query;
  if (error) return null;
  return data && data.length ? data[0] : null;
}

// Helper: Fetch player performance from player_performance_summary view
async function fetchPlayerPerformance(playerName, teamName) {
  const { data, error } = await supabase
    .from('player_performance_summary')
    .select('*')
    .eq('player_name', playerName)
    .eq('team_name', teamName)
    .limit(1);
  if (error) return null;
  return data && data.length ? data[0] : null;
}

async function analyzeTeam({ players, captain, viceCaptain, teamA, teamB, matchDate }) {
    // players: array of { name, role, team, ... }
    if (!players || !Array.isArray(players) || players.length === 0) {
        return { success: false, message: 'Player data is required' };
    }
    if (!teamA || !teamB || !matchDate) {
        return { success: false, message: 'Match details (teamA, teamB, matchDate) are required' };
    }
    if (!process.env.OPENAI_API_KEY) {
        return { success: false, message: 'OpenAI API key not configured' };
    }
    // Build a summary string of the team composition
    const roleCounts = {};
    const teamCounts = {};
    players.forEach(player => {
        const role = player.role || 'Unknown';
        const team = player.team || 'Unknown';
        roleCounts[role] = (roleCounts[role] || 0) + 1;
        teamCounts[team] = (teamCounts[team] || 0) + 1;
    });
    const roleSummary = Object.entries(roleCounts).map(([role, count]) => `${role}: ${count}`).join(', ');
    const teamSummary = Object.entries(teamCounts).map(([team, count]) => `${team}: ${count}`).join(', ');
    const playerList = players.map(p => `${p.name} (${p.role || 'Unknown'}, ${p.team || 'Unknown'})`).join(', ');
    // Compose the OpenAI prompt
    const prompt = `Analyze this Dream11 fantasy cricket team for the match between ${teamA} vs ${teamB} on ${matchDate}:

Players: ${playerList}
Captain: ${captain || 'Not specified'}
Vice-captain: ${viceCaptain || 'Not specified'}

Please provide a comprehensive analysis covering:
1. Team Balance: Analyze the batting, bowling, and all-rounder composition
2. Captain Choice: Evaluate if the captain selection is optimal
3. Vice-captain Choice: Assess the vice-captain selection
4. Match Context: Consider the teams playing and any strategic insights
5. Overall Rating: Rate the team out of 10 and explain why
6. Suggestions: Provide 2-3 specific improvements if any
Team Composition: ${roleSummary}
Team Distribution: ${teamSummary}
Keep the analysis concise but informative, focusing on fantasy cricket strategy.`;
    const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
            {
                role: "system",
                content: "You are an expert fantasy cricket analyst with deep knowledge of IPL players, team strategies, and Dream11 gameplay. Provide detailed, actionable insights."
            },
            {
                role: "user",
                content: prompt
            }
        ],
        max_tokens: 600,
        temperature: 0.7,
    });
    const analysis = completion.choices[0].message.content;
    return {
        success: true,
        analysis: analysis,
        message: 'Team analysis completed successfully'
    };
}

async function teamSummary({ teamA, teamB, matchDate, players, captain, viceCaptain, venueStatsData }) {
  if (!teamA || !teamB || !matchDate || !players || !Array.isArray(players)) {
    return { success: false, message: 'Required match data missing' };
  }
  if (!process.env.OPENAI_API_KEY) {
    return { success: false, message: 'OpenAI API key not configured' };
  }

  // Venue info (if available)
  let venueInfo = '';
  let venueName = '';
  if (venueStatsData && venueStatsData.success && venueStatsData.data && venueStatsData.data.venueStats) {
    const v = venueStatsData.data.venueStats;
    venueName = v.venue_name || '';
    venueInfo = `Venue: ${v.venue_name || 'Unknown'} (${v.location || ''})\nAvg 1st Inn: ${v.avg_first_innings_score || 'N/A'}, Avg 2nd Inn: ${v.avg_second_innings_score || 'N/A'}\nPitch: ${v.pitch_type || 'neutral'} (${v.pitch_rating || 'balanced'})`;
  }

  // Head-to-head (from view)
  let h2hInfo = '';
  const h2h = await fetchHeadToHead(teamA, teamB, venueName);
  if (h2h) {
    h2hInfo = `Head-to-Head at ${h2h.venue_name}: ${h2h.team1} vs ${h2h.team2}, Matches: ${h2h.total_matches}, Avg Scores: ${h2h.team1_avg_score} - ${h2h.team2_avg_score}`;
  }

  // Player performance (from view)
  let playerPerformanceInfo = '';
  if (captain) {
    const capPerf = await fetchPlayerPerformance(captain, teamA) || await fetchPlayerPerformance(captain, teamB);
    if (capPerf) {
      playerPerformanceInfo += `Captain (${captain}): ${capPerf.role || ''}, Runs: ${capPerf.total_runs || 0}, Wickets: ${capPerf.total_wickets || 0}\n`;
    }
  }
  if (viceCaptain) {
    const vcPerf = await fetchPlayerPerformance(viceCaptain, teamA) || await fetchPlayerPerformance(viceCaptain, teamB);
    if (vcPerf) {
      playerPerformanceInfo += `Vice-Captain (${viceCaptain}): ${vcPerf.role || ''}, Runs: ${vcPerf.total_runs || 0}, Wickets: ${vcPerf.total_wickets || 0}`;
    }
  }

  // Build the prompt
  const prompt = `Analyze the fantasy cricket team for the ${teamA} vs ${teamB} match on ${matchDate} IPL 2025 match at ${venueName || 'Unknown Venue'}. Provide a 4-5 line summary covering the following points:

Team Balance: Assess the overall team composition. Highlight any key role imbalances such as too many bowlers or lack of finishers. Suggest specific player swaps or adjustments to improve the balance.

Captain and Vice-Captain: Recommend the best captain and vice-captain options based on the players' current form, the conditions of the match, and the venue. Mention if any particular players have a better chance of contributing across different phases of the game (batting, bowling, fielding).

Venue Analysis: Provide a quick analysis of the pitch conditions (is it suited for batsmen or bowlers?) and the match flow (whether the team should prefer batting first or chasing). Mention key players who benefit from these conditions (e.g., aggressive batsmen or pace bowlers).

Smart Picks and Risky Players: List players who are good picks based on form, role, and the conditions of the match. Highlight any risky players (e.g., out of form or injury concerns). Include any low-ownership players who could be a differential pick.

Toss-Dependent Strategy: Suggest any changes in team strategy based on who wins the toss. Should certain players be prioritized for batting or bowling based on match conditions, and how does it affect small vs mega league contests?

Make the summary concise, actionable, and focused on the critical aspects of team strategy, player form, and venue conditions.

TEAM:\nPlayers: ${players.join(', ')}\nCaptain: ${captain || 'Not selected'}\nVice-Captain: ${viceCaptain || 'Not selected'}

${venueInfo ? 'MATCH CONTEXT:\n' + venueInfo : ''}
${h2hInfo ? '\n' + h2hInfo : ''}
${playerPerformanceInfo ? '\n' + playerPerformanceInfo : ''}

Instructions:
- Use only actual player names from the team above.
- Write only 4-5 lines, each line a single, direct, actionable insight or warning.
- Only mention things that would actually affect team selection (eligibility, role balance, captaincy, venue fit, risky picks, must-have swaps).
- No generic theory, no filler, no emojis, no fantasy points.

Guidelines:
- Be concise and impactful.
- Use only 2025 IPL team combinations and news.
- End with a one-line bottom-line summary.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are an IPL 2025 fantasy cricket expert. Only mention things that would actually affect team selection. No filler. No generic advice. No emojis. Be concise and impactful."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    max_tokens: 400,
    temperature: 0.6,
  });

  const summary = completion.choices[0].message.content;
  return {
    success: true,
    summary: summary,
    message: 'Team summary generated successfully'
  };
}

async function analyzeMultipleTeams({ teams, teamA, teamB, matchDate, venueStatsData }) {
    if (!teams || !Array.isArray(teams) || teams.length === 0) {
        return { success: false, message: 'Teams data is required' };
    }
    if (!teamA || !teamB || !matchDate) {
        return { success: false, message: 'Match details (teamA, teamB, matchDate) are required' };
    }
    if (!process.env.OPENAI_API_KEY) {
        return { success: false, message: 'OpenAI API key not configured' };
    }

    // Venue info (if available)
    let venueInfo = '';
    let venueName = '';
    if (venueStatsData && venueStatsData.success && venueStatsData.data && venueStatsData.data.venueStats) {
        const v = venueStatsData.data.venueStats;
        venueName = v.venue_name || '';
        venueInfo = `Venue: ${v.venue_name || 'Unknown'} (${v.location || ''})\nAvg 1st Inn: ${v.avg_first_innings_score || 'N/A'}, Avg 2nd Inn: ${v.avg_second_innings_score || 'N/A'}\nPitch: ${v.pitch_type || 'neutral'} (${v.pitch_rating || 'balanced'})`;
    }

    // Prepare teams data for analysis
    const teamsData = teams.map((team, index) => {
        const roleCounts = {};
        const teamCounts = {};
        team.players.forEach(player => {
            const role = player.role || 'Unknown';
            const playerTeam = player.team || 'Unknown';
            roleCounts[role] = (roleCounts[role] || 0) + 1;
            teamCounts[playerTeam] = (teamCounts[playerTeam] || 0) + 1;
        });
        
        return {
            teamName: team.name || `Team ${index + 1}`,
            players: team.players.map(p => `${p.name} (${p.role || 'Unknown'}, ${p.team || 'Unknown'})`).join(', '),
            captain: team.captain || 'Not specified',
            viceCaptain: team.viceCaptain || 'Not specified',
            roleSummary: Object.entries(roleCounts).map(([role, count]) => `${role}: ${count}`).join(', '),
            teamSummary: Object.entries(teamCounts).map(([team, count]) => `${team}: ${count}`).join(', ')
        };
    });

    const prompt = `ANALYZE ${teams.length} DREAM11 TEAMS - ONLY 7 CRITERIA

MATCH: ${teamA} vs ${teamB} on ${matchDate} at ${venueName || 'Unknown Venue'}

${venueInfo ? `VENUE: ${venueInfo}\n` : ''}

ANALYZE EACH TEAM USING ONLY THESE 7 CRITERIA:

**Team Name:**
Team Balance: [Rating: X/5] - brief explanation
Captaincy Choice: [Rating: X/5] - brief explanation  
Match Advantage: [Rating: X/5] - brief explanation
Venue Strategy: [Rating: X/5] - brief explanation
Covariance Analysis: [Rating: X/5] - brief explanation
Pitch Conditions: [Rating: X/5] - brief explanation
Overall Rating: [Rating: X/5] - brief explanation

RULES:
- NO numbered points
- NO additional sections
- ONLY the 7 criteria above for each team
- Analyze ALL teams listed below

TEAMS TO ANALYZE:

${teamsData.map((team, index) => `
**${team.teamName}:**
Players: ${team.players}
Captain: ${team.captain}
Vice-Captain: ${team.viceCaptain}
Roles: ${team.roleSummary}
Teams: ${team.teamSummary}
`).join('\n')}

START ANALYSIS NOW.`;

    const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            {
                role: "system",
                content: "You are an IPL 2025 fantasy cricket expert. Provide ONLY the 7 criteria analysis for each team. No filler, no emojis, no additional sections. Be concise and direct."
            },
            {
                role: "user",
                content: prompt
            }
        ],
        max_tokens: 1500,
        temperature: 0.6,
    });

    let analysis = completion.choices[0].message.content;
    
    // Post-process the response to ensure correct format
    analysis = cleanAnalysisResponse(analysis, teamsData);
    
    return {
        success: true,
        analysis: analysis,
        message: 'Multiple teams analysis completed successfully'
    };
}

// Helper function to clean and format the analysis response
function cleanAnalysisResponse(analysis, teamsData) {
    if (!analysis) return analysis;
    
    let cleaned = analysis;
    
    // Remove any numbered points (1., 2., 3., etc.)
    cleaned = cleaned.replace(/^\d+\.\s*/gm, '');
    
    // Remove unwanted sections
    const unwantedSections = [
        /Strengths:.*?(?=\n\n|\n[A-Z]|$)/gis,
        /Weaknesses:.*?(?=\n\n|\n[A-Z]|$)/gis,
        /Recommendations?:.*?(?=\n\n|\n[A-Z]|$)/gis,
        /Final Comparison.*?(?=\n\n|\n[A-Z]|$)/gis,
        /Comparison ranking.*?(?=\n\n|\n[A-Z]|$)/gis
    ];
    
    unwantedSections.forEach(pattern => {
        cleaned = cleaned.replace(pattern, '');
    });
    
    // Completely rebuild the analysis in the correct format
    const criteria = [
        'Team Balance',
        'Captaincy Choice', 
        'Match Advantage',
        'Venue Strategy',
        'Covariance Analysis',
        'Pitch Conditions',
        'Overall Rating'
    ];
    
    let formattedAnalysis = '';
    
    // Process each team
    teamsData.forEach((team, index) => {
        formattedAnalysis += `**${team.teamName}:**\n`;
        
        // Extract ratings and explanations from the AI response for this team
        let teamSection = cleaned.match(new RegExp(`\\*\\*${team.teamName}\\*\\*:.*?(?=\\*\\*|Ranking:|$)`, 'gis'));
        
        // If team section not found, look for any analysis that might belong to this team
        if (!teamSection) {
            // Look for any analysis that might be for this team (even without proper team header)
            const allTeamSections = cleaned.match(/Team \d+:.*?(?=Team \d+:|Ranking:|$)/gis);
            if (allTeamSections && allTeamSections[index]) {
                teamSection = [allTeamSections[index]];
            }
        }
        
        criteria.forEach(criterion => {
            let rating = '3/5';
            let explanation = 'Analysis pending';
            
            if (teamSection) {
                // Try multiple patterns to find the rating and explanation
                const patterns = [
                    // Pattern 1: "Criterion: [Rating: X/5] - explanation"
                    new RegExp(`${criterion}:\\s*\\[Rating:\\s*(\\d+(?:\\.\\d+)?/5)\\]\\s*-\\s*(.*?)(?=\\n|$)`, 'i'),
                    // Pattern 2: "Criterion: X/5 - explanation" (without brackets)
                    new RegExp(`${criterion}:\\s*(\\d+(?:\\.\\d+)?/5)\\s*-\\s*(.*?)(?=\\n|$)`, 'i'),
                    // Pattern 3: Just the rating without explanation
                    new RegExp(`${criterion}:\\s*\\[Rating:\\s*(\\d+(?:\\.\\d+)?/5)\\]`, 'i'),
                    new RegExp(`${criterion}:\\s*(\\d+(?:\\.\\d+)?/5)`, 'i')
                ];
                
                for (const pattern of patterns) {
                    const match = teamSection[0].match(pattern);
                    if (match) {
                        rating = match[1];
                        if (match[2]) {
                            explanation = match[2].trim();
                        }
                        break;
                    }
                }
            }
            
            formattedAnalysis += `${criterion}: [Rating: ${rating}] - ${explanation}\n`;
        });
        
        formattedAnalysis += '\n';
    });
    
    return formattedAnalysis.trim();
}

module.exports = { analyzeTeam, teamSummary, analyzeMultipleTeams }; 