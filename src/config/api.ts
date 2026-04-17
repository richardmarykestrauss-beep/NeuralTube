/**
 * Centralized API configuration for NeuralTube frontend.
 * Uses the Cloud Run backend URL in production and localhost in development.
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV
    ? "http://localhost:3000"
    : "https://neuraltube-backend-562764282076.europe-west1.run.app");
