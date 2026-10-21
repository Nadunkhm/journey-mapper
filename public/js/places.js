let activeCategories = new Set();

async function loadCategories() {
  const cats = await apiGet('/places/meta/categories');
  const box = document.getElementById('filters');
  box.innerHTML = cats.map(c => `<button class="btn btn-outline-success btn-sm" data-cat="${c.name}">${c.name}</button>`).join('');
  box.querySelectorAll('button').forEach(btn => {
    btn.onclick = () => {
      const c = btn.dataset.cat;
      activeCategories.has(c) ? activeCategories.delete(c) : activeCategories.add(c);
      btn.classList.toggle('active');
      loadPlaces();
    };
  });
}

async function loadPlaces() {
  const q = document.getElementById('search').value.trim();
  const sort = document.getElementById('sort').value;
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (activeCategories.size) params.set('categories', [...activeCategories].join(','));
  params.set('sort', sort);

  const places = await apiGet('/places?' + params);
  const box = document.getElementById('results');
  const empty = document.getElementById('empty');

  if (!places.length) { box.innerHTML = ''; empty.classList.remove('d-none'); return; }
  empty.classList.add('d-none');

  box.innerHTML = places.map(p => `
    <div class="col-md-4">
      <div class="card h-100 shadow-sm border-0">
        <div class="card-body d-flex flex-column">
          <h5 class="card-title">${p.name}</h5>
          <div class="mb-2">
            ${p.categories.map(c=>`<span class="badge bg-secondary me-1">${c}</span>`).join('')}
            ${p.avg_rating ? `<span class="badge bg-warning text-dark float-end">⭐ ${p.avg_rating}</span>` : ''}
          </div>
          <p class="card-text small flex-grow-1">${p.description.slice(0,80)}…</p>
          <div class="text-muted small mb-3">${p.distance_km} km away</div>
          <div class="d-flex gap-2">
            <a href="place.html?id=${p.id}" class="btn btn-sm btn-success w-100">View</a>
            <button class="btn btn-sm btn-outline-primary w-100" onclick='addToTrip(${p.id}, "${p.name.replace(/'/g, "")}", ${p.distance_km})'>+ Trip</button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function addToTrip(id, name, distance) {
  let trip = JSON.parse(localStorage.getItem('myTrip') || '[]');
  if (trip.find(p => p.id === id)) return alert('Already in your trip!');
  trip.push({ id, name, distance });
  localStorage.setItem('myTrip', JSON.stringify(trip));
  updateTripBadge();
  alert(`✅ "${name}" added to your Trip Planner!`);
}

document.getElementById('search').addEventListener('input', loadPlaces);
document.getElementById('sort').addEventListener('change', loadPlaces);
loadCategories().then(loadPlaces);