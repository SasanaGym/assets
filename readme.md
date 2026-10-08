[![](https://data.jsdelivr.com/v1/package/gh/SasanaGym/assets/badge)](https://www.jsdelivr.com/package/gh/SasanaGym/assets)

# Sasana Gym Assets CDN 🏋️

Repository aset statis untuk aplikasi **Sasana Gym** (`sasana-apps`, CodeIgniter 4).
Repo ini adalah cermin (mirror) dari folder `public/` aplikasi, supaya aset bisa
disajikan lewat CDN ketika berkas lokal tidak tersedia.

## 📋 Daftar Isi

- [Tentang Project](#tentang-project)
- [Hubungan dengan `sasana-apps`](#hubungan-dengan-sasana-apps)
- [Pilihan CDN](#pilihan-cdn)
- [Struktur Direktori](#struktur-direktori)
- [Palet Warna Tema](#palet-warna-tema)
- [Cara Penggunaan](#cara-penggunaan)
- [Versioning](#versioning)
- [Sinkronisasi & Kontribusi](#sinkronisasi--kontribusi)
- [Catatan Aset](#catatan-aset)
- [License](#license)

---

## 🎯 Tentang Project

Repository ini menyediakan aset statis (library JS/CSS, font, ikon, gambar, dan
tema aplikasi) untuk **Sasana Gym** — sistem manajemen membership, check-in, dan
penjualan gym.

**Repository:** `SasanaGym/assets`
**Branch utama:** `main`
**Aplikasi konsumen:** `sasana-apps` (CodeIgniter 4.7.x, PHP 8)

**Isi Repository:**

- `vendors/` — **32 library pihak ketiga** (jQuery, Bootstrap 5 + Bootswatch,
  DataTables, Select2, SweetAlert2, TinyMCE, Chart.js, ApexCharts, ECharts,
  Font Awesome, Bootstrap Icons, dll.)
- `themes/plus-admin/` — **tema aktif** (BootstrapDash *Plus Admin*): CSS/JS
  layout, ikon MDI & Themify, serta JS per-modul sasana
  (`checkin.js`, `customer.js`, `package.js`, `merchandise.js`, `purchase.js`,
  `sale.js`, `reminder.js`, `dashboard.js`, `shell.js`, `csrf.js`)
- `themes/modern/` — **tema lama / fallback**: layout admin, halaman login &
  registrasi, `builtin/` (site.css, dark-theme.css, color-schemes, fonts),
  serta view bersama modul (`sasana.css`, `sasana.js`)
- `images/` — logo aplikasi, logo login, favicon, avatar, ikon filepicker, dan
  gambar contoh (`foto/`, `pelanggan/`, `produk/`, `user/`)

**Tech Stack:** jQuery · Bootstrap 5 + Bootswatch · Font Awesome & Bootstrap
Icons · DataTables · Select2 · SweetAlert2 · TinyMCE · Chart.js / ApexCharts /
ECharts · FullCalendar · Dropzone · Flatpickr

---

## 🔗 Hubungan dengan `sasana-apps`

Repo ini **bukan** sumber kebenaran — sumbernya adalah `sasana-apps/public/`.
Per 2026-10-09, ketiga folder di bawah sudah **identik** dengan aplikasi:

| Folder | Jumlah | Status vs `sasana-apps/public/` |
|---|---|---|
| `vendors/` | 32 direktori | ✅ identik |
| `themes/` | 286 berkas | ✅ identik |
| `images/` | 90 berkas | ✅ identik |
| `icons/` | — | ❌ **belum ada di repo ini** (lihat [Catatan Aset](#catatan-aset)) |

Aplikasi meresolusi aset lewat helper `app/Helpers/asset_helper.php`
(`asset_url()`): **kalau berkas ada di `public/`, pakai lokal; kalau tidak, baru
jatuh ke CDN.** Jadi repo ini hanya terpakai untuk berkas yang tidak ikut
ter-vendor di aplikasi.

> ⚠️ `app/Config/App.php` masih menunjuk `cloudUrl` ke repo lama:
> `https://cdn.jsdelivr.net/gh/vizitripdotcom/assets@0.1.42/`.
> Untuk benar-benar memakai repo ini, ubah ke
> `https://cdn.jsdelivr.net/gh/SasanaGym/assets@<versi>/`.

---

## 🌐 Pilihan CDN

### 1. jsDelivr (Recommended) ✅

```
https://cdn.jsdelivr.net/gh/SasanaGym/assets@<versi>/vendors/jquery/jquery.min.js
```

- ✅ Mendukung Content Security Policy (CSP)
- ✅ Global CDN, banyak mirror, auto-fallback antar-mirror
- ✅ Cache optimal dengan versioning tag
- ✅ Support Subresource Integrity (SRI) dan CORS header yang tepat

**Use case:** production dengan kebijakan keamanan ketat.

### 2. GitHub Pages ⚠️

```
https://sasanagym.github.io/assets/vendors/jquery/jquery.min.js
```

- ❌ Tidak mendukung CSP (tidak ada nonce/hash, CORS terbatas)
- ⚠️ Hanya cocok untuk development/testing tanpa requirement CSP

Deployment otomatis lewat `.github/workflows/static.yml` (push ke `main` →
seluruh isi repo di-upload sebagai artefak Pages).

### 3. StaticDelivr ✅

```
https://cdn.staticdelivr.com/gh/SasanaGym/assets/<versi>/vendors/jquery/jquery.min.js
```

- ✅ CSP compatible (domain konsisten, mudah di-whitelist)
- ✅ Auto-fallback ke server asal bila CDN gagal/terblokir

### Konfigurasi CSP

```apache
# Apache .htaccess
Header set Content-Security-Policy "script-src 'self' https://cdn.jsdelivr.net; style-src 'self' https://cdn.jsdelivr.net; font-src 'self' https://cdn.jsdelivr.net; img-src 'self' data: https://cdn.jsdelivr.net;"
```

```nginx
# Nginx
add_header Content-Security-Policy "script-src 'self' https://cdn.jsdelivr.net; style-src 'self' https://cdn.jsdelivr.net; font-src 'self' https://cdn.jsdelivr.net; img-src 'self' data: https://cdn.jsdelivr.net;" always;
```

---

## 📁 Struktur Direktori

```
assets_gym/
├── vendors/                        # 32 library pihak ketiga
│   ├── jquery/  jquery.select2/  jquery-nestable/  jquery.pwstrength.bootstrap/
│   ├── bootstrap/  bootstrap-icons/  bootstrap-datepicker/  bootstrap-typeahead/
│   ├── bootswatch/                 # varian tema bootstrap
│   ├── fontawesome/  material-icons/
│   ├── datatables/  select2/  sweetalert2/  tinymce/  spectrum/
│   ├── chartjs/  echarts/  fullcalendar/  dropzone/  flatpickr/
│   ├── autosize/  bootbox/  dragula/  js-yaml/  js.cookie/  notie/
│   ├── overlayscrollbars/  jwdfilepicker/  wdi/
│   └── rawbt/  rawthermal/         # cetak struk thermal (Android/WebUSB)
├── themes/
│   ├── plus-admin/                 # ★ TEMA AKTIF (BootstrapDash Plus Admin)
│   │   ├── assets/
│   │   │   ├── css/style.css
│   │   │   ├── js/                 # misc.js, off-canvas.js, hoverable-collapse.js, …
│   │   │   ├── fonts/Opensans/
│   │   │   ├── images/             # logo.svg, logo-mini.svg, faces, dashboard, …
│   │   │   └── vendors/            # mdi (Material Design Icons), ti-icons, simple-line-icons
│   │   ├── css/app.css
│   │   └── js/                     # csrf.js, shell.js, dashboard.js + JS per-modul sasana
│   └── modern/                     # tema lama / fallback
│       ├── builtin/
│       │   ├── css/                # site.css, bootstrap-custom.css, dark-theme.css,
│       │   │                       # project-theme.css, login.css, setting-*.css
│       │   │   ├── color-schemes/  # army-green, light/dark-sidebar, logo-background
│       │   │   └── fonts/          # arial, montserrat, open-sans, poppins, roboto, …
│       │   ├── fonts/              # webfont Font Awesome, glyphicons, Montserrat, Roboto, …
│       │   ├── images/bg.jpg
│       │   └── js/                 # site.js, functions.js, data-tables.js, module.js, …
│       ├── css/                    # sasana.css, dashboard.css, register.css, gallery.css, …
│       └── js/                     # sasana.js, app.js, data-tables-ajax.js, chartjs.js, …
├── images/
│   ├── logo_aplikasi.png  logo_login.png  favicon.ico
│   ├── folder.png  default_avatar.png  bg_login.jpg  purple.png
│   ├── filepicker_images/          # ikon per ekstensi berkas (doc, xls, pdf, mp4, …)
│   ├── foto/                       # foto contoh user
│   ├── pelanggan/                  # foto contoh customer
│   ├── produk/                     # gambar contoh produk
│   └── user/                       # avatar user + .htaccess
├── .github/workflows/static.yml    # deploy ke GitHub Pages
└── readme.md                       # dokumentasi ini
```

---

## 🎨 Palet Warna Tema

Sasana Gym memakai **brand biru**. Warna ini didefinisikan di
`themes/modern/builtin/css/project-theme.css` dan dipakai konsisten oleh PWA
manifest serta halaman auth:

| Warna | Hex | Penggunaan |
|---|---|---|
| Brand Blue | `#0950dc` | Awal gradient body, aksen utama |
| Brand Blue (mid) | `#0958d2` | Titik tengah gradient body |
| Brand Blue (end) | `#096ed2` | Akhir gradient body |
| PWA Theme | `#0033c4` | `theme_color` di `public/manifest.json` |
| Footer | `#252525` | Latar `footer` |

Lokasi definisi:

- `themes/modern/builtin/css/project-theme.css` → gradient body (berlaku light & dark)
- `themes/modern/builtin/css/color-schemes/` → skema warna yang bisa diganti dari
  halaman setting layout (`army-green`, `light-sidebar`, `dark-sidebar`,
  `light-logo-background`, `dark-logo-background`)
- `themes/plus-admin/assets/css/style.css` → variabel Bootstrap tema aktif

---

## 🚀 Cara Penggunaan

### Option 1: jsDelivr (Production)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/SasanaGym/assets@<versi>/vendors/bootstrap/css/bootstrap.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/SasanaGym/assets@<versi>/themes/plus-admin/assets/css/style.css">

<script src="https://cdn.jsdelivr.net/gh/SasanaGym/assets@<versi>/vendors/jquery/jquery.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/SasanaGym/assets@<versi>/vendors/bootstrap/js/bootstrap.bundle.min.js"></script>
```

### Option 2: GitHub Pages (Development)

```html
<script src="https://sasanagym.github.io/assets/vendors/jquery/jquery.min.js"></script>
```

### Option 3: Fallback Chain

```html
<script src="https://cdn.jsdelivr.net/gh/SasanaGym/assets@<versi>/vendors/jquery/jquery.min.js"></script>
<script>
    if (typeof jQuery === 'undefined') {
        document.write('<script src="https://sasanagym.github.io/assets/vendors/jquery/jquery.min.js"><\/script>');
    }
</script>
```

### Integrasi dengan `sasana-apps`

Aplikasi memakai helper `asset_url()` di `app/Helpers/asset_helper.php`:

```php
// app/Views/themes/modern/header.php
<script src="<?= asset_url('vendors/jquery/jquery.min.js') ?>"></script>
```

Helper itu memilih lokal atau CDN berdasarkan keberadaan berkas di `public/`,
dan memakai `filemtime()` sebagai penanda versi (`?v=...`) — bukan `?r=time()`.
Base URL CDN diambil dari `App::$cloudUrl` (`app/Config/App.php`).

**Agar repo ini terpakai**, `App::$cloudUrl` harus diarahkan ke sini:

```php
public const CLOUD_VER = '0.1.0';
public string $cloudUrl = 'https://cdn.jsdelivr.net/gh/SasanaGym/assets@' . self::CLOUD_VER . '/';
```

---

## 🏷️ Versioning

Semantic versioning `MAJOR.MINOR.PATCH`. jsDelivr & StaticDelivr membaca versi
dari **git tag**.

> Saat ini repo **belum punya tag**. Buat tag pertama sebelum memakai URL
> ber-versi:

```bash
git tag -a 0.1.0 -m "Rilis awal aset Sasana Gym"
git push origin 0.1.0
```

```html
<!-- versi spesifik (disarankan untuk production) -->
https://cdn.jsdelivr.net/gh/SasanaGym/assets@0.1.0/vendors/jquery/jquery.min.js
<!-- major version -->
https://cdn.jsdelivr.net/gh/SasanaGym/assets@0/vendors/jquery/jquery.min.js
<!-- latest -->
https://cdn.jsdelivr.net/gh/SasanaGym/assets@latest/vendors/jquery/jquery.min.js
```

---

## 🤝 Sinkronisasi & Kontribusi

Repo ini adalah cermin `sasana-apps/public/`. Aturan mainnya:

1. **Ubah dulu di `sasana-apps/public/`**, lalu salin ke sini — bukan sebaliknya.
   Kalau tidak, versi lokal dan CDN bisa berbeda dan bug-nya sulit dilacak.
2. Jangan mengubah berkas hanya di repo ini; perubahan akan tertimpa pada sync
   berikutnya.
3. Sinkronkan per folder agar mudah di-review:
   ```bash
   rsync -a --delete /d/DEV/PHP/sasana-apps/public/vendors/ vendors/
   rsync -a --delete /d/DEV/PHP/sasana-apps/public/themes/  themes/
   rsync -a --delete /d/DEV/PHP/sasana-apps/public/images/  images/
   ```
4. Naikkan tag versi setelah perubahan yang memengaruhi aplikasi, lalu update
   `CLOUD_VER` di `sasana-apps/app/Config/App.php`.

---

## 📝 Catatan Aset

### Berkas yang belum disalin

- **`icons/`** — set ikon PWA (`icon-72x72` … `icon-512x512`,
  `maskable-192/512`, `apple-touch-icon-180x180`) ada di
  `sasana-apps/public/icons/` dan dirujuk oleh `public/manifest.json`, tetapi
  **belum ada di repo ini**. Kalau PWA harus tetap jalan saat ikon lokal hilang,
  folder ini perlu disalin ke sini.

### Berkas sisa proyek lain (kandidat bersih-bersih)

`images/` masih memuat aset yang **tidak dirujuk** oleh `sasana-apps` — sisa
template HaloBayi/Komando:

| Berkas | Keterangan |
|---|---|
| `images/logo_hb.png` | logo HaloBayi |
| `images/logo_only_hb.png` + `.xcf` | logo HaloBayi (tanpa teks) + sumber GIMP |
| `images/logo_login_halu.png` | varian logo login lama |
| `images/purple.png` | aset template lama |
| `images/bg_login.jpg` | latar login lama |
| `images/default_avatar.png` | tidak dirujuk (yang dipakai `images/user/default.png`) |

Yang **masih dipakai**: `images/logo_login.png` (11 referensi),
`images/logo_aplikasi.png` (1), `images/folder.png` (8), `images/favicon.ico`,
`images/user/*`.

> Berkas di atas belum dihapus — hanya dicatat sebagai kandidat. Hapus hanya
> setelah dikonfirmasi, karena bisa jadi masih dipakai untuk keperluan desain.

---

## 📄 License

Aset internal Sasana Gym. Library pihak ketiga di `vendors/` dan
`themes/*/assets/vendors/` tunduk pada lisensi masing-masing.

---

**Maintained by:** Sasana Gym Development Team
