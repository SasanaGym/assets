/**
 * cashier-closing.js — cetak struk Laporan Tutup Kasir (thermal 58mm).
 *
 * Hanya satu tombol: `Cetak Thermal` di halaman sasana/cashier-closing.
 * Transport-nya milik rawbt.js (SasanaRawBt): Android → intent RawBT,
 * desktop → pratinjau 58mm yang memanggil window.print().
 *
 * Endpoint server: sasana/cashier-closing/thermalRawbt
 *   - tanpa `view=html` → JSON {status, data} berisi ESC/POS base64
 *   - dengan `view=html` → pratinjau struk
 *
 * Bergantung pada: rawbt.js (dimuat lebih dulu oleh controller), Swal (opsional).
 */
(function () {
	'use strict';

	function notify(icon, title) {
		if (typeof Swal !== 'undefined') {
			Swal.fire({ icon: icon, title: title, showCloseButton: true });
		} else {
			alert(title);
		}
	}

	/**
	 * @param {string} tanggal  Y-m-d
	 * @param {number} kasir    0 = semua kasir
	 */
	function cetakTutupKasir(tanggal, kasir) {
		if (typeof SasanaRawBt === 'undefined') {
			notify('error', 'Modul cetak thermal belum termuat. Muat ulang halaman.');
			return;
		}

		// Nama parameter disamakan dengan filter halaman (`f_cashier`),
		// supaya struk yang dicetak selalu memakai kasir yang sedang dilihat.
		SasanaRawBt.print(
			SasanaRawBt.baseUrl() + 'sasana/cashier-closing/thermalRawbt',
			{ tanggal: tanggal, f_cashier: kasir || 0 },
			'PrintTutupKasir',
			notify
		);
	}

	// Dipanggil dari atribut onclick= di view, jadi harus ada di window.
	window.cetakTutupKasir = cetakTutupKasir;
})();
