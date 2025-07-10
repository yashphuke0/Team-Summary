const openai = require('./openaiClient');
const supabase = require('./supabaseClient');

async function analyzeTeam({ players, captain, vice_captain, teamA, teamB, matchDate }) {
    if (!players || !Array.isArray(players) || players.length === 0) {
        return { success: false, message: 'Player data is required' };
    }
    if (!teamA || !teamB || !matchDate) {
        return { success: false, message: 'Match details (teamA, teamB, matchDate) are required' };
    }
    if (!process.env.OPENAI_API_KEY) {
        return { success: false, message: 'OpenAI API key not configured' };
    }
    const prompt = `Analyze this Dream11 fantasy cricket team for the match between ${teamA} vs ${teamB} on ${matchDate}:

Players: ${players.join(', ')}
Captain: ${captain || 'Not specified'}
Vice-captain: ${vice_captain || 'Not specified'}

Please provide a comprehensive analysis covering:
1. Team Balance: Analyze the batting, bowling, and all-rounder composition
2. Captain Choice: Evaluate if the captain selection is optimal
3. Vice-captain Choice: Assess the vice-captain selection
4. Match Context: Consider the teams playing and any strategic insights
5. Overall Rating: Rate the team out of 10 and explain why
6. Suggestions: Provide 2-3 specific improvements if any

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
        max_tokens: 1000,
        temperature: 0.7,
    });
    const analysis = completion.choices[0].message.content;
    return {
        success: true,
        analysis: analysis,
        message: 'Team analysis completed successfully'
    };
}

async function teamSummary({ teamA, teamB, matchDate, captain, viceCaptain, players, teamFormData, headToHeadData, playerPerformanceData, venueStatsData }) {
    if (!teamA || !teamB || !matchDate || !players || !Array.isArray(players)) {
        return { success: false, message: 'Required match data missing' };
    }
    if (!process.env.OPENAI_API_KEY) {
        return { success: false, message: 'OpenAI API key not configured' };
    }
    // Compose prompt (simplified for brevity)
    const prompt = `Analyze this Dream11 fantasy cricket team using the provided statistics:\n\nMATCH DETAILS:\n${teamA} vs ${teamB} on ${matchDate}\n\nSELECTED PLAYERS:\n${players.join(', ')}\nCaptain: ${captain || 'Not selected'}\nVice-Captain: ${viceCaptain || 'Not selected'}\n\nPlease provide a concise analysis and rating.`;
    const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
            {
                role: "system",
                content: "You are an expert fantasy cricket analyst specializing in IPL Dream11 teams. Provide concise, data-driven insights with specific ratings. Focus on team balance, venue strategy, and risk analysis. Keep responses short and actionable."
            },
            {
                role: "user",
                content: prompt
            }
        ],
        max_tokens: 800,
        temperature: 0.6,
    });
    const summary = completion.choices[0].message.content;
    return {
        success: true,
        summary: summary,
        message: 'Team summary generated successfully'
    };
}

module.exports = { analyzeTeam, teamSummary }; 