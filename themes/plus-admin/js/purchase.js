/**
 * purchase.js — halaman Bangkok Muaythai › Pembelian Paket & Aktivasi.
 *
 * Dipecah dari themes/modern/js/sasana.js, mencakup bagian:
 *   1   bootstrap DataTables            (purchase-result.php)
 *   1b  panel pencarian #dt-filter      (purchase-result.php)
 *   4   aktivasi membership             (purchase-result.php & activation-result.php)
 *   6   ringkasan paket di form         (purchase-form.php)
 *   10  typeahead customer              (purchase-form.php)
 *
 * TIDAK disalin dari sasana.js (kode mati, lihat laporan pemecahan):
 *   - select2 pada #customer_id: <select> itu sudah dikomentari di
 *     purchase-form.php, diganti typeahead #customer_name.
 *   - initMerchandiseTypeahead untuk #merchandise_name: tidak ada view yang
 *     punya id itu; kasir penjualan memakai #sale_merchandise_name (sale.js).
 *
 * Bergantung pada (semuanya dimuat partials/scripts.php lebih dulu):
 *   jQuery, DataTables + dataTables.bootstrap5, typeahead.bundle,
 *   Swal (sweetalert2), base_url, csrfName, rawbt.js (SasanaRawBt)
 *
 * Hook dari view/controller:
 *   #table-result       — tabel target          #dt-filter / -reset / -body
 *   #dataTables-url     — sasana/purchase/getDataDT
 *   .btn-activate       — Purchase::getDataDT() & activation-result.php,
 *                         punya data-id, data-customer, data-package
 *   .btn-cetak-bukti    — Purchase::getDataDT(), punya data-id
 *   #package_id         — select paket; #price_paid & #package-summary ikut terisi
 *   #customer_name      — input typeahead; id masuk ke #customer_id_hidden
 *   sasanaPackageData, sasanaCustomerSearchUrl, sasanaActivateUrl
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

	/* ==================================================================
	 * BLOK BERSAMA — panel pencarian #dt-filter. JAGA IDENTIK dengan
	 * sale.js; hanya purchase-result.php & sale-result.php punya panel ini.
	 * ================================================================== */
	function bindFilterPanel() {
		// Cari: muat ulang dari halaman pertama — hasil filter selalu dimulai
		// dari awal, bukan dari halaman yang sedang dibuka.
		$('#dt-filter').on('submit', function (e) {
			e.preventDefault();
			if (dataTable) dataTable.ajax.reload();
		});

		$('#dt-filter-reset').on('click', function () {
			var form = $('#dt-filter');
			// Hidden input dipakai sebagian halaman untuk nilai tetap — jangan ikut dikosongkan.
			form
				.find('input')
				.not('[type=hidden], [type=submit], [type=button]')
				.val('');
			form.find('select').val('');
			form.find('input:checkbox, input:radio').prop('checked', false);
			if (dataTable) dataTable.ajax.reload();
		});

		// Ikon chevron mengikuti status buka/tutup panel.
		$('#dt-filter-body')
			.on('show.bs.collapse', function () {
				$(this)
					.parent()
					.find('.card-header i')
					.removeClass('fa-chevron-down')
					.addClass('fa-chevron-up');
			})
			.on('hide.bs.collapse', function () {
				$(this)
					.parent()
					.find('.card-header i')
					.removeClass('fa-chevron-up')
					.addClass('fa-chevron-down');
			});
	}
	/* ============== AKHIR BLOK BERSAMA — panel #dt-filter ============== */

	function baseUrl() {
		var url = typeof base_url !== 'undefined' ? base_url : '/';
		return url.endsWith('/') ? url : url + '/';
	}

	function money(value) {
		return 'Rp ' + Number(value || 0).toLocaleString('id-ID');
	}

	/* ------------------------------------------------------------------
	 * Cetak bukti pembelian paket
	 * ------------------------------------------------------------------ */
	function bindPrintBukti() {
		$('body').on('click', '.btn-cetak-bukti', function () {
			var id = $(this).data('id');
			if (!id) {
				notify('warning', 'Data pembelian tidak ditemukan.');
				return;
			}

			SasanaRawBt.print(
				baseUrl() + 'sasana/purchase/buktiRawbt',
				{ id: id },
				'PrintBukti',
				notify
			);
		});
	}

	/* ------------------------------------------------------------------
	 * Aktivasi membership
	 * ------------------------------------------------------------------ */
	function bindActivate() {
		// Didelegasikan ke body: tombol muncul di tabel DataTables
		// (purchase-result) maupun di daftar statis (activation-result).
		$('body').on('click', '.btn-activate', function () {
			var id = $(this).data('id');
			var customer = $(this).data('customer') || '';
			var pkg = $(this).data('package') || '';
			var url =
				typeof sasanaActivateUrl !== 'undefined'
					? sasanaActivateUrl
					: baseUrl() + 'sasana/purchase/activate';

			if (typeof Swal === 'undefined') {
				return;
			}

			var today = new Date().toISOString().slice(0, 10);

			Swal.fire({
				title: 'Aktivasi Membership',
				icon: 'question',
				html:
					'<div class="text-start p-3 mb-3 bg-light rounded border">' +
					'<div class="fw-bold fs-6 text-primary mb-1">' + customer + '</div>' +
					'<div class="text-muted small">' + pkg + '</div>' +
					'</div>' +
					'<div class="text-start mb-2">' +
					'<label for="swal_start_date" class="form-label fw-semibold mb-1">Tanggal Mulai Membership</label>' +
					'<input type="date" id="swal_start_date" class="form-control" value="' + today + '">' +
					'<small class="text-muted">Masa berlaku paket dihitung mulai tanggal ini.</small>' +
					'</div>',
				showCancelButton: true,
				confirmButtonText: '<i class="fas fa-play me-1"></i> Aktifkan',
				cancelButtonText: '<i class="fas fa-times me-1"></i> Batal',
				buttonsStyling: false,
				customClass: {
					confirmButton: 'btn btn-primary px-3 me-2',
					cancelButton: 'btn btn-secondary px-3',
					popup: 'rounded-3 shadow'
				},
				preConfirm: function () {
					var dateVal = $('#swal_start_date').val();
					if (!dateVal) {
						Swal.showValidationMessage('Tanggal mulai wajib diisi');
						return false;
					}
					return dateVal;
				}
			}).then(function (result) {
				if (!result.isConfirmed) {
					return;
				}

				var data = { purchase_id: id, start_date: result.value };
				data[csrfName] = csrfToken();

				$.ajax({
					type: 'POST',
					url: url,
					dataType: 'json',
					data: data,
					success: function (res) {
						notify(res.status === 'ok' ? 'success' : 'error', res.message);
						if (res.status !== 'ok') {
							return;
						}
						// activation-result.php tidak punya DataTables — muat ulang halaman.
						if (dataTable) {
							reloadTable();
						} else {
							setTimeout(function () {
								window.location.reload();
							}, 1200);
						}
					},
					error: function () {
						notify('error', 'Terjadi kesalahan saat mengaktivasi membership');
					}
				});
			});
		});
	}

	/* ------------------------------------------------------------------
	 * Form pembelian — ringkasan paket
	 * ------------------------------------------------------------------ */
	function bindPackageSummary() {
		if (!$('#package_id').length || typeof sasanaPackageData === 'undefined') {
			return;
		}

		$('#package_id').on('change', function () {
			var data = sasanaPackageData[$(this).val()];

			if (!data) {
				$('#package-summary').text('Pilih paket untuk melihat ringkasan.');
				return;
			}

			$('#price_paid').val(data.price);

			var quotaText =
				data.type === 'quota' ? data.quota + 'x kunjungan' : 'Unlimited';

			$('#package-summary').html(
				'<strong>' + quotaText + '</strong> — masa berlaku <strong>' +
				data.duration + ' hari</strong>' +
				' — harga <strong>' + money(data.price) + '</strong>'
			);
		});
	}

	/* ------------------------------------------------------------------
	 * Typeahead customer
	 * ------------------------------------------------------------------ */
	function initCustomerTypeahead(opt) {
		var $input = $(opt.input);

		if (!$input.length || !opt.url) {
			return;
		}

		$input
			.typeahead(
				{
					hint: true,
					highlight: true,
					minLength: 1
				},
				{
					name: opt.name || 'customers',
					display: function (item) {
						return item.name + (item.phone ? ' (' + item.phone + ')' : '');
					},
					limit: 15,
					async: true,
					templates: {
						empty: '<div class="tt-empty">Data Customer Tidak Ditemukan!</div>',
						suggestion: function (item) {
							var phone = item.phone
								? ' <small class="text-muted">(' + item.phone + ')</small>'
								: '';
							var membership = item.membership
								? ' <span class="badge bg-success ms-1">' +
									item.membership.package_name +
									'</span>'
								: '';
							return (
								'<div><strong>' + item.name + '</strong>' + phone + membership + '</div>'
							);
						}
					},
					source: function (query, processSync, processAsync) {
						var callback =
							typeof processAsync === 'function' ? processAsync : processSync;
						var data = { max_rows: 15, q: query };
						data[csrfName] = csrfToken();

						return $.ajax({
							url: opt.url,
							dataType: 'json',
							type: 'POST',
							data: data,
							success: function (res) {
								callback(res || []);
							},
							error: function () {
								callback([]);
							}
						});
					}
				}
			)
			.on(
				'typeahead:select typeahead:selected typeahead:autocomplete',
				function (e, datum) {
					$(opt.hidden).val(datum.id);
				}
			)
			.on('typeahead:asyncrequest', function (e) {
				$(e.target).addClass('sLoading');
			})
			.on('typeahead:asynccancel typeahead:asyncreceive', function (e) {
				$(e.target).removeClass('sLoading');
			});

		// Ketika user mengosongkan input, reset juga hidden field id-nya.
		$input.on('input change', function () {
			if ($(this).val() === '') {
				$(opt.hidden).val('');
			}
		});
	}

	$(document).ready(function () {
		initDataTable();
		bindFilterPanel();
		bindPrintBukti();
		bindActivate();
		bindPackageSummary();

		// Form pembelian (Purchase::add) — customer wajib.
		initCustomerTypeahead({
			input: '#customer_name',
			hidden: '#customer_id_hidden',
			url:
				typeof sasanaCustomerSearchUrl !== 'undefined' && sasanaCustomerSearchUrl
					? sasanaCustomerSearchUrl
					: baseUrl() + 'sasana/customer/typeahead'
		});
	});
})();
