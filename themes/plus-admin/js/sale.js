/**
 * sale.js — halaman Bangkok Muaythai › Penjualan Barang (kasir).
 *
 * Dipecah dari themes/modern/js/sasana.js, mencakup bagian:
 *   1   bootstrap DataTables         (sale-result.php)
 *   1b  panel pencarian #dt-filter   (sale-result.php)
 *   8   kasir / keranjang penjualan  (sale-form.php)
 *   9   batalkan penjualan (void)    (sale-result.php)
 *   10  typeahead customer           (sale-form.php, pembeli opsional)
 *       cetak struk: SasanaRawBt (rawbt.js) + cetakNotaRawbt
 *
 * Typeahead merchandise di kasir TIDAK memakai initMerchandiseTypeahead
 * generik seperti di sasana.js, melainkan versi khusus kasir di bawah
 * (suggestion-nya menampilkan stok & harga, dan item langsung masuk
 * keranjang alih-alih mengisi hidden input).
 *
 * Bergantung pada (semuanya dimuat partials/scripts.php lebih dulu):
 *   jQuery, DataTables + dataTables.bootstrap5, typeahead.bundle,
 *   Swal (sweetalert2), base_url, csrfName, rawbt.js (SasanaRawBt)
 *
 * Hook dari view/controller:
 *   #table-result        — tabel target      #dt-filter / -reset / -body
 *   #dataTables-url      — sasana/sale/getDataDT
 *   .btn-void-sale       — Sale::getDataDT(), punya data-id & data-void-title
 *   .btn-cetak-rawbt — Sale::getDataDT() & sale-detail.php, data-invoice
 *   #sale-form, #sale-cart, #sale-total, #sale-change, #paid_amount,
 *   #sale-items-hidden, #sale_merchandise_name, #sale_customer_name,
 *   #sale_customer_id
 *   sasanaSaleSearchUrl, sasanaSaleCustomerSearchUrl, sasanaSaleItems
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
	 * purchase.js; hanya purchase-result.php & sale-result.php punya panel ini.
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
	 * Kasir — keranjang penjualan merchandise
	 * ------------------------------------------------------------------ */
	function initCashier() {
		if (!$('#sale-form').length || typeof sasanaSaleSearchUrl === 'undefined') {
			return;
		}

		var saleCart = [];
		var saleLastTotal = null;

		function saleTotal() {
			return saleCart.reduce(function (sum, line) {
				return sum + Number(line.price) * Number(line.qty);
			}, 0);
		}

		/** Tuliskan isi keranjang ke hidden input agar ikut ter-POST. */
		function saleSync() {
			var html = '';

			saleCart.forEach(function (line, index) {
				html +=
					'<input type="hidden" name="items[' + index + '][merchandise_id]" value="' +
					line.id + '">' +
					'<input type="hidden" name="items[' + index + '][qty]" value="' +
					line.qty + '">';
			});

			$('#sale-items-hidden').html(html);
		}

		/** Isi nominal dibayar otomatis selama kasir belum mengubahnya manual. */
		function saleSyncPaid() {
			var total = saleTotal();
			var current = $('#paid_amount').val();

			if (current === '' || Number(current) === saleLastTotal) {
				$('#paid_amount').val(total);
			}

			saleLastTotal = total;
		}

		function saleChange() {
			var change = Number($('#paid_amount').val() || 0) - saleTotal();

			$('#sale-change')
				.text(money(change))
				.toggleClass('text-danger', change < 0);
		}

		function saleRender() {
			var rows = '';

			saleCart.forEach(function (line, index) {
				var warning =
					Number(line.qty) > Number(line.stock)
						? ' <span class="badge bg-danger">stok hanya ' + line.stock + '</span>'
						: '';

				rows +=
					'<tr>' +
					'<td>' + line.name +
					'<br><small class="text-muted">' + line.code + '</small>' + warning +
					'</td>' +
					'<td>' + money(line.price) + '</td>' +
					'<td><input type="number" class="form-control form-control-sm sale-qty-input" min="1" step="1" ' +
					'value="' + line.qty + '" data-index="' + index + '" style="width:90px"></td>' +
					'<td>' + money(Number(line.price) * Number(line.qty)) + '</td>' +
					'<td><button type="button" class="btn btn-danger btn-xs sale-remove" data-index="' +
					index + '">' +
					'<i class="fas fa-times"></i></button></td>' +
					'</tr>';
			});

			if (!saleCart.length) {
				rows =
					'<tr><td colspan="5" class="text-center text-muted">Keranjang masih kosong.</td></tr>';
			}

			$('#sale-cart tbody').html(rows);
			$('#sale-total').text(money(saleTotal()));

			saleSync();
			saleSyncPaid();
			saleChange();
		}

		function saleAdd(item) {
			if (!item || !item.id) {
				return;
			}

			var existing = null;
			for (var i = 0; i < saleCart.length; i++) {
				if (String(saleCart[i].id) === String(item.id)) {
					existing = saleCart[i];
					break;
				}
			}

			if (existing) {
				existing.qty = Number(existing.qty) + 1;
			} else {
				saleCart.push({
					id: item.id,
					code: item.code,
					name: item.name,
					unit: item.unit,
					price: Number(item.price),
					stock: Number(item.stock),
					qty: 1
				});
			}

			saleRender();
		}

		// Keranjang dikirim balik server saat validasi gagal — jangan hilang.
		if (
			typeof sasanaSaleItems !== 'undefined' &&
			sasanaSaleItems &&
			sasanaSaleItems.length
		) {
			saleCart = sasanaSaleItems.map(function (line) {
				return {
					id: line.id,
					code: line.code,
					name: line.name,
					unit: line.unit,
					price: Number(line.price),
					stock: Number(line.stock),
					qty: Number(line.qty)
				};
			});
		}

		saleRender();

		// Typeahead merchandise khusus kasir: item terpilih langsung masuk
		// keranjang dan inputnya dikosongkan supaya siap untuk scan berikutnya.
		$('#sale_merchandise_name')
			.typeahead(
				{
					hint: true,
					highlight: true,
					minLength: 1
				},
				{
					name: 'sale-merchandise',
					display: function (item) {
						return item.name + (item.code ? ' (' + item.code + ')' : '');
					},
					limit: 15,
					async: true,
					templates: {
						empty: '<div class="tt-empty">Data Barang Tidak Ditemukan!</div>',
						suggestion: function (item) {
							var code = item.code
								? ' <small class="text-muted">(' + item.code + ')</small>'
								: '';
							var stock =
								' <span class="badge bg-secondary ms-1">stok ' +
								(item.stock || 0) +
								(item.unit ? ' ' + item.unit : '') +
								'</span>';
							var price = item.price
								? ' — <span class="text-success">' + money(item.price) + '</span>'
								: '';
							return (
								'<div><strong>' + item.name + '</strong>' + code + price + stock + '</div>'
							);
						}
					},
					source: function (query, processSync, processAsync) {
						var callback =
							typeof processAsync === 'function' ? processAsync : processSync;
						var data = { max_rows: 15, q: query };
						data[csrfName] = csrfToken();

						return $.ajax({
							url: sasanaSaleSearchUrl,
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
					saleAdd(datum);
					$(this).typeahead('val', '');
				}
			)
			.on('typeahead:asyncrequest', function (e) {
				$(e.target).addClass('sLoading');
			})
			.on('typeahead:asynccancel typeahead:asyncreceive', function (e) {
				$(e.target).removeClass('sLoading');
			});

		$('#sale-cart').on('change', '.sale-qty-input', function () {
			var index = $(this).data('index');
			var qty = parseInt($(this).val(), 10);

			if (isNaN(qty) || qty < 1) {
				qty = 1;
			}

			saleCart[index].qty = qty;
			saleRender();
		});

		$('#sale-cart').on('click', '.sale-remove', function () {
			saleCart.splice($(this).data('index'), 1);
			saleRender();
		});

		$('#paid_amount').on('input', saleChange);

		$('#sale-form').on('submit', function (e) {
			if (!saleCart.length) {
				e.preventDefault();
				notify('error', 'Keranjang masih kosong.');
				return false;
			}

			if (Number($('#paid_amount').val() || 0) < saleTotal()) {
				e.preventDefault();
				notify('error', 'Nominal dibayar kurang dari total ' + money(saleTotal()) + '.');
				return false;
			}

			saleSync();
		});
	}

	/* ------------------------------------------------------------------
	 * Batalkan penjualan (void)
	 * ------------------------------------------------------------------ */
	function bindVoid() {
		// Tombol dirender ulang DataTables setiap draw, jadi harus didelegasikan.
		$('#table-result').on('click', '.btn-void-sale', function () {
			var id = $(this).data('id');
			var title = $(this).data('void-title') || 'Batalkan penjualan ini?';
			var url = baseUrl() + 'sasana/sale/void';

			if (typeof Swal === 'undefined') {
				return;
			}

			Swal.fire({
				title: 'Konfirmasi Pembatalan',
				html: title,
				input: 'text',
				inputLabel: 'Alasan pembatalan (opsional)',
				icon: 'warning',
				showCancelButton: true,
				confirmButtonText: '<i class="fas fa-undo me-1"></i> Ya, batalkan',
				cancelButtonText: '<i class="fas fa-times me-1"></i> Batal',
				buttonsStyling: false,
				customClass: {
					confirmButton: 'btn btn-danger px-3 me-2',
					cancelButton: 'btn btn-secondary px-3',
					input: 'form-control',
					inputLabel: 'fw-semibold mb-1 text-start d-block',
					popup: 'rounded-3 shadow'
				}
			}).then(function (result) {
				if (!result.isConfirmed) {
					return;
				}

				var data = { id: id, reason: result.value };
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
						notify('error', 'Terjadi kesalahan saat membatalkan penjualan');
					}
				});
			});
		});
	}

	/* ------------------------------------------------------------------
	 * Typeahead customer (pembeli opsional, kosong berarti walk-in)
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

	/* ------------------------------------------------------------------
	 * Cetak struk — RawBT (Android) + pratinjau HTML 58mm (desktop)
	 * ------------------------------------------------------------------ */

	/**
	 * Cetak nota penjualan.
	 *   Android → ESC/POS dari server dikirim ke aplikasi RawBT.
	 *   Desktop → pratinjau struk 58mm; halaman itu memanggil window.print().
	 *
	 * Transport-nya ada di rawbt.js (SasanaRawBt) — dipakai bersama modul
	 * purchase, jadi deteksi perangkat & format intent tidak bisa berbeda.
	 */
	function cetakNotaRawbt(noInvoice) {
		if (!noInvoice) {
			notify('warning', 'Nomor invoice tidak ditemukan.');
			return;
		}

		SasanaRawBt.print(
			baseUrl() + 'sasana/sale/notaRawbt',
			{ no_invoice: noInvoice },
			'PrintStruk',
			notify
		);
	}

	// Dipanggil juga dari atribut onclick= di view, jadi harus ada di window.
	window.cetakNotaRawbt = cetakNotaRawbt;

	/* TODO: KIRIM NOTA VIA FONNTE */
	/*
	function kirimNotaWa(noInvoice) {
		var requestData = { no_invoice: noInvoice };
		requestData[$('.csrf_token').attr('name')] = $('.csrf_token').val();

		Swal.fire({
			title: 'Mengirim nota...',
			allowOutsideClick: false,
			didOpen: function () {
				Swal.showLoading();
			}
		});

		$.ajax({
			type: 'POST',
			url: window.location.origin + '/kasir/kirimNotaWa',
			data: requestData,
			dataType: 'json',
			success: function (response) {
				Swal.fire(
					response.status ? 'Terkirim!' : 'Gagal!',
					response.message,
					response.status ? 'success' : 'error'
				);
			},
			error: function () {
				Swal.fire(
					'Error!',
					'Terjadi kesalahan saat mengirim nota ke WhatsApp.',
					'error'
				);
			}
		});
	}*/

	$(document).ready(function () {
		initDataTable();
		bindFilterPanel();
		initCashier();
		bindVoid();

		// Kasir penjualan (Sale::add) — pembeli opsional, kosong berarti walk-in.
		initCustomerTypeahead({
			input: '#sale_customer_name',
			hidden: '#sale_customer_id',
			name: 'sale-customers',
			url:
				typeof sasanaSaleCustomerSearchUrl !== 'undefined'
					? sasanaSaleCustomerSearchUrl
					: ''
		});

		$(document).on('click', '.btn-cetak-rawbt', function (e) {
			e.preventDefault();
			var inv = $(this).data('invoice');
			if (inv) {
				cetakNotaRawbt(inv);
			}
		});
	});
})();
