const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function getFunding() {
  const res = await fetch(`${BASE}/api/funding`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch funding');
  return res.json();
}
export async function getApiUrl() {
  return BASE;
}