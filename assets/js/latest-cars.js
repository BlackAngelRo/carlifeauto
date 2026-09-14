// ============================================================
// Homepage "Noi în Stoc" section: shows the newest cars added
// ============================================================

function formatNumber(value) {
  return new Intl.NumberFormat('ro-RO').format(value);
}

function formatPrice(value) {
  if (value === null || value === undefined) return '';
  return formatNumber(value) + ' €';
}

function latestCarCardHTML(car) {
  const hasDiscount = car.old_price && Number(car.old_price) > Number(car.price);
  const priceHTML = hasDiscount
    ? `<del>${formatPrice(car.old_price)}</del> &nbsp; ${formatPrice(car.price)}`
    : formatPrice(car.price);

  const image = (car.images && car.images[0]) || car.image_url || 'assets/images/product-1-720x480.jpg';
  const title = [car.make, car.model].filter(Boolean).join(' ');

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
          <a href="car-details.html?id=${car.id}" class="filled-button">Detalii</a>
        </div>
      </div>
      <br>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('latest-cars-grid');

  const { data, error } = await supabaseClient
    .from('cars')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    console.error(error);
    grid.innerHTML = '<div class="col-md-12 text-center"><p>A apărut o eroare la încărcarea mașinilor.</p></div>';
    return;
  }

  if (!data || !data.length) {
    grid.innerHTML = '<div class="col-md-12 text-center"><p>Nu există încă mașini adăugate.</p></div>';
    return;
  }

  grid.innerHTML = data.map(latestCarCardHTML).join('');
});
