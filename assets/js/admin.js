// ============================================================
// Admin page logic: auth gate + add/delete cars
// ============================================================

const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const carForm = document.getElementById('car-form');
const carFormMsg = document.getElementById('car-form-msg');
const carsTableBody = document.getElementById('cars-table-body');

function showLogin() {
  loginSection.style.display = 'block';
  dashboardSection.style.display = 'none';
}

function showDashboard() {
  loginSection.style.display = 'none';
  dashboardSection.style.display = 'block';
  loadCars();
}

async function checkSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    showDashboard();
  } else {
    showLogin();
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';

  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    loginError.textContent = 'Autentificare eșuată: ' + error.message;
    return;
  }
  showDashboard();
});

logoutBtn.addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  showLogin();
});

async function uploadImage(file) {
  if (!file) return null;
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

  const { error } = await supabaseClient.storage.from('car-images').upload(fileName, file);
  if (error) throw error;

  const { data } = supabaseClient.storage.from('car-images').getPublicUrl(fileName);
  return data.publicUrl;
}

function numOrNull(id) {
  const val = document.getElementById(id).value;
  return val === '' ? null : Number(val);
}

carForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  carFormMsg.textContent = 'Se salvează...';
  carFormMsg.style.color = '#333';

  try {
    const imageFile = document.getElementById('car-image').files[0];
    const imageUrl = await uploadImage(imageFile);

    const payload = {
      make: document.getElementById('car-make').value,
      model: document.getElementById('car-model').value,
      body_type: document.getElementById('car-body-type').value || null,
      price: numOrNull('car-price'),
      old_price: numOrNull('car-old-price'),
      year: numOrNull('car-year'),
      mileage: numOrNull('car-mileage'),
      engine_cc: numOrNull('car-engine'),
      power_hp: numOrNull('car-power'),
      fuel_type: document.getElementById('car-fuel').value || null,
      transmission: document.getElementById('car-transmission').value || null,
      doors: numOrNull('car-doors'),
      seats: numOrNull('car-seats'),
      description: document.getElementById('car-description').value || null,
      image_url: imageUrl,
    };

    const { error } = await supabaseClient.from('cars').insert(payload);
    if (error) throw error;

    carFormMsg.style.color = '#2e7d32';
    carFormMsg.textContent = 'Mașină adăugată cu succes.';
    carForm.reset();
    loadCars();
  } catch (err) {
    console.error(err);
    carFormMsg.style.color = '#c0392b';
    carFormMsg.textContent = 'Eroare: ' + err.message;
  }
});

async function loadCars() {
  const { data, error } = await supabaseClient
    .from('cars')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    carsTableBody.innerHTML = `<tr><td colspan="5">Eroare la încărcare: ${error.message}</td></tr>`;
    return;
  }

  if (!data.length) {
    carsTableBody.innerHTML = '<tr><td colspan="5">Nu există mașini adăugate încă.</td></tr>';
    return;
  }

  carsTableBody.innerHTML = data.map(car => `
    <tr>
      <td>${car.make || ''} ${car.model || ''}</td>
      <td>${car.year || '-'}</td>
      <td>${car.price != null ? car.price + ' €' : '-'}</td>
      <td>${car.mileage != null ? car.mileage + ' km' : '-'}</td>
      <td><button class="btn btn-sm btn-danger" data-id="${car.id}">Șterge</button></td>
    </tr>
  `).join('');

  carsTableBody.querySelectorAll('button[data-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Sigur ștergeți această mașină?')) return;
      const { error } = await supabaseClient.from('cars').delete().eq('id', btn.dataset.id);
      if (error) {
        alert('Eroare la ștergere: ' + error.message);
        return;
      }
      loadCars();
    });
  });
}

checkSession();
