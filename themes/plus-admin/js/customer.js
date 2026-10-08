/**
 * customer.js — halaman Sasana Gym › Customer Gym.
 *
 * Dipecah dari themes/modern/js/sasana.js: bootstrap DataTables (bagian "1")
 * dan aksi hapus (bagian "2. Hapus customer"). View customer-form.php dan
 * customer-detail.php tidak punya hook JS sama sekali, jadi tidak ada kode
 * form/kartu QR di sini.
 *
 * CATATAN PEMECAHAN MODUL
 * Blok "DataTables server-side" di bawah ini generik: dipakai juga oleh
 * merchandise, package, purchase, dan sale. Sesuai keputusan, blok itu
 * DISALIN ke tiap berkas modul alih-alih ditaruh di berkas bersama — jadi
 * perbaikan bug di sana harus diterapkan ke semua <modul>.js yang punya
 * tabel. Biarkan blok itu identik antar berkas supaya mudah di-diff.
 * Panel pencarian "#dt-filter" (bagian "1b" di sasana.js) TIDAK disalin ke
 * sini karena customer-result.php tidak punya panel itu; hanya purchase dan
 * sale yang memakainya.
 *
 * Bergantung pada (semuanya dimuat partials/scripts.php lebih dulu):
 *   jQuery, DataTables + dataTables.bootstrap5, Swal (sweetalert2),
 *   module_url, csrfName
 *
 * Hook dari view/controller:
 *   #table-result        — tabel target (customer-result.php)
 *   #dataTables-column   — definisi kolom (JSON)
 *   #dataTables-setting   — opsi tambahan DataTables (JSON)
 *   #dataTables-url      — endpoint sasana/customer/getDataDT
 *   .btn-delete          — dirender Customer::getDataDT(), punya
 *                          data-id & data-delete-title
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

	/* ------------------------------------------------------------------
	 * Hapus customer
	 * ------------------------------------------------------------------ */
	function bindDelete() {
		// Tombol dirender ulang DataTables setiap draw, jadi harus didelegasikan.
		$('#table-result').on('click', '.btn-delete', function () {
			var id = $(this).data('id');
			var title = $(this).data('delete-title') || 'Hapus data ini?';
			var deleteUrl =
				(typeof module_url !== 'undefined' ? module_url : '') + '/delete';

			if (typeof Swal === 'undefined') {
				return;
			}

			Swal.fire({
				title: 'Konfirmasi Hapus',
				html: title,
				icon: 'warning',
				showCancelButton: true,
				confirmButtonText: '<i class="fas fa-trash me-1"></i> Ya, hapus',
				cancelButtonText: '<i class="fas fa-times me-1"></i> Batal',
				buttonsStyling: false,
				customClass: {
					confirmButton: 'btn btn-danger px-3 me-2',
					cancelButton: 'btn btn-secondary px-3',
					popup: 'rounded-3 shadow'
				}
			}).then(function (result) {
				if (!result.isConfirmed) {
					return;
				}

				var data = { id: id, delete: 1 };
				data[csrfName] = csrfToken();

				$.ajax({
					type: 'POST',
					url: deleteUrl,
					dataType: 'json',
					data: data,
					success: function (res) {
						notify(res.status === 'ok' ? 'success' : 'error', res.message);
						if (res.status === 'ok') {
							reloadTable();
						}
					},
					error: function () {
						notify('error', 'Terjadi kesalahan saat menghapus data');
					}
				});
			});
		});
	}

	$(document).ready(function () {
		initDataTable();
		bindDelete();
	});
})();
