const API = '/api';
async function apiGet(url, token) {
  const r = await fetch(API + url, { headers: token ? { Authorization: 'Bearer ' + token } : {} });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function apiSend(url, method, body, token) {
  const r = await fetch(API + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!r.ok) throw new Error((await r.json()).error || 'Request failed');
  return r.json();
}

// Global Navbar Trip Counter
function updateTripBadge() {
  const badge = document.getElementById('tripBadge');
  if (badge) {
    const trip = JSON.parse(localStorage.getItem('myTrip') || '[]');
    badge.textContent = trip.length;
    badge.style.display = trip.length > 0 ? 'inline-block' : 'none';
  }
}
document.addEventListener('DOMContentLoaded', updateTripBadge);