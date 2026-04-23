const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function getFunding() {
  const res = await fetch(`${BASE}/api/funding`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch funding");
  return res.json();
}

export function getApiUrl(): string {
  // Codespaces
  if (typeof window !== 'undefined' && window.location.hostname.includes('app.github.dev')) {
    return window.location.origin.replace(/\-\d+\./, '-3001.');
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
}
