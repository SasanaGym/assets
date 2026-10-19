/**
 * rawbt.js — transport cetak thermal 58mm untuk modul Sasana.
 *
 * Satu jalur cetak, dua modul:
 *   sasana/sale/notaRawbt     → nota penjualan barang
 *   sasana/purchase/buktiRawbt → bukti pembelian paket
 *
 * Keduanya memakai kontrak yang sama: server mengembalikan perintah ESC/POS
 * dalam base64 (JSON `{status, data}`), atau pratinjau HTML 58mm bila URL
 * diberi `&view=html`.
 *
 *   Android → base64 diserahkan ke aplikasi RawBT lewat intent URI.
 *   Desktop → pratinjau 58mm dibuka di jendela kecil; halaman itulah yang
 *             memanggil window.print().
 *
 * Sebelumnya blok ini disalin di sale.js; sekarang dipakai bersama supaya
 * deteksi perangkat dan format intent tidak bisa berbeda antar modul.
 *
 * Bergantung pada: jQuery, Swal (opsional), base_url.
 */
(function () {
	'use strict';

	/** Deteksi perangkat Android: hanya di situ aplikasi RawBT bisa dipasang. */
	function isAndroidDevice() {
		var ua = navigator.userAgent || '';

		if (/android/i.test(ua)) {
			return true;
		}

		if (navigator.userAgentData && /android/i.test(navigator.userAgentData.platform || '')) {
			return true;
		}

		// Chromium di Android kadang hanya melaporkan "Linux" + layar sentuh.
		var hasTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
		return /\blinux\b/i.test(ua) && !/windows|macintosh|cros/i.test(ua) && hasTouch;
	}

	/**
	 * Transport RawBT Android — sama seperti implementasi resmi di
	 * public/vendors/rawbt/app.js: perintah ESC/POS (base64) dikirim lewat
	 * intent URI yang ditangani aplikasi ru.a402d.rawbtprinter.
	 */
	function RawBtTransport() {
		this.send = function (base64Data) {
			var S = '#Intent;scheme=rawbt;';
			var P = 'package=ru.a402d.rawbtprinter;end;';

			window.location.href = 'intent:base64,' + String(base64Data).trim() + S + P;
		};
		return this;
	}

	function baseUrl() {
		var url = typeof base_url !== 'undefined' ? base_url : '/';
		return url.endsWith('/') ? url : url + '/';
	}

	function notifyFallback(icon, title) {
		if (typeof Swal !== 'undefined') {
			Swal.fire({ icon: icon, title: title, showCloseButton: true });
		} else {
			alert(title);
		}
	}

	/**
	 * Cetak satu dokumen thermal.
	 *
	 * @param {string}   endpoint URL JSON penghasil ESC/POS, mis.
	 *                           baseUrl() + 'sasana/sale/notaRawbt'
	 * @param {object}   params   parameter query (no_invoice, id, …) — dipakai
	 *                           baik oleh endpoint JSON maupun pratinjau HTML
	 * @param {string}   title    nama jendela pratinjau
	 * @param {function} notify   (icon, pesan) — opsional, default Swal/alert
	 */
	function print(endpoint, params, title, notify) {
		var warn = typeof notify === 'function' ? notify : notifyFallback;
		var query = $.param(params || {});
		var previewUrl = endpoint + '?' + query + '&view=html';

		if (!isAndroidDevice()) {
			var printWin = window.open(
				previewUrl,
				title || 'PrintThermal',
				'width=420,height=650,top=80,left=150,scrollbars=yes,resizable=yes'
			);
			if (printWin) {
				printWin.focus();
			}
			return;
		}

		if (typeof Swal !== 'undefined') {
			Swal.fire({
				title: 'Menyiapkan Dokumen...',
				text: 'Menghubungkan ke printer bluetooth...',
				allowOutsideClick: false,
				didOpen: function () {
					Swal.showLoading();
				}
			});
		}

		$.ajax({
			type: 'GET',
			url: endpoint,
			data: params || {},
			dataType: 'json',
			cache: false,
			success: function (response) {
				if (typeof Swal !== 'undefined') {
					Swal.close();
				}

				if (!response.status) {
					warn('error', response.message);
					return;
				}

				new RawBtTransport().send(response.data);
			},
			error: function (xhr) {
				if (typeof Swal !== 'undefined') {
					Swal.close();
				}
				warn('error', 'Terjadi kesalahan saat menyiapkan dokumen untuk printer (' + xhr.status + ').');
			}
		});
	}

	window.SasanaRawBt = {
		isAndroidDevice: isAndroidDevice,
		RawBtTransport: RawBtTransport,
		print: print,
		baseUrl: baseUrl
	};

	// Nama lama dipertahankan: view/halaman lain boleh masih memanggilnya.
	window.RawBtTransport = RawBtTransport;
})();
