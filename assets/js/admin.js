// ============================================================
// Admin page logic: auth gate + add/edit/delete cars with
// multiple photos
// ============================================================

const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');

const carForm = document.getElementById('car-form');
const carFormMsg = document.getElementById('car-form-msg');
const carFormHeading = document.getElementById('car-form-heading');
const carFormSubmitBtn = document.getElementById('car-form-submit-btn');
const carFormCancelBtn = document.getElementById('car-form-cancel-btn');
const carEditingIdInput = document.getElementById('car-editing-id');
const existingImagesPreview = document.getElementById('existing-images-preview');
const carsTableBody = document.getElementById('cars-table-body');

// URLs of images already saved for the car currently being edited.
// New uploads get appended to this list on save. Removing a thumbnail
// just takes it out of this array (the file itself is left in storage).
let existingImages = [];
let imagesPendingDeletion = []; // poze scoase din galerie in timpul editarii, de sters din storage doar la salvare
let allCarsCache = [];

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

// -------------------- image handling --------------------

// Scales an image down (preserving aspect ratio, no cropping -- cropping for
// display is handled by CSS) so uploads stay small and fast, and re-encodes
// it as a JPEG. Cropping to a fixed shape happens later, at display time.
function resizeImageFile(file, maxDimension = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Nu s-a putut citi imaginea.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Nu s-a putut încărca imaginea.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error('Nu s-a putut procesa imaginea.')); return; }
          const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
          resolve(new File([blob], newName, { type: 'image/jpeg' }));
        }, 'image/jpeg', quality);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Din URL-ul public (ex: https://xxxx.supabase.co/storage/v1/object/public/car-images/12345-abc.jpg)
// extragem doar numele fișierului, ca să-l putem șterge din storage.
function extractStorageFilename(url) {
  if (!url) return null;
  const marker = '/car-images/';
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

// Șterge din storage o listă de URL-uri de poze.
async function deletePhotosByUrl(urls) {
  const filenames = [...new Set(urls.map(extractStorageFilename).filter(Boolean))];
  if (!filenames.length) return;

  const { error } = await supabaseClient.storage.from('car-images').remove(filenames);
  if (error) {
    // Nu blocăm operația principală (ștergere mașină / salvare editare) dacă
    // pozele nu s-au putut șterge din storage -- doar semnalăm în consolă.
    console.error('Nu s-au putut șterge toate pozele din storage:', error);
  }
}

// Șterge din storage toate pozele unei mașini (array "images" + eventualul "image_url" vechi)
async function deleteCarPhotos(car) {
  await deletePhotosByUrl([
    ...(car.images || []),
    ...(car.image_url ? [car.image_url] : []),
  ]);
}

async function uploadImage(file) {
  const resized = await resizeImageFile(file);
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

  const { error } = await supabaseClient.storage.from('car-images').upload(fileName, resized);
  if (error) throw error;

  const { data } = supabaseClient.storage.from('car-images').getPublicUrl(fileName);
  return data.publicUrl;
}

function renderExistingImagesPreview() {
  existingImagesPreview.innerHTML = existingImages.map((url, index) => `
    <div class="thumb-preview">
      <img src="${url}" alt="">
      <button type="button" class="remove-thumb" data-index="${index}" title="Elimină poza">×</button>
    </div>
  `).join('');

  existingImagesPreview.querySelectorAll('.remove-thumb').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.index);
      const [removedUrl] = existingImages.splice(idx, 1);
      if (removedUrl) imagesPendingDeletion.push(removedUrl);
      renderExistingImagesPreview();
    });
  });
}

// -------------------- add / edit form --------------------

function numOrNull(id) {
  const val = document.getElementById(id).value;
  return val === '' ? null : Number(val);
}

function resetFormToAddMode() {
  carForm.reset();
  carEditingIdInput.value = '';
  existingImages = [];
  imagesPendingDeletion = [];
  renderExistingImagesPreview();
  carFormHeading.textContent = 'Adaugă mașină';
  carFormSubmitBtn.textContent = 'Salvează mașina';
  carFormCancelBtn.style.display = 'none';
  carFormMsg.textContent = '';
}

function startEditingCar(car) {
  carEditingIdInput.value = car.id;
  document.getElementById('car-make').value = car.make || '';
  document.getElementById('car-model').value = car.model || '';
  document.getElementById('car-body-type').value = car.body_type || '';
  document.getElementById('car-year').value = car.year ?? '';
  document.getElementById('car-mileage').value = car.mileage ?? '';
  document.getElementById('car-price').value = car.price ?? '';
  document.getElementById('car-old-price').value = car.old_price ?? '';
  document.getElementById('car-power').value = car.power_hp ?? '';
  document.getElementById('car-engine').value = car.engine_cc ?? '';
  document.getElementById('car-fuel').value = car.fuel_type || '';
  document.getElementById('car-transmission').value = car.transmission || '';
  document.getElementById('car-doors').value = car.doors ?? '';
  document.getElementById('car-seats').value = car.seats ?? '';
  document.getElementById('car-color').value = car.color || '';
  document.getElementById('car-description').value = car.description || '';
  document.getElementById('car-images-input').value = '';

  existingImages = (car.images && car.images.length) ? [...car.images] : (car.image_url ? [car.image_url] : []);
  imagesPendingDeletion = [];
  renderExistingImagesPreview();

  carFormHeading.textContent = `Editează: ${car.make} ${car.model}`;
  carFormSubmitBtn.textContent = 'Actualizează mașina';
  carFormCancelBtn.style.display = 'inline-block';
  carFormMsg.textContent = '';

  document.getElementById('car-form-heading').scrollIntoView({ behavior: 'smooth' });
}

carFormCancelBtn.addEventListener('click', resetFormToAddMode);

carForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  carFormMsg.style.color = '#333';
  carFormMsg.textContent = 'Se salvează...';

  try {
    const newFiles = Array.from(document.getElementById('car-images-input').files);
    const uploadedUrls = [];
    for (const file of newFiles) {
      uploadedUrls.push(await uploadImage(file));
    }

    const finalImages = [...existingImages, ...uploadedUrls];

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
      color: document.getElementById('car-color').value || null,
      description: document.getElementById('car-description').value || null,
      images: finalImages,
      image_url: finalImages[0] || null, // kept in sync for backward compatibility
    };

    const editingId = carEditingIdInput.value;

    let error;
    if (editingId) {
      ({ error } = await supabaseClient.from('cars').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabaseClient.from('cars').insert(payload));
    }
    if (error) throw error;

    if (editingId && imagesPendingDeletion.length) {
      await deletePhotosByUrl(imagesPendingDeletion);
    }

    carFormMsg.style.color = '#2e7d32';
    carFormMsg.textContent = editingId ? 'Mașină actualizată cu succes.' : 'Mașină adăugată cu succes.';
    resetFormToAddMode();
    loadCars();
  } catch (err) {
    console.error(err);
    carFormMsg.style.color = '#c0392b';
    carFormMsg.textContent = 'Eroare: ' + err.message;
  }
});

// -------------------- existing cars table --------------------

async function loadCars() {
  const { data, error } = await supabaseClient
    .from('cars')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    carsTableBody.innerHTML = `<tr><td colspan="6">Eroare la încărcare: ${error.message}</td></tr>`;
    return;
  }

  allCarsCache = data || [];

  if (!allCarsCache.length) {
    carsTableBody.innerHTML = '<tr><td colspan="6">Nu există mașini adăugate încă.</td></tr>';
    return;
  }

  carsTableBody.innerHTML = allCarsCache.map(car => {
    const thumb = (car.images && car.images[0]) || car.image_url || '';
    return `
    <tr>
      <td>${thumb ? `<img src="${thumb}" class="table-thumb" alt="">` : '-'}</td>
      <td>${car.make || ''} ${car.model || ''}</td>
      <td>${car.year || '-'}</td>
      <td>${car.price != null ? car.price + ' €' : '-'}</td>
      <td>${car.mileage != null ? car.mileage + ' km' : '-'}</td>
      <td>
        <button class="btn btn-sm btn-outline-secondary" data-edit-id="${car.id}">Editează</button>
        <button class="btn btn-sm btn-danger" data-id="${car.id}">Șterge</button>
      </td>
    </tr>
  `;
  }).join('');

  carsTableBody.querySelectorAll('button[data-edit-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const car = allCarsCache.find(c => c.id === btn.dataset.editId);
      if (car) startEditingCar(car);
    });
  });

  carsTableBody.querySelectorAll('button[data-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Sigur ștergeți această mașină? Se vor șterge și pozele ei.')) return;

      const car = allCarsCache.find(c => c.id === btn.dataset.id);
      if (car) {
        await deleteCarPhotos(car);
      }

      const { error } = await supabaseClient.from('cars').delete().eq('id', btn.dataset.id);
      if (error) {
        alert('Eroare la ștergere: ' + error.message);
        return;
      }
      if (carEditingIdInput.value === btn.dataset.id) {
        resetFormToAddMode();
      }
      loadCars();
    });
  });
}

checkSession();
