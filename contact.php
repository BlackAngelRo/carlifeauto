<?php
// ============================================================
// contact.php -- primeste toate formularele de contact de pe
// site (index.html, about.html, contact.html, faq.html,
// terms.html, cars.html, car-details.html) si trimite un
// email catre adresa de mai jos.
// ============================================================

// -------- CONFIGURARE (singurele linii pe care ar trebui sa le modifici) --------
$destinatar        = 'contact@carlifeautocarei.ro';
$nume_site         = 'Car Life Auto Carei';
$adresa_expeditor  = 'noreply@carlifeautocarei.ro'; // creeaza aceasta casuta in cPanel
// ----------------------------------------------------------------------------------

// Acceptam doar cereri trimise prin formular (POST)
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: index.html');
    exit;
}

// Pagina catre care revenim dupa trimitere (default: index.html)
$pagini_permise = ['index.html', 'about.html', 'contact.html', 'faq.html', 'terms.html', 'cars.html', 'car-details.html'];
$pagina_retur = isset($_POST['pagina']) ? basename($_POST['pagina']) : 'index.html';
if (!in_array($pagina_retur, $pagini_permise, true)) {
    $pagina_retur = 'index.html';
}

function redirecteaza_si_opreste($pagina, $status) {
    header('Location: ' . $pagina . '?contact=' . $status . '#contact');
    exit;
}

// Capcana anti-spam: campul "website" e ascuns din CSS pe formular si nu ar
// trebui completat niciodata de un vizitator real -- doar de roboti.
if (!empty($_POST['website'])) {
    redirecteaza_si_opreste($pagina_retur, 'ok'); // "reusita" falsa, nu trimitem nimic
}

// Citim si curatam datele primite
$nume    = trim(strip_tags($_POST['name'] ?? ''));
$email   = trim($_POST['email'] ?? '');
$subiect = trim(strip_tags($_POST['subject'] ?? ''));
$mesaj   = trim(strip_tags($_POST['message'] ?? ''));

// Validare minima
if ($nume === '' || $mesaj === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    redirecteaza_si_opreste($pagina_retur, 'eroare');
}

// Protectie impotriva "header injection" (nume/email cu linii noi)
$nume  = str_replace(["\r", "\n"], '', $nume);
$email = str_replace(["\r", "\n"], '', $email);

// Continutul emailului
$subiect_email = $subiect !== '' ? $subiect : 'Mesaj nou de pe ' . $nume_site;

$continut  = "Ati primit un mesaj nou de pe site-ul $nume_site\n";
$continut .= "Pagina: $pagina_retur\n\n";
$continut .= "Nume: $nume\n";
$continut .= "Email: $email\n";
if ($subiect !== '') {
    $continut .= "Subiect: $subiect\n";
}
$continut .= "\nMesaj:\n$mesaj\n";

// Antetele emailului
// "From" ramane pe domeniul propriu (mai putine sanse sa ajunga in spam),
// iar "Reply-To" e adresa vizitatorului, ca sa poti raspunde direct lui.
$headers   = [];
$headers[] = 'From: ' . $nume_site . ' <' . $adresa_expeditor . '>';
$headers[] = 'Reply-To: ' . $nume . ' <' . $email . '>';
$headers[] = 'Content-Type: text/plain; charset=UTF-8';
$headers[] = 'X-Mailer: PHP/' . phpversion();

$subiect_email_encodat = '=?UTF-8?B?' . base64_encode($subiect_email) . '?=';

$trimis = mail($destinatar, $subiect_email_encodat, $continut, implode("\r\n", $headers));

redirecteaza_si_opreste($pagina_retur, $trimis ? 'ok' : 'eroare');
