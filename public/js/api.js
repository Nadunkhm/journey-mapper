const API = '/api';
async function apiGet(url) {
  const r = await fetch(API + url);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function apiSend(url, method, body, token) {
  const r = await fetch(API + url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {})
    },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error((await r.json()).error || 'Request failed');
  return r.json();
}