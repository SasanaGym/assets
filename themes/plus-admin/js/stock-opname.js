/**
 * stock-opname.js — halaman Bangkok Muaythai › Stock Opname.
 *
 * Dipecah dari pola merchandise.js / sale.js: bootstrap DataTables (bagian
 * "BLOK BERSAMA") + handler untuk:
 *   - Finalize opname (AJAX, tombol dirender di list & form)
 *   - Simpan stok fisik per item (AJAX, input di tabel form edit)
 *
 * Bergantung pada (semua dimuat partials/scripts.php lebih dulu):
 *   jQuery, DataTables + dataTables.bootstrap5, Swal (sweetalert2),
 *   base_url, csrfName
 *
 * Hook dari view/controller:
 *   #table-result           — tabel target (stock-opname-result.php)
 *   #dataTables-column      — definisi kolom (JSON)
 *   #dataTables-setting     — opsi tambahan DataTables (JSON)
 *   #dataTables-url         — endpoint sasana/stock-opname/getDataDT
 *   .btn-finalize-opname    — dirender di getDataDT() & stock-opname-form.php,
 *                              punya data-id & data-finalize-title
 *   .input-physical-stock   — input stok fisik per item (stock-opname-form.php)
 *   .input-note             — input catatan per item (stock-opname-form.php)
 */
(function () {
	'use strict';

	/* ==================================================================
	 * BLOK BERSAMA — DataTables server-side. JAGA IDENTIK antar modul:
	 * disalin ke customer.js, merchandise.js, package.js, purchase.js,
	 * sale.js, reminder.js, dan stock-opname.js.
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
	 * Finalize opname (AJAX)
	 * Bekerja baik di halaman daftar maupun form edit — tombol
	 * .btn-finalize-opname dirender di kedua tempat.
	 * ------------------------------------------------------------------ */
	function bindFinalize() {
		$(document).on('click', '.btn-finalize-opname', function () {
			var id = $(this).data('id');
			var title = $(this).data('finalize-title') || 'Finalize stock opname ini?';
			var url = baseUrl() + 'sasana/stock-opname/finalize';

			if (typeof Swal === 'undefined') {
				return;
			}

			Swal.fire({
				title: 'Konfirmasi',
				html: title,
				icon: 'question',
				showCancelButton: true,
				confirmButtonText: 'Ya, finalize',
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
							// Bila di halaman daftar → reload tabel.
							// Bila di halaman form edit → arahkan ke daftar.
							if ($('#table-result').length) {
								reloadTable();
							} else {
								window.location.href = baseUrl() + 'sasana/stock-opname';
							}
						}
					},
					error: function () {
						notify('error', 'Terjadi kesalahan saat menfinalisasi opname');
					}
				});
			});
		});
	}

	/* ------------------------------------------------------------------
	 * Simpan stok fisik per item (AJAX, debounce 500ms)
	 * Dipicu saat petugas mengetik di kolom "Stok Fisik" atau "Catatan"
	 * pada tabel form edit. Input dikirim satu per satu ke saveItem().
	 * ------------------------------------------------------------------ */
	var saveTimers = {};

	function bindItemInput() {
		// Stok fisik — simpan saat berhenti mengetik (debounce).
		$(document).on('input', '.input-physical-stock', function () {
			var input = this;
			var itemId = $(this).data('item-id');

			clearTimeout(saveTimers['stock_' + itemId]);
			saveTimers['stock_' + itemId] = setTimeout(function () {
				savePhysicalStock(input, itemId);
			}, 500);
		});

		// Catatan — simpan saat berhenti mengetik (debounce).
		$(document).on('input', '.input-note', function () {
			var input = this;
			var itemId = $(this).data('item-id');

			clearTimeout(saveTimers['note_' + itemId]);
			saveTimers['note_' + itemId] = setTimeout(function () {
				saveItemNote(input, itemId);
			}, 700);
		});
	}

	function savePhysicalStock(input, itemId) {
		var physical = $(input).val();
		var note = $('.input-note[data-item-id="' + itemId + '"]').val() || '';
		var url = baseUrl() + 'sasana/stock-opname/saveItem';
		var row = $(input).closest('tr');

		var data = {
			item_id: itemId,
			physical_stock: physical,
			note: note
		};
		data[csrfName] = csrfToken();

		$.ajax({
			type: 'POST',
			url: url,
			dataType: 'json',
			data: data,
			success: function (res) {
				if (res.status === 'ok') {
					// Update badge selisih secara langsung.
					var diff = res.difference;
					var badge = '';
					if (diff !== null && diff !== undefined) {
						if (diff > 0) {
							badge = '<span class="badge bg-success">+' + diff + '</span>';
						} else if (diff < 0) {
							badge = '<span class="badge bg-danger">' + diff + '</span>';
						} else {
							badge = '<span class="badge bg-secondary">0</span>';
						}
					}
					row.find('.cell-difference').html(badge);

					// Flash hijau singkat sebagai indikator tersimpan.
					$(input).addClass('is-valid');
					setTimeout(function () {
						$(input).removeClass('is-valid');
					}, 1000);
				} else {
					notify('error', res.message || 'Gagal menyimpan stok fisik');
				}
			},
			error: function () {
				notify('error', 'Terjadi kesalahan saat menyimpan');
			}
		});
	}

	function saveItemNote(input, itemId) {
		var physical = $('.input-physical-stock[data-item-id="' + itemId + '"]').val();
		var note = $(input).val();
		var url = baseUrl() + 'sasana/stock-opname/saveItem';

		var data = {
			item_id: itemId,
			physical_stock: physical,
			note: note
		};
		data[csrfName] = csrfToken();

		$.ajax({
			type: 'POST',
			url: url,
			dataType: 'json',
			data: data,
			success: function () {
				$(input).addClass('is-valid');
				setTimeout(function () {
					$(input).removeClass('is-valid');
				}, 1000);
			},
			error: function () {
				// Catatan gagal simpan tidak mengganggu alur hitung.
			}
		});
	}

	$(document).ready(function () {
		initDataTable();
		bindFinalize();
		bindItemInput();
	});
})();
