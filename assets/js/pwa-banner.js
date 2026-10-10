/**
 * pwa-banner.js — pendaftaran service worker + ajakan pasang aplikasi.
 *
 * Satu berkas untuk dua pekerjaan yang dulu terpisah dan tidak konsisten:
 * pendaftaran service worker sebelumnya ditulis ulang sebagai <script> inline
 * di EMPAT berkas view (plus-admin/footer.php, plus-admin/auth/layout.php,
 * modern/footer.php, modern/register/layout.php) dengan isi yang sedikit
 * berbeda-beda. Sekarang semuanya memanggil berkas ini.
 *
 * Dua jalur pemasangan
 * --------------------
 * Android/Chrome/Edge  : event `beforeinstallprompt` ditahan, lalu dipanggil
 *                        lagi saat pengguna menekan tombol Install.
 * iOS/iPadOS Safari    : TIDAK ADA event semacam itu dan tidak akan pernah ada.
 *                        Satu-satunya cara memasang adalah Bagikan → "Add to
 *                        Home Screen", jadi di iOS banner ini berubah menjadi
 *                        petunjuk langkah, bukan tombol. Versi sebelumnya hanya
 *                        menunggu beforeinstallprompt, sehingga pengguna iPhone
 *                        tidak pernah melihat ajakan apa pun.
 *
 * Kontrak DOM (lihat assets/css/pwa-banner.css dan partials PWA di view):
 *   #pwaInstallBanner    wadah; kelas .show menampilkannya
 *   #pwaInstallBtn       tombol Install (disembunyikan di iOS)
 *   #pwaIosHint          petunjuk iOS (disembunyikan di selain iOS)
 *   #pwaDismissBtn       tombol tutup
 *   #pwaUpdateBanner     pemberitahuan versi baru (opsional)
 *   #pwaUpdateBtn        tombol muat ulang untuk memakai versi baru
 */
(function () {
  "use strict";

  var DISMISS_KEY = "pwa_prompt_dismissed_until";

  /* Lama penundaan setelah banner ditutup. sessionStorage dulu dipakai di sini,
     artinya banner muncul lagi di setiap tab baru — mengganggu untuk aplikasi
     yang dibuka berjam-jam. Tujuh hari sudah cukup sopan. */
  var DISMISS_DAYS = 7;

  var deferredPrompt = null;

  /* ---------------------------------------------------------------- utilitas */

  function byId(id) {
    return document.getElementById(id);
  }

  /** Aplikasi sedang berjalan sebagai aplikasi terpasang, bukan di dalam tab. */
  function isStandalone() {
    return (
      (window.matchMedia &&
        (window.matchMedia("(display-mode: standalone)").matches ||
          window.matchMedia("(display-mode: fullscreen)").matches ||
          window.matchMedia("(display-mode: minimal-ui)").matches)) ||
      // Properti non-standar khusus Safari iOS; tidak ada padanannya di
      // matchMedia pada versi iOS lama.
      window.navigator.standalone === true
    );
  }

  /**
   * Deteksi iOS/iPadOS.
   *
   * iPadOS 13+ melaporkan userAgent Macintosh, jadi platform saja tidak cukup:
   * iPad baru hanya terbedakan dari Mac lewat adanya layar sentuh.
   */
  function isIos() {
    var ua = window.navigator.userAgent;

    if (/iPad|iPhone|iPod/.test(ua)) {
      return true;
    }

    return (
      window.navigator.platform === "MacIntel" &&
      window.navigator.maxTouchPoints > 1
    );
  }

  /** Di iOS, hanya Safari yang bisa memasang ke home screen. */
  function isIosSafari() {
    var ua = window.navigator.userAgent;

    return (
      isIos() &&
      // CriOS = Chrome, FxiOS = Firefox, EdgiOS = Edge, OPiOS/OPT = Opera.
      // Semuanya memakai mesin WebKit yang sama tapi tidak punya menu
      // "Add to Home Screen".
      !/CriOS|FxiOS|EdgiOS|OPiOS|OPT\//.test(ua)
    );
  }

  function isDismissed() {
    try {
      var until = window.localStorage.getItem(DISMISS_KEY);

      return until !== null && Date.now() < parseInt(until, 10);
    } catch (err) {
      // localStorage melempar di mode privat Safari lama dan ketika cookie
      // pihak ketiga diblokir. Anggap saja belum pernah ditutup.
      return false;
    }
  }

  function markDismissed() {
    try {
      window.localStorage.setItem(
        DISMISS_KEY,
        String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000),
      );
    } catch (err) {
      /* tidak apa-apa; banner hanya akan muncul lagi nanti */
    }
  }

  /* --------------------------------------------------------- banner install */

  function showBanner() {
    var banner = byId("pwaInstallBanner");

    if (!banner || isStandalone() || isDismissed()) {
      return;
    }

    banner.classList.add("show");
  }

  function hideBanner() {
    var banner = byId("pwaInstallBanner");

    if (banner) {
      banner.classList.remove("show");
    }
  }

  /* beforeinstallprompt bisa menyala SEBELUM DOMContentLoaded. Pendengarnya
     karena itu dipasang di sini, di luar handler DOMContentLoaded, dan event-nya
     disimpan untuk dipakai belakangan. */
  window.addEventListener("beforeinstallprompt", function (event) {
    // Menahan mini-infobar bawaan Chrome supaya tidak muncul mendadak di atas
    // konten; sebagai gantinya kita tampilkan banner sendiri.
    event.preventDefault();
    deferredPrompt = event;
    showBanner();
  });

  window.addEventListener("appinstalled", function () {
    deferredPrompt = null;
    hideBanner();
    markDismissed();
  });

  document.addEventListener("DOMContentLoaded", function () {
    var banner = byId("pwaInstallBanner");
    var installBtn = byId("pwaInstallBtn");
    var iosHint = byId("pwaIosHint");
    var dismissBtn = byId("pwaDismissBtn");

    if (banner) {
      if (isIosSafari()) {
        // Di iOS tombol Install tidak punya API untuk dipanggil. Ganti dengan
        // petunjuk; menyisakan tombol mati hanya membuat pengguna menekannya
        // berulang kali tanpa hasil.
        if (installBtn) {
          installBtn.hidden = true;
        }

        if (iosHint) {
          iosHint.hidden = false;
        }

        showBanner();
      } else {
        if (iosHint) {
          iosHint.hidden = true;
        }

        // Selain iOS, banner baru muncul kalau beforeinstallprompt sudah
        // menyala — menampilkannya lebih awal berarti tombol Install yang
        // belum punya prompt untuk dibuka.
        if (deferredPrompt) {
          showBanner();
        }
      }
    }

    if (installBtn) {
      installBtn.addEventListener("click", function () {
        if (!deferredPrompt) {
          return;
        }

        hideBanner();

        var prompt = deferredPrompt;
        // Dikosongkan lebih dulu: satu event beforeinstallprompt hanya boleh
        // dipanggil sekali, pemanggilan kedua melempar InvalidStateError.
        deferredPrompt = null;

        prompt.prompt();
        prompt.userChoice.then(function (choice) {
          if (choice.outcome === "dismissed") {
            markDismissed();
          }
        });
      });
    }

    if (dismissBtn) {
      dismissBtn.addEventListener("click", function () {
        hideBanner();
        markDismissed();
      });
    }

    registerServiceWorker();
  });

  /* ------------------------------------------------- pendaftaran & pembaruan */

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    // Service worker hanya berjalan di konteks aman. localhost dianggap aman
    // walau memakai http, jadi pengembangan lokal tetap bisa mengujinya.
    var secure =
      window.isSecureContext ||
      location.protocol === "https:" ||
      location.hostname === "localhost" ||
      location.hostname === "127.0.0.1";

    if (!secure) {
      console.warn(
        "[PWA] Service worker dilewati: butuh HTTPS. PWA tidak akan bisa dipasang.",
      );

      return;
    }

    // URL diturunkan dari <link rel="manifest">, bukan ditulis tetap sebagai
    // "/sw.js". Pada pemasangan di subfolder, "/sw.js" menunjuk ke luar
    // aplikasi dan pendaftarannya gagal — atau lebih buruk, mendaftar dengan
    // scope yang salah.
    var manifestLink = document.querySelector('link[rel="manifest"]');
    var base = manifestLink
      ? manifestLink.href.replace(/[^/]*$/, "")
      : location.origin + "/";

    navigator.serviceWorker
      .register(base + "sw.js", { scope: base })
      .then(function (registration) {
        watchForUpdate(registration);
      })
      .catch(function (error) {
        console.warn("[PWA] Service worker gagal didaftarkan:", error);
      });

    // Service worker baru baru benar-benar mengambil alih setelah skipWaiting().
    // Saat itu terjadi, halaman dimuat ulang sekali supaya HTML dan aset yang
    // tampil berasal dari versi yang sama.
    var reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (reloading) {
        return;
      }

      reloading = true;
      window.location.reload();
    });
  }

  function watchForUpdate(registration) {
    // Sudah ada versi baru yang menunggu dari kunjungan sebelumnya.
    if (registration.waiting && navigator.serviceWorker.controller) {
      offerUpdate(registration.waiting);
    }

    registration.addEventListener("updatefound", function () {
      var incoming = registration.installing;

      if (!incoming) {
        return;
      }

      incoming.addEventListener("statechange", function () {
        // controller yang kosong berarti ini instalasi pertama, bukan
        // pembaruan — tidak ada yang perlu ditawarkan ke pengguna.
        if (incoming.state === "installed" && navigator.serviceWorker.controller) {
          offerUpdate(incoming);
        }
      });
    });
  }

  function offerUpdate(worker) {
    var banner = byId("pwaUpdateBanner");
    var button = byId("pwaUpdateBtn");

    if (!banner || !button) {
      // Tanpa elemen pemberitahuan, versi baru dibiarkan menunggu sampai
      // seluruh tab aplikasi ditutup. Itu perilaku bawaan browser dan aman —
      // yang tidak boleh dilakukan adalah menukarnya diam-diam di tengah sesi.
      return;
    }

    banner.classList.add("show");

    button.addEventListener(
      "click",
      function () {
        banner.classList.remove("show");
        worker.postMessage({ type: "SKIP_WAITING" });
      },
      { once: true },
    );
  }
})();
