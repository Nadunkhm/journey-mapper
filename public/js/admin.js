const token = localStorage.getItem('jm_token');
if (!token) location.href = 'admin-login.html';

function logout() { localStorage.removeItem('jm_token'); location.href = 'index.html'; }

async function loadPlaces() {
  const places = await apiGet('/places');
  document.getElementById('tabContent').innerHTML = `
    <button class="btn btn-success mb-3" onclick="editPlace()">+ Add Place</button>
    <table class="table table-striped bg-white">
      <thead><tr><th>Name</th><th>Categories</th><th>Distance</th><th></th></tr></thead>
      <tbody>${places.map(p => `
        <tr>
          <td>${p.name}</td>
          <td>${p.categories.join(', ')}</td>
          <td>${p.distance_km} km</td>
          <td>
            <button class="btn btn-sm btn-primary" onclick='editPlace(${JSON.stringify(p)})'>Edit</button>
            <button class="btn btn-sm btn-danger" onclick="delPlace(${p.id},'${p.name}')">Delete</button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

async function delPlace(id, name) {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  await apiSend('/admin/places/' + id, 'DELETE', null, token);
  loadPlaces();
}

async function editPlace(p = null) {
  const cats = await apiGet('/places/meta/categories');
  const isNew = !p;
  const selected = new Set(p?.categories || []);
  document.getElementById('tabContent').innerHTML = `
    <h4>${isNew ? 'Add' : 'Edit'} Place</h4>
    <div id="err" class="alert alert-danger d-none"></div>
    <div class="row g-2">
      <div class="col-md-6"><input id="f_name" class="form-control" placeholder="Name" value="${p?.name||''}"></div>
      <div class="col-md-6"><input id="f_dist" class="form-control" placeholder="Distance (km)" value="${p?.distance_km||''}"></div>
      <div class="col-md-6"><input id="f_lat" class="form-control" placeholder="Latitude" value="${p?.latitude||''}"></div>
      <div class="col-md-6"><input id="f_lng" class="form-control" placeholder="Longitude" value="${p?.longitude||''}"></div>
      <div class="col-md-6"><input id="f_hours" class="form-control" placeholder="Opening hours" value="${p?.opening_hours||''}"></div>
      <div class="col-md-6"><input id="f_fee" class="form-control" placeholder="Entry fee" value="${p?.entry_fee||''}"></div>
      <div class="col-md-6"><input id="f_img" class="form-control" placeholder="Image URL" value="${p?.image_url||''}"></div>
      <div class="col-12"><textarea id="f_desc" class="form-control" placeholder="Description">${p?.description||''}</textarea></div>
      <div class="col-12"><textarea id="f_tips" class="form-control" placeholder="Travel tips">${p?.travel_tips||''}</textarea></div>
      <div class="col-12">
        <label class="form-label mt-2">Categories</label><br>
        ${cats.map(c => `<label class="me-3"><input type="checkbox" value="${c.id}" ${selected.has(c.name)?'checked':''} class="cat-cb"> ${c.name}</label>`).join('')}
      </div>
      <div class="col-12">
        <button class="btn btn-success" onclick="savePlace(${isNew ? 'null' : p.id})">Save</button>
        <button class="btn btn-secondary" onclick="loadPlaces()">Cancel</button>
      </div>
    </div>`;
}

async function savePlace(id) {
  const body = {
    name: document.getElementById('f_name').value.trim(),
    description: document.getElementById('f_desc').value.trim(),
    distance_km: document.getElementById('f_dist').value || null,
    latitude: document.getElementById('f_lat').value || null,
    longitude: document.getElementById('f_lng').value || null,
    opening_hours: document.getElementById('f_hours').value || null,
    entry_fee: document.getElementById('f_fee').value || null,
    image_url: document.getElementById('f_img').value || null,
    travel_tips: document.getElementById('f_tips').value || null,
    categoryIds: [...document.querySelectorAll('.cat-cb:checked')].map(c => +c.value)
  };
  const err = document.getElementById('err');
  err.classList.add('d-none');
  try {
    if (id) await apiSend('/admin/places/' + id, 'PUT', body, token);
    else    await apiSend('/admin/places', 'POST', body, token);
    loadPlaces();
  } catch (e) {
    err.textContent = e.message; err.classList.remove('d-none');
  }
}

async function loadAudit() {
  const rows = await apiGet('/admin/audit');
  document.getElementById('tabContent').innerHTML = `
    <table class="table table-sm bg-white">
      <thead><tr><th>Time</th><th>Admin</th><th>Action</th><th>Place</th></tr></thead>
      <tbody>${rows.map(r => `<tr>
        <td>${new Date(r.action_time).toLocaleString()}</td>
        <td>${r.username||'-'}</td>
        <td>${r.action}</td>
        <td>${r.place_name||'(deleted)'}</td>
      </tr>`).join('')}</tbody>
    </table>`;
}

document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => {
  document.querySelectorAll('#tabs button').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  b.dataset.tab === 'places' ? loadPlaces() : loadAudit();
});

window.editPlace = editPlace;
window.savePlace = savePlace;
window.delPlace = delPlace;
window.logout = logout;

loadPlaces();