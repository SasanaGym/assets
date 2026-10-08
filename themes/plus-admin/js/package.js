/**
 * package.js — halaman Sasana Gym › Paket Membership.
 *
 * Dipecah dari themes/modern/js/sasana.js: bootstrap DataTables (bagian "1")
 * dan bagian "3. Aktif/nonaktifkan paket (soft delete)".
 *
 * package-form.php tidak punya hook JS — #row-quota di sana murni markup,
 * tidak ada kode yang menampil/menyembunyikannya. Panel pencarian #dt-filter
 * juga tidak dipakai package-result.php, jadi tidak disalin ke sini.
 *
 * Bergantung pada (semuanya dimuat partials/scripts.php lebih dulu):
 *   jQuery, DataTables + dataTables.bootstrap5, Swal (sweetalert2),
 *   base_url, csrfName
 *
 * Hook dari view/controller:
 *   #table-result        — tabel target (package-result.php)
 *   #dataTables-column   — definisi kolom (JSON)
 *   #dataTables-setting  — opsi tambahan DataTables (JSON)
 *   #dataTables-url      — endpoint sasana/package/getDataDT
 *   .btn-toggle-package  — dirender Package::getDataDT(), punya data-id &
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
	 * Aktif/nonaktifkan paket (soft delete)
	 * ------------------------------------------------------------------ */
	function bindToggle() {
		// Tombol dirender ulang DataTables setiap draw, jadi harus didelegasikan.
		$('#table-result').on('click', '.btn-toggle-package', function () {
			var id = $(this).data('id');
			var title = $(this).data('toggle-title') || 'Ubah status paket ini?';
			var url = baseUrl() + 'sasana/package/toggleActive';

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
							reloadTable();
						}
					},
					error: function () {
						notify('error', 'Terjadi kesalahan saat mengubah status paket');
					}
				});
			});
		});
	}

	$(document).ready(function () {
		initDataTable();
		bindToggle();
	});
})();
