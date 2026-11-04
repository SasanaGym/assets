/**
 * register.js — halaman Bangkok Muaythai › Register (CRUD Cloudflare D1).
 *
 * Bergantung pada (semuanya dimuat partials/scripts.php lebih dulu):
 *   jQuery, DataTables + dataTables.bootstrap5, Swal (sweetalert2),
 *   base_url, csrfName
 *
 * Hook dari view/controller:
 *   #table-result         — tabel target (register-result.php)
 *   #dataTables-column    — definisi kolom (JSON)
 *   #dataTables-setting   — opsi tambahan DataTables (JSON)
 *   #dataTables-url       — endpoint sasana/register/getDataDT
 *   .btn-delete-register  — dirender Register::formatActions(), punya data-id &
 *                           data-delete-title
 *   .btn-confirm-register — dirender Register::formatActions(), punya data-id &
 *                           data-confirm-title; POST sasana/register/confirm
 */
(function () {
	'use strict';

	/* ==================================================================
	 * BLOK BERSAMA — DataTables server-side. JAGA IDENTIK antar modul:
	 * disalin dari trainer.js dkk. Mengubah di satu berkas berarti
	 * mengubah di semuanya.
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
	 * Hapus register (hard delete)
	 * ------------------------------------------------------------------ */
	function bindDelete() {
		// Tombol dirender ulang DataTables setiap draw, jadi harus didelegasikan.
		$('#table-result').on('click', '.btn-delete-register', function () {
			var id = $(this).data('id');
			var title = $(this).data('delete-title') || 'Hapus data register ini?';
			var url = baseUrl() + 'sasana/register/delete';

			if (typeof Swal === 'undefined') {
				return;
			}

			Swal.fire({
				title: 'Konfirmasi',
				html: title,
				icon: 'warning',
				showCancelButton: true,
				confirmButtonText: 'Ya, hapus',
				cancelButtonText: 'Batal',
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
						notify('error', 'Terjadi kesalahan saat menghapus register');
					}
				});
			});
		});
	}

	/* ------------------------------------------------------------------
	 * Konfirmasi register → tandai di D1 + salin ke tabel customers
	 * ------------------------------------------------------------------ */
	function bindConfirm() {
		$('#table-result').on('click', '.btn-confirm-register', function () {
			var $btn = $(this);
			var id = $btn.data('id');
			var title = $btn.data('confirm-title') || 'Konfirmasi data register ini?';
			var url = baseUrl() + 'sasana/register/confirm';

			if (typeof Swal === 'undefined') {
				return;
			}

			Swal.fire({
				title: 'Konfirmasi',
				html: title,
				icon: 'question',
				showCancelButton: true,
				confirmButtonText: 'Ya, konfirmasi',
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
				$btn.prop('disabled', true);

				$.ajax({
					type: 'POST',
					url: url,
					dataType: 'json',
					data: data,
					success: function (res) {
						notify(res.status === 'ok' ? 'success' : 'error', res.message);
						reloadTable();
					},
					error: function () {
						notify('error', 'Terjadi kesalahan saat mengonfirmasi register');
						$btn.prop('disabled', false);
					}
				});
			});
		});
	}

	$(document).ready(function () {
		initDataTable();
		bindDelete();
		bindConfirm();
	});
})();
