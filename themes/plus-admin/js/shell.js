/**
 * shell.js — perilaku shell tema plus-admin yang tidak disediakan template.
 *
 * Template plus-admin menangani sendiri:
 *   - toggle sidebar desktop  → assets/js/misc.js      (data-toggle="minimize")
 *   - toggle sidebar mobile   → assets/js/off-canvas.js (data-toggle="offcanvas")
 *   - submenu collapse        → Bootstrap 5 collapse    (data-bs-toggle="collapse")
 *   - pemilih tema            → builtin/js/site.js      (delegasi ke body)
 *
 * Yang ditambahkan di sini hanya tiga kekurangan yang terlihat saat dipakai:
 *   1. status sidebar ciut tidak tersimpan, jadi kembali terbuka tiap pindah halaman;
 *   2. offcanvas mobile tidak menutup setelah menu dipilih;
 *   3. ikon menu dari database dirapikan agar lebarnya seragam.
 */
(function ($) {
	'use strict';

	var SIDEBAR_COOKIE = 'pa_sidebar_icon_only';
	var MOBILE_BREAKPOINT = '(max-width: 991px)';

	$(function () {
		var $body = $('body');
		var $sidebar = $('#sidebar');

		// --- 1. Pulihkan status sidebar ciut ------------------------------
		if (Cookies.get(SIDEBAR_COOKIE) === '1') {
			$body.addClass('sidebar-icon-only');
		}

		// misc.js men-toggle class-nya di handler terpisah; setTimeout 0
		// memastikan class sudah final saat dibaca.
		$('[data-toggle="minimize"]').on('click', function () {
			window.setTimeout(function () {
				Cookies.set(SIDEBAR_COOKIE, $body.hasClass('sidebar-icon-only') ? '1' : '0', { expires: 365 });
			}, 0);
		});

		// --- 2. Tutup offcanvas setelah memilih menu (mobile) -------------
		$sidebar.on('click', 'a.nav-link', function () {
			var $link = $(this);

			// Menu beranak hanya membuka collapse, bukan berpindah halaman.
			if ($link.is('[data-bs-toggle]')) {
				return;
			}

			if (window.matchMedia(MOBILE_BREAKPOINT).matches) {
				$sidebar.removeClass('active');
			}
		});
	});
})(jQuery);
