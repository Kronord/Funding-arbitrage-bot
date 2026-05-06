const BASE = process.env.NEXT_PUBLIC_API_URL || "https://potential-rotary-phone-xqrg55wx764c9q4-10000.app.github.dev";

export async function getFunding() {
  const res = await fetch(`${BASE}/api/funding`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch funding");
  return res.json();
}

export function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'https://potential-rotary-phone-xqrg55wx764c9q4-10000.app.github.dev';
}
