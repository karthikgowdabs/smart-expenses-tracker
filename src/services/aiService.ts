import { GoogleGenAI } from "@google/genai";
import { Expense, Category } from "../types";
import { format } from "date-fns";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateSpendingInsights(expenses: Expense[], categories: Category[], monthlyBudget: number) {
  if (expenses.length === 0) return "Add some expenses to get AI-powered insights!";

  const categoryMap = categories.reduce((acc, cat) => ({ ...acc, [cat.id]: cat.name }), {} as Record<string, string>);
  
  const summary = expenses.map(e => ({
    amount: e.amount,
    category: categoryMap[e.categoryId] || 'Unknown',
    date: format(new Date(e.date), 'yyyy-MM-dd'),
    description: e.description
  }));

  const prompt = `
    You are a financial advisor assistant. Analyze the following expense data and provide 2-3 concise, actionable insights.
    Monthly Budget: ${monthlyBudget}
    Expenses: ${JSON.stringify(summary)}
    
    Guidelines:
    - Identify patterns (e.g., "You spend most on weekends").
    - Detect anomalies (e.g., "Unusual spike in Food on Tuesday").
    - Compare categories.
    - Be supportive and clear.
    - Return plain text (no markdown formatting if possible, just bullet points).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "Unable to generate insights at this time.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "AI intelligence is temporarily unavailable.";
  }
}

export async function predictNextMonth(expenses: Expense[]) {
  if (expenses.length < 5) return null;

  const summary = expenses.map(e => ({ amount: e.amount, date: format(new Date(e.date), 'yyyy-MM-dd') }));

  const prompt = `
    Based on these recent expenses, predict the total spending for the next month. 
    Return ONLY a number as the predicted amount.
    Expenses: ${JSON.stringify(summary)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    const prediction = parseFloat(response.text?.trim() || "0");
    return isNaN(prediction) ? null : prediction;
  } catch (error) {
    return null;
  }
}
