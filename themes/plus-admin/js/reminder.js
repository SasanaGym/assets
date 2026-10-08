/**
 * reminder.js — halaman Sasana Gym › Reminder Membership.
 *
 * Berasal dari branch feat/reminder-membership, yang menambahkan bagian "3c"
 * ke themes/modern/js/sasana.js. Karena sasana.js sudah dipecah per modul di
 * main, blok itu dipindahkan ke berkas ini (placeholder kosongnya sudah
 * disiapkan commit refactor) dan disesuaikan dengan pola modul lain — lihat
 * package.js/customer.js: IIFE, BLOK BERSAMA DataTables, baseUrl().
 *
 * Modul ini TIDAK punya panel pencarian #dt-filter: filter hari/status
 * dikirim lewat query string dari <form method="get"> di reminder-result.php
 * (lihat Reminder::getDataDT()), jadi bagian "1b" tidak disalin ke sini.
 *
 * Bergantung pada (semuanya dimuat partials/scripts.php lebih dulu):
 *   jQuery, DataTables + dataTables.bootstrap5, Swal (sweetalert2),
 *   base_url, csrfName
 *
 * Hook dari view/controller:
 *   #table-result        — tabel target (reminder-result.php)
 *   #dataTables-column   — definisi kolom (JSON)
 *   #dataTables-setting  — opsi tambahan DataTables (JSON)
 *   #dataTables-url      — endpoint sasana/reminder/getDataDT (+ ?days=&status=)
 *   .btn-toggle-reminded — dirender Reminder::presentRows(), punya data-id &
 *                          data-toggle-title
 */
(function () {
	'use strict';

	/* ==================================================================
	 * BLOK BERSAMA — DataTables server-side. JAGA IDENTIK antar modul:
	 * disalin ke customer.js, merchandise.js, package.js, purchase.js,
	 * sale.js, dan reminder.js. Mengubah di satu berkas berarti mengubah di semuanya.
	 * ================================================================== */
	var csrfName =
		typeof window.csrfName !== 'undefined' ? window.csrfName : 'csrf_test_name';

	var dataTable = null;

	function csrfToken() {
		return $('meta[name="' + csrfName + '"]').attr('content') || '';
	}

	function notify(icon, title) {
		if (typeof Swal !== 'undefined') {
			Swal.fire({ icon: icon, title: title, showCloseButton: true });
		} else {
			alert(title);
		}
	}

	// Isi <span id="..."> yang dipakai view untuk mengirim JSON ke JS.
	function jsonFrom(selector) {
		var raw = $(selector).html();
		if (typeof raw !== 'string' || !raw.length) {
			return null;
		}
		return JSON.parse(raw);
	}

	function reloadTable() {
		if (dataTable) {
			dataTable.draw(false);
		}
	}

	/* ------------------------------------------------------------------
	 * DataTables server-side
	 * ------------------------------------------------------------------ */
	function initDataTable() {
		if (!$('#table-result').length) {
			return;
		}

		var settings = {
			processing: true,
			serverSide: true,
			scrollX: true,
			ajax: {
				url: $('#dataTables-url').text(),
				type: 'POST',
				data: function (d) {
					d[csrfName] = csrfToken();
					// Panel "Pencarian" (opsional per halaman): seluruh input di dalam
					// #dt-filter ikut pada tiap request sehingga filter tetap terpasang
					// saat ganti halaman atau urutan kolom.
					$('#dt-filter')
						.find('input, select')
						.each(function () {
							var name = $(this).attr('name');
							if (!name || name === csrfName) return;
							if (
								($(this).is(':checkbox') || $(this).is(':radio')) &&
								!$(this).is(':checked')
							) {
								return;
							}
							d[name] = $(this).val();
						});
				}
			},
			columns: jsonFrom('#dataTables-column') || []
		};

		var extra = jsonFrom('#dataTables-setting');
		if (extra) {
			for (var key in extra) {
				settings[key] = extra[key];
			}
		}

		dataTable = $('#table-result').DataTable(settings);
	}
	/* ============ AKHIR BLOK BERSAMA — DataTables server-side ============ */

	function baseUrl() {
		var url = typeof base_url !== 'undefined' ? base_url : '/';
		return url.endsWith('/') ? url : url + '/';
	}

	/* ------------------------------------------------------------------
	 * Tandai / batalkan "sudah dihubungi"
	 *
	 * Berbeda dari toggle lain, di sini tabel TIDAK cukup di-redraw: kartu
	 * ringkasan "Belum Dihubungi" di atas tabel ikut berubah. Muat ulang
	 * halaman sekalian supaya angka kartu tidak basi (query string ikut
	 * terbawa, jadi filter hari/status tetap seperti semula).
	 * ------------------------------------------------------------------ */
	function bindToggleReminded() {
		// Tombol dirender ulang DataTables setiap draw, jadi harus didelegasikan.
		$('#table-result').on('click', '.btn-toggle-reminded', function () {
			var id = $(this).data('id');
			var title = $(this).data('toggle-title') || 'Ubah tanda tindak lanjut?';
			var url = baseUrl() + 'sasana/reminder/markReminded';

			if (typeof Swal === 'undefined') {
				return;
			}

			Swal.fire({
				title: 'Konfirmasi',
				html: title,
				icon: 'question',
				showCancelButton: true,
				confirmButtonText: 'Ya, lanjutkan',
				cancelButtonText: 'Batal',
				buttonsStyling: false,
				customClass: {
					confirmButton: 'btn btn-primary px-3 me-2',
					cancelButton: 'btn btn-secondary px-3',
					popup: 'rounded-3 shadow'
				}
			}).then(function (result) {
				if (!result.isConfirmed) {
					return;
				}

				var data = { id: id };
				data[csrfName] = csrfToken();

				$.ajax({
					type: 'POST',
					url: url,
					dataType: 'json',
					data: data,
					success: function (res) {
						notify(res.status === 'ok' ? 'success' : 'error', res.message);
						if (res.status === 'ok') {
							setTimeout(function () {
								window.location.reload();
							}, 900);
						}
					},
					error: function () {
						notify('error', 'Terjadi kesalahan saat mengubah tanda tindak lanjut');
					}
				});
			});
		});
	}

	$(document).ready(function () {
		initDataTable();
		bindToggleReminded();
	});
})();
