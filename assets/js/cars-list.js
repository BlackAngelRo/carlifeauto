// ============================================================
// Public car listing page: fetch + render + filter
// Expects a Supabase table called "cars" (see supabase-setup.sql)
// ============================================================

let allCars = [];
let currentFilteredCars = [];
let currentPage = 1;
const CARS_PER_PAGE = 9;

function formatNumber(value) {
  return new Intl.NumberFormat('ro-RO').format(value);
}

function formatPrice(value) {
  if (value === null || value === undefined) return '';
  return formatNumber(value) + ' €';
}

function parseRange(value) {
  if (!value) return null;
  const [min, max] = value.split('-').map(Number);
  return { min, max };
}

function carCardHTML(car) {
  const hasDiscount = car.old_price && Number(car.old_price) > Number(car.price);
  const priceHTML = hasDiscount
    ? `<del><sup></sup>${formatPrice(car.old_price)}</del> &nbsp; ${formatPrice(car.price)}`
    : formatPrice(car.price);

  const image = (car.images && car.images[0]) || car.image_url || 'assets/images/product-1-720x480.jpg';
  const title = [car.make, car.model, car.year].filter(Boolean).join(' ');

  return `
    <div class="col-md-4">
      <div class="service-item">
        <img src="${image}" alt="${title}">
        <div class="down-content">
          <h4>${title}</h4>
          <div style="margin-bottom:10px;">
            <span>${priceHTML}</span>
          </div>
          <p>
            <i class="fa fa-dashboard"></i> ${car.mileage ? formatNumber(car.mileage) + ' km' : '-'} &nbsp;&nbsp;&nbsp;
            <i class="fa fa-cube"></i> ${car.engine_cc ? car.engine_cc + ' cc' : '-'} &nbsp;&nbsp;&nbsp;
            <i class="fa fa-cog"></i> ${car.transmission || '-'} &nbsp;&nbsp;&nbsp;
          </p>
          <a href="car-details.html?id=${car.id}" class="filled-button">Vezi detalii</a>
        </div>
      </div>
      <br>
    </div>
  `;
}

function renderCars(cars, resetPage = true) {
  currentFilteredCars = cars;
  if (resetPage) currentPage = 1;

  const grid = document.getElementById('car-grid');

  if (!cars.length) {
    grid.innerHTML = '<div class="col-md-12 text-center"><p>Nu am găsit mașini care să corespundă filtrelor selectate.</p></div>';
    renderPagination(0);
    return;
  }

  const totalPages = Math.max(1, Math.ceil(cars.length / CARS_PER_PAGE));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * CARS_PER_PAGE;
  const pageCars = cars.slice(start, start + CARS_PER_PAGE);

  grid.innerHTML = pageCars.map(carCardHTML).join('');
  renderPagination(cars.length);
}

function goToPage(page) {
  const totalPages = Math.max(1, Math.ceil(currentFilteredCars.length / CARS_PER_PAGE));
  if (page < 1 || page > totalPages || page === currentPage) return;
  currentPage = page;
  renderCars(currentFilteredCars, false);
  document.getElementById('car-grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderPagination(totalItems) {
  const container = document.getElementById('pagination-controls');
  if (!container) return;

  const totalPages = Math.ceil(totalItems / CARS_PER_PAGE);
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  function pageItem(label, page, opts = {}) {
    const disabled = opts.disabled ? ' disabled' : '';
    const active = opts.active ? ' active' : '';
    return `
      <li class="page-item${disabled}${active}">
        <a class="page-link" href="#" data-page="${page}"${opts.ariaLabel ? ` aria-label="${opts.ariaLabel}"` : ''}>${label}</a>
      </li>
    `;
  }

  let html = '';
  html += pageItem('«', currentPage - 1, { disabled: currentPage === 1, ariaLabel: 'Anterior' });
  for (let p = 1; p <= totalPages; p++) {
    html += pageItem(p, p, { active: p === currentPage });
  }
  html += pageItem('»', currentPage + 1, { disabled: currentPage === totalPages, ariaLabel: 'Următor' });

  container.innerHTML = html;

  container.querySelectorAll('a.page-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const li = link.closest('.page-item');
      if (li.classList.contains('disabled') || li.classList.contains('active')) return;
      goToPage(Number(link.dataset.page));
    });
  });
}

function populateMakeFilter(cars) {
  const select = document.getElementById('filter-make');
  const makes = [...new Set(cars.map(c => c.make).filter(Boolean))].sort();
  makes.forEach(make => {
    const opt = document.createElement('option');
    opt.value = make;
    opt.textContent = make;
    select.appendChild(opt);
  });
}

function populateModelFilter(cars, selectedMake) {
  const select = document.getElementById('filter-model');
  select.innerHTML = '<option value="">--Toate--</option>';
  const models = [...new Set(
    cars.filter(c => !selectedMake || c.make === selectedMake)
      .map(c => c.model)
      .filter(Boolean)
  )].sort();
  models.forEach(model => {
    const opt = document.createElement('option');
    opt.value = model;
    opt.textContent = model;
    select.appendChild(opt);
  });
}

function applyFilters() {
  const bodyType = document.getElementById('filter-body-type').value;
  const make = document.getElementById('filter-make').value;
  const model = document.getElementById('filter-model').value;
  const priceRange = parseRange(document.getElementById('filter-price').value);
  const mileageRange = parseRange(document.getElementById('filter-mileage').value);
  const engineRange = parseRange(document.getElementById('filter-engine').value);
  const powerRange = parseRange(document.getElementById('filter-power').value);
  const fuel = document.getElementById('filter-fuel').value;
  const transmission = document.getElementById('filter-transmission').value;
  const doors = document.getElementById('filter-doors').value;
  const seats = document.getElementById('filter-seats').value;

  const filtered = allCars.filter(car => {
    if (bodyType && car.body_type !== bodyType) return false;
    if (make && car.make !== make) return false;
    if (model && car.model !== model) return false;
    if (priceRange && !(car.price >= priceRange.min && car.price <= priceRange.max)) return false;
    if (mileageRange && !(car.mileage >= mileageRange.min && car.mileage <= mileageRange.max)) return false;
    if (engineRange && !(car.engine_cc >= engineRange.min && car.engine_cc <= engineRange.max)) return false;
    if (powerRange && !(car.power_hp >= powerRange.min && car.power_hp <= powerRange.max)) return false;
    if (fuel && car.fuel_type !== fuel) return false;
    if (transmission && car.transmission !== transmission) return false;
    if (doors && String(car.doors) !== doors) return false;
    if (seats && String(car.seats) !== seats) return false;
    return true;
  });

  renderCars(filtered);
}

document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('car-grid');

  const { data, error } = await supabaseClient
    .from('cars')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    grid.innerHTML = '<div class="col-md-12 text-center"><p>A apărut o eroare la încărcarea mașinilor. Verificați configurarea Supabase din assets/js/supabase-config.js.</p></div>';
    return;
  }

  allCars = data || [];

  if (!allCars.length) {
    grid.innerHTML = '<div class="col-md-12 text-center"><p>Nu există încă mașini adăugate.</p></div>';
  } else {
    renderCars(allCars);
  }

  populateMakeFilter(allCars);
  populateModelFilter(allCars, '');

  document.getElementById('filter-make').addEventListener('change', (e) => {
    populateModelFilter(allCars, e.target.value);
  });

  document.getElementById('search-btn').addEventListener('click', (e) => {
    e.preventDefault();
    applyFilters();
  });
});
