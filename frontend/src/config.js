// On Vercel, VITE_API_URL comes from the project settings. Locally we use localhost
export const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";