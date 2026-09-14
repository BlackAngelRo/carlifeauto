// ============================================================
// Afiseaza un mesaj de confirmare/eroare dupa ce contact.php
// redirectioneaza inapoi pe pagina (?contact=ok sau ?contact=eroare)
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const status = params.get('contact');
  if (!status) return;

  const esteSucces = status === 'ok';
  const mesaj = esteSucces
    ? 'Mulțumim! Mesajul dumneavoastră a fost trimis cu succes.'
    : 'A apărut o eroare la trimiterea mesajului. Vă rugăm încercați din nou sau sunați-ne la 0757 920 447.';

  const banner = document.createElement('div');
  banner.textContent = mesaj;
  banner.setAttribute('role', 'alert');
  banner.style.cssText = `
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
    z-index: 9999; max-width: 90%; padding: 14px 24px; border-radius: 6px;
    color: #fff; font-weight: 600; text-align: center;
    box-shadow: 0 4px 14px rgba(0,0,0,0.25);
    background: ${esteSucces ? '#2e7d32' : '#c0392b'};
  `;
  document.body.appendChild(banner);

  setTimeout(() => banner.remove(), 6000);

  // Curatam parametrul din URL ca sa nu reapara mesajul la refresh
  params.delete('contact');
  const newUrl = window.location.pathname
    + (params.toString() ? '?' + params.toString() : '')
    + window.location.hash;
  window.history.replaceState({}, '', newUrl);
});
