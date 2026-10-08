let activeCategories = new Set();
let allCategories = [];

async function loadCategories() {
  allCategories = await apiGet('/places/meta/categories');
  const box = document.getElementById('filters');
  box.innerHTML = allCategories.map(c =>
    `<button class="btn btn-outline-success btn-sm" data-cat="${c.name}">${c.name}</button>`
  ).join('');
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
      <div class="card h-100 shadow-sm">
        ${p.image_url ? `<img src="${p.image_url}" class="card-img-top" alt="">` : ''}
        <div class="card-body d-flex flex-column">
          <h5 class="card-title">${p.name}</h5>
          <div class="mb-2">${p.categories.map(c=>`<span class="badge bg-secondary me-1">${c}</span>`).join('')}</div>
          <p class="card-text small flex-grow-1">${p.description.slice(0,90)}…</p>
          <div class="text-muted small mb-2">${p.distance_km} km away</div>
          <a href="place.html?id=${p.id}" class="btn btn-sm btn-success">View Details</a>
        </div>
      </div>
    </div>
  `).join('');
}

document.getElementById('search').addEventListener('input', loadPlaces);
document.getElementById('sort').addEventListener('change', loadPlaces);
loadCategories().then(loadPlaces);