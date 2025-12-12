

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AppState, Course, Assignment } from '../types';

const getClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key not configured");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateInsight = async (
  prompt: string, 
  contextData: AppState
): Promise<string> => {
  try {
    const ai = getClient();
    const cur = contextData.user.currency || '$';
    
    const contextString = `
      You are KONKA, a helpful, encouraging, and analytical AI assistant for a student.
      
      CURRENT STUDENT DATA:
      Name: ${contextData.user.name}
      Institutions: ${contextData.user.institutions.map(i => `${i.name} (${i.program})`).join(', ')}
      Bio: ${contextData.user.bio}
      Goals: ${contextData.user.goals.join(', ')}
      
      ACADEMICS:
      ${contextData.courses.map(c => `- ${c.code} (${c.name}): ${c.grade}%`).join('\n')}
      
      RECENT EXPENSES:
      ${contextData.expenses.slice(0, 5).map(e => `- ${cur}${e.amount} on ${e.category} (${e.note})`).join('\n')}
      
      WELLBEING (Last 5 logs):
      ${contextData.wellbeing.slice(0, 5).map(w => `- Mood: ${w.mood}/10, Sleep: ${w.sleepHours}h`).join('\n')}
      
      USER PROMPT: ${prompt}
      
      INSTRUCTIONS:
      - Be concise and friendly.
      - Use the data provided to give specific advice.
      - If asking about grades, analyze the trend.
      - If asking about money, warn about recent high spending if applicable.
      - Always use the currency symbol "${cur}" for financial values.
      - Use markdown for formatting.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contextString,
    });

    return response.text || "I couldn't generate a response at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm having trouble connecting to my brain right now. Please check your connection or API key.";
  }
};

export const generateProfessionalBio = async (userData: AppState['user'], courses: AppState['courses']): Promise<string> => {
  try {
    const ai = getClient();
    const prompt = `
      Generate a professional, compelling LinkedIn-style bio (max 60 words) for a student with the following profile:
      Name: ${userData.name}
      Title: ${userData.title}
      Institutions: ${userData.institutions.map(i => `${i.name} (${i.program})`).join(', ')}
      Key Courses/Interests: ${courses.map(c => c.name).slice(0, 3).join(', ')}
      Current Goals: ${userData.goals.join(', ')}

      The tone should be ambitious but grounded. First person.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Could not generate bio.";
  } catch (error) {
    console.error("Gemini Bio Error:", error);
    throw error;
  }
};

export const suggestGoals = async (userData: AppState['user'], courses: AppState['courses']): Promise<string[]> => {
  try {
    const ai = getClient();
    const prompt = `
      Based on the following student profile, suggest 3 specific, actionable SMART goals for the next semester.
      Programs: ${userData.institutions.map(i => i.program).join(', ')}
      Current Grades: ${courses.map(c => `${c.name}: ${c.grade}%`).join(', ')}
      
      Return ONLY a JSON array of strings. Example: ["Goal 1", "Goal 2", "Goal 3"]
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const text = response.text;
    if (!text) return ["Focus on Linear Algebra", "Network with professors", "Update resume"];
    
    // Clean potential markdown blocks like ```json ... ```
    const cleanedText = text.replace(/```json|```/g, '').trim();
    
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Gemini Goal Error:", error);
    return ["Review course materials daily", "Attend all lectures", "Join a study group"];
  }
};

export const analyzeCoursePerformance = async (course: Course, assignments: Assignment[]): Promise<string> => {
  try {
    const ai = getClient();
    const prompt = `
      Analyze the performance for the course "${course.name}" (${course.code}).
      Current Grade: ${course.grade}%
      Assignments:
      ${assignments.map(a => `- ${a.title}: ${a.grade ? a.grade + '%' : 'Pending'} (Weight: ${a.weight}%)`).join('\n')}
      
      Provide 3 specific, short, actionable SMART strategies to improve or maintain this grade. 
      Tone: Encouraging but strategic coach.
      Format: Markdown bullet points.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Analysis unavailable.";
  } catch (error) {
    console.error("Gemini Course Analysis Error:", error);
    return "Could not analyze course at this moment.";
  }
};

export const analyzeHolisticWellbeing = async (data: AppState): Promise<string> => {
  try {
    const ai = getClient();
    const cur = data.user.currency || '$';
    // Prepare a summarized view of the data for the prompt
    const recentLogs = data.wellbeing.slice(0, 5);
    const recentSpending = data.expenses.slice(0, 5).reduce((acc, curr) => acc + curr.amount, 0);
    const lowGrades = data.courses.filter(c => c.grade < 80).map(c => c.name);

    const prompt = `
      Analyze the holistic wellbeing of this student based on the following cross-domain data:

      WELLBEING LOGS (Last 5 days):
      ${JSON.stringify(recentLogs.map(l => ({
        date: l.date, 
        mood: l.mood, 
        sleep: l.sleepHours,
        activities: l.activities.map(a => a.name).join(', ')
      })))}

      ACADEMIC CONTEXT:
      - Struggling Courses (<80%): ${lowGrades.join(', ') || 'None'}
      
      FINANCIAL CONTEXT:
      - Recent Spending (Last 5 transactions): ${cur}${recentSpending}

      TASK:
      Provide a "Holistic Health Report". 
      1. Identify one key correlation (e.g., "Your mood improves when you do Bible Reading" or "Running seems to correlate with better sleep").
      2. Provide 2 specific, small, actionable habits to improve balance.
      
      Tone: Empathetic, insightful, data-driven. Keep it under 150 words.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Insight unavailable.";
  } catch (error) {
    console.error("Gemini Holistic Error:", error);
    return "I need more data to generate a holistic analysis.";
  }
};

export const generateDashboardInsight = async (data: AppState, timeRange: string): Promise<string> => {
  try {
    const ai = getClient();
    const cur = data.user.currency || '$';

    const prompt = `
      Act as a high-level executive coach for a student.
      
      CONTEXT:
      Time Range Analysis: ${timeRange}
      
      DATA POINTS:
      - Average Grade: ${data.courses.reduce((a,c) => a + c.grade, 0) / (data.courses.length || 1)}%
      - Total Spent (All Time): ${cur}${data.expenses.reduce((a,e) => a + e.amount, 0)}
      - Average Mood (All Time): ${data.wellbeing.reduce((a,w) => a + w.mood, 0) / (data.wellbeing.length || 1)}/10
      
      TASK:
      Generate a "Morning Executive Briefing".
      1. One sentence summarizing current status (e.g., "Academic performance is peak, but financial burn rate is high.").
      2. One specific, high-impact recommendation for the ${timeRange} ahead.
      
      Tone: Professional, direct, elite performance coach. Max 60 words. Use the currency "${cur}" in your response.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Unable to generate executive brief.";
  } catch (error) {
    console.error("Gemini Dashboard Error:", error);
    return "AI Sync Failed: Briefing unavailable.";
  }
};

export const analyzeSimulation = async (
  simulation: { studyHoursChange: number; sleepChange: number; spendingChange: number },
  data: AppState
): Promise<string> => {
  try {
    const ai = getClient();
    const avgGrade = (data.courses.reduce((a,c) => a + c.grade, 0) / (data.courses.length || 1)).toFixed(1);
    const avgMood = (data.wellbeing.reduce((a,w) => a + w.mood, 0) / (data.wellbeing.length || 1)).toFixed(1);
    
    const prompt = `
      Act as a predictive analytics engine for student performance.
      
      CURRENT BASELINE:
      - Average Grade: ${avgGrade}%
      - Average Mood: ${avgMood}/10
      
      SIMULATION INPUTS (Weekly Delta):
      - Study Hours: ${simulation.studyHoursChange > 0 ? '+' : ''}${simulation.studyHoursChange} hours/week
      - Sleep: ${simulation.sleepChange > 0 ? '+' : ''}${simulation.sleepChange} hours/night
      - Spending: ${simulation.spendingChange > 0 ? '+' : ''}${simulation.spendingChange}%

      TASK:
      Project the potential impact of these changes over the next 30 days.
      1. Estimate impact on Academic Performance.
      2. Estimate impact on Wellbeing.
      3. Provide one key risk or opportunity warning.
      
      Tone: Analytical, futuristic. Concise (max 100 words).
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Simulation analysis unavailable.";
  } catch (error) {
    console.error("Gemini Simulation Error:", error);
    return "Unable to run predictive model.";
  }
};