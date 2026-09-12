// ============================================================
// Car details page: reads ?id=... from the URL and fills in
// the page from Supabase (spec list, description, photo gallery)
// ============================================================

function formatNumber(value) {
  return new Intl.NumberFormat('ro-RO').format(value);
}

function formatPrice(value) {
  if (value === null || value === undefined) return '';
  return formatNumber(value) + ' €';
}

function setText(id, value, fallback = '-') {
  const el = document.getElementById(id);
  if (el) el.textContent = (value === null || value === undefined || value === '') ? fallback : value;
}

function showNotFound() {
  document.getElementById('detail-price').textContent = 'Mașină negăsită';
  document.getElementById('detail-subtitle').textContent = 'Ne pare rău, această mașină nu mai este disponibilă sau linkul este greșit.';
  document.getElementById('detail-description').textContent = '';
  const heroRow = document.querySelector('.col-md-7');
  if (heroRow) heroRow.style.display = 'none';
}

function renderGallery(images) {
  const hero = document.getElementById('detail-hero-image');
  const thumbsContainer = document.getElementById('detail-thumbnails');
  const fallback = 'assets/images/product-1-720x480.jpg';

  const gallery = (images && images.length) ? images : [fallback];

  hero.src = gallery[0];

  thumbsContainer.innerHTML = gallery.map((url, index) => `
    <div class="col-sm-4 col-6">
      <div>
        <img src="${url}" alt="" class="img-fluid detail-thumb" data-src="${url}" style="cursor: pointer; ${index === 0 ? 'outline: 2px solid #ccc;' : ''}">
      </div>
      <br>
    </div>
  `).join('');

  thumbsContainer.querySelectorAll('.detail-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      hero.src = thumb.dataset.src;
      thumbsContainer.querySelectorAll('.detail-thumb').forEach(t => t.style.outline = 'none');
      thumb.style.outline = '2px solid #ccc';
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const carId = params.get('id');

  if (!carId) {
    showNotFound();
    return;
  }

  const { data: car, error } = await supabaseClient
    .from('cars')
    .select('*')
    .eq('id', carId)
    .single();

  if (error || !car) {
    console.error(error);
    showNotFound();
    return;
  }

  const title = [car.make, car.model, car.year].filter(Boolean).join(' ');
  document.title = `Car Life Auto Carei | ${title}`;

  const hasDiscount = car.old_price && Number(car.old_price) > Number(car.price);
  document.getElementById('detail-price').innerHTML = hasDiscount
    ? `<small><del>${formatPrice(car.old_price)}</del></small> &nbsp; ${formatPrice(car.price)}`
    : formatPrice(car.price);

  document.getElementById('detail-subtitle').textContent = title;

  renderGallery(car.images && car.images.length ? car.images : (car.image_url ? [car.image_url] : []));

  setText('detail-make', car.make);
  setText('detail-model', car.model);
  setText('detail-body-type', car.body_type);
  setText('detail-year', car.year);
  setText('detail-mileage', car.mileage != null ? formatNumber(car.mileage) + ' km' : null);
  setText('detail-fuel', car.fuel_type);
  setText('detail-engine', car.engine_cc != null ? car.engine_cc + ' cc' : null);
  setText('detail-power', car.power_hp != null ? car.power_hp + ' CP' : null);
  setText('detail-transmission', car.transmission);
  setText('detail-seats', car.seats);
  setText('detail-doors', car.doors);
  setText('detail-color', car.color);

  setText('detail-description', car.description, 'Nu există o descriere pentru această mașină.');
});
