# Smart Expense Analytics System

A full-stack, AI-powered financial monitoring platform built with React, Express, and Firebase (Firestore + Auth).

## Features
- **Smart Insights**: Uses Gemini AI to analyze spending patterns and provide actionable financial advice.
- **Spending Forecasts**: Predicts next month's spending based on historical data.
- **Real-time Synchronization**: Instant updates across devices using Firestore.
- **Secure Authentication**: Role-based access and secure login via Google Auth.
- **Budgeting Engine**: Track spending against monthly limits with visual alerts.
- **Technical Dashboard**: High-density charts and metrics for precise financial control.

## Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Recharts, Framer Motion.
- **Backend**: Express (Node.js) acting as a Vite middleware proxy.
- **Database**: Firebase Firestore (Enterprise Edition).
- **Security**: Strict ABAC rules for data isolation.
- **AI**: Gemini 3 Flash for financial reasoning.

## API Endpoints (Express)
- `GET /api/health`: Health check for the server.
- `GET /api/stats`: Placeholder for server-side analytics extension.

## Setup
1. **Firebase**: The project is pre-configured with Firebase in `asia-southeast1`.
2. **Secrets**: Ensure `GEMINI_API_KEY` is set in the AI Studio Secrets panel.
3. **Run**: The survey starts automatically on Port 3000.

## Smart Features Deep Dive
The system calculates:
1. **Drift Detection**: Alerts when spending in a category deviates from the 7-day average.
2. **Category Entropy**: Identifies which areas are the least predictable.
3. **AI Reasoning**: "You spent 35% more on food this month... try meal prepping to save $200."
