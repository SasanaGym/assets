/**
 * checkin.js — halaman Bangkok Muaythai › Check-in Peserta.
 *
 * Dipecah dari themes/modern/js/sasana.js (bagian "5. Halaman check-in")
 * supaya Checkin.php hanya memuat kode yang dipakai halamannya: typeahead
 * pencarian peserta, dukungan scan barcode, kartu status membership, dan
 * POST check-in. Tidak ada DataTables (daftar check-in hari ini dirender
 * server) maupun kasir/pembelian.
 *
 * Bergantung pada (semuanya dimuat partials/scripts.php lebih dulu):
 *   jQuery, typeahead.bundle, Swal (sweetalert2), base_url, csrfName
 *
 * Variabel dari blok <script> di views/sasana/checkin.php:
 *   sasanaCheckinSearchUrl      — sasana/checkin/ajaxSearch
 *   sasanaCheckinProcessUrl     — sasana/checkin/process
 *   sasanaCheckinSingleVisitUrl — sasana/checkin/singleVisit
 *   sasanaSingleVisitPackage    — paket sekali datang (null bila belum ada)
 *   sasanaPaymentMethods        — key => label metode pembayaran
 */
(function () {
	'use strict';

	var csrfName =
		typeof window.csrfName !== 'undefined' ? window.csrfName : 'csrf_test_name';

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

	function baseUrl() {
		return typeof base_url !== 'undefined' ? base_url : '/';
	}

	// Paket sekali datang yang dipakai tombol "Aktifkan visit tunggal".
	// Null berarti belum ada paket berdurasi 1 hari di menu Harga Visit & Paket.
	function singleVisitPackage() {
		return typeof sasanaSingleVisitPackage !== 'undefined' ? sasanaSingleVisitPackage : null;
	}

	function rupiah(value) {
		var num = Number(value);
		if (isNaN(num)) {
			return '-';
		}
		return 'Rp ' + num.toLocaleString('id-ID', { maximumFractionDigits: 0 });
	}

	// Nilai yang ditempel ke atribut HTML (data-*) harus di-escape: nama
	// peserta berasal dari input bebas dan bisa memuat kutip.
	function escapeAttr(value) {
		return String(value === null || typeof value === 'undefined' ? '' : value)
			.replace(/&/g, '&amp;')
			.replace(/"/g, '&quot;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');
	}

	// Teks yang masuk ke input setelah peserta dipilih.
	function displayLabel(item) {
		return item.name + (item.phone ? ' (' + item.phone + ')' : '');
	}

	// Respons ajaxSearch bisa { results: [...] } atau array langsung.
	function itemsOf(data) {
		return data && data.results ? data.results : data || [];
	}

	function suggestionHtml(item) {
		var phone = item.phone
			? ' <small class="text-muted">(' + item.phone + ')</small>'
			: '';
		var barcode = item.barcode
			? ' <span class="badge bg-secondary ms-1">' + item.barcode + '</span>'
			: '';
		var badge = item.has_membership
			? ' <span class="badge bg-success ms-1">' + item.package_name + '</span>'
			: ' <span class="badge bg-warning text-dark ms-1">Tanpa Paket</span>';

		return (
			'<div><strong>' + item.name + '</strong>' + phone + barcode + badge + '</div>'
		);
	}

	function renderCheckinCard(item) {
		var html = '';

		if (!item.has_membership) {
			var pkg = singleVisitPackage();

			var tombolVisit = pkg
				? '<button type="button" class="btn btn-sm btn-dark btn-single-visit" ' +
					'data-customer-id="' + item.id + '" ' +
					'data-customer-name="' + escapeAttr(item.name) + '" ' +
					'data-customer-phone="' + escapeAttr(item.phone || '') + '">' +
					'<i class="fas fa-bolt"></i> Aktifkan ' + pkg.name +
					' (' + rupiah(pkg.price) + ')</button> '
				: '';

			var petunjuk = pkg
				? 'Aktifkan paket sekali datang untuk bisa check-in hari ini, atau buat pembelian paket lain.'
				: 'Paket visit tunggal belum tersedia — tambahkan paket berdurasi 1 hari di menu ' +
					'<strong>Harga Visit &amp; Paket</strong>.';

			html =
				'<div class="alert alert-warning">' +
				'<h5 class="mb-1">' + item.name + '</h5>' +
				'<p class="mb-2">' + item.phone + '</p>' +
				'<strong>Tidak ada membership aktif.</strong> ' + petunjuk +
				'<div class="mt-2">' + tombolVisit +
				'<a class="btn btn-sm btn-primary" href="' +
				baseUrl() + 'sasana/purchase/add' +
				'">Buat Pembelian</a></div>' +
				'</div>';
			$('#checkin-result').html(html);
			return;
		}

		html =
			'<div class="card sasana-checkin-card"><div class="card-body">' +
			'<div class="d-flex justify-content-between align-items-start flex-wrap">' +
			'<div>' +
			'<h4 class="mb-1">' + item.name + '</h4>' +
			'<p class="text-muted mb-2">' + item.phone + '</p>' +
			'</div>' +
			'<div class="text-end">' +
			'<span class="badge bg-success">Membership Aktif</span>' +
			'</div>' +
			'</div>' +
			'<table class="table table-sm mb-3">' +
			'<tr><th style="width:30%">Paket</th><td>' +
			item.package_name +
			' <span class="badge bg-secondary">' + item.package_type + '</span></td></tr>' +
			'<tr><th>Periode</th><td>' + item.start_date + ' s/d ' + item.end_date + '</td></tr>' +
			'<tr><th>Sisa Kuota</th><td><strong>' + item.quota_text + '</strong></td></tr>' +
			'</table>' +
			'<button type="button" class="btn btn-success btn-lg btn-do-checkin" ' +
			'data-customer-id="' + item.id + '" ' +
			'data-activation-id="' + item.activation_id + '">' +
			'<i class="fas fa-check-circle"></i> Check-in Sekarang</button>' +
			'</div></div>';

		$('#checkin-result').html(html);
	}

	$(document).ready(function () {
		var $search = $('#checkin-search');

		if (!$search.length || typeof sasanaCheckinSearchUrl === 'undefined') {
			return;
		}

		$search
			.typeahead(
				{
					hint: true,
					highlight: true,
					minLength: 1
				},
				{
					name: 'checkin-customers',
					display: displayLabel,
					limit: 15,
					async: true,
					templates: {
						empty: '<div class="tt-empty">Peserta Tidak Ditemukan!</div>',
						suggestion: suggestionHtml
					},
					source: function (query, processSync, processAsync) {
						var callback =
							typeof processAsync === 'function' ? processAsync : processSync;

						return $.ajax({
							url: sasanaCheckinSearchUrl,
							dataType: 'json',
							type: 'GET',
							data: { q: query },
							success: function (data) {
								callback(itemsOf(data));
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
				function ($e, datum) {
					renderCheckinCard(datum);
				}
			)
			.on('typeahead:asyncrequest', function (e) {
				$(e.target).addClass('sLoading');
			})
			.on('typeahead:asynccancel typeahead:asyncreceive', function (e) {
				$(e.target).removeClass('sLoading');
			});

		// Dukungan scan barcode dengan keyboard enter: ambil hasil pertama.
		$search.on('keydown', function (e) {
			if (e.which !== 13) {
				return;
			}

			var query = $(this).val().trim();
			if (!query) {
				return;
			}

			$.ajax({
				url: sasanaCheckinSearchUrl,
				dataType: 'json',
				type: 'GET',
				data: { q: query },
				success: function (data) {
					var items = itemsOf(data);
					if (!items.length) {
						return;
					}
					$search.typeahead('close');
					$search.typeahead('val', displayLabel(items[0]));
					renderCheckinCard(items[0]);
				}
			});
		});

		$('#checkin-reset').on('click', function () {
			$search.typeahead('val', '');
			$('#checkin-result').empty();
			$search.focus();
		});

		$search.on('input change', function () {
			if ($(this).val() === '') {
				$('#checkin-result').empty();
			}
		});

		// Tombol dirender renderCheckinCard, jadi klik harus didelegasikan.
		$('body').on('click', '.btn-do-checkin', function () {
			var $btn = $(this);
			var data = {
				customer_id: $btn.data('customer-id'),
				activation_id: $btn.data('activation-id'),
				// Trainer opsional — dipilih pada dropdown di atas daftar hasil.
				trainer_id: $('#checkin-trainer').val() || ''
			};
			data[csrfName] = csrfToken();

			function resetButton() {
				$btn
					.prop('disabled', false)
					.html('<i class="fas fa-check-circle"></i> Check-in Sekarang');
			}

			$btn
				.prop('disabled', true)
				.html('<i class="fas fa-spinner fa-spin"></i> Memproses...');

			$.ajax({
				type: 'POST',
				url: sasanaCheckinProcessUrl,
				dataType: 'json',
				data: data,
				success: function (res) {
					notify(res.status === 'ok' ? 'success' : 'error', res.message);
					if (res.status === 'ok') {
						setTimeout(function () {
							window.location.reload();
						}, 1400);
					} else {
						resetButton();
					}
				},
				error: function () {
					notify('error', 'Terjadi kesalahan saat memproses check-in');
					resetButton();
				}
			});
		});

		/* --------------------------------------------------------------
		 * Visit tunggal — peserta tanpa membership aktif.
		 *
		 * Membuat pembelian + aktivasi + check-in sekaligus. Harga & metode
		 * pembayaran tetap ditanyakan supaya catatan finansialnya utuh
		 * (bukan "gratis" hanya karena tombolnya satu klik).
		 * -------------------------------------------------------------- */
		$('body').on('click', '.btn-single-visit', function () {
			var pkg = singleVisitPackage();

			if (!pkg) {
				notify('error', 'Paket visit tunggal belum tersedia');
				return;
			}

			if (typeof Swal === 'undefined') {
				return;
			}

			var $btn = $(this);
			var customerId = $btn.data('customer-id');
			var customerName = $btn.attr('data-customer-name') || '';
			var customerPhone = $btn.attr('data-customer-phone') || '';
			var url =
				typeof sasanaCheckinSingleVisitUrl !== 'undefined'
					? sasanaCheckinSingleVisitUrl
					: baseUrl() + 'sasana/checkin/singleVisit';

			var options = '';
			var methods =
				typeof sasanaPaymentMethods !== 'undefined' ? sasanaPaymentMethods : {};

			$.each(methods, function (key, label) {
				options +=
					'<option value="' + key + '"' + (key === 'cash' ? ' selected' : '') + '>' + label + '</option>';
			});

			Swal.fire({
				title: 'Aktifkan ' + pkg.name,
				icon: 'question',
				html:
					'<div class="text-start p-3 mb-3 bg-light rounded border">' +
					'<div class="fw-bold fs-6 text-primary mb-1">' + customerName + '</div>' +
					'<div class="text-muted small">' + customerPhone + '</div>' +
					'</div>' +
					'<div class="text-start mb-2">' +
					'<label for="swal_sv_method" class="form-label fw-semibold mb-1">Metode Pembayaran</label>' +
					'<select id="swal_sv_method" class="form-select">' + options + '</select>' +
					'</div>' +
					'<div class="text-start mb-2">' +
					'<label for="swal_sv_price" class="form-label fw-semibold mb-1">Harga Dibayar</label>' +
					'<input type="number" min="0" step="1000" id="swal_sv_price" class="form-control" ' +
					'value="' + Number(pkg.price) + '">' +
					'<small class="text-muted">Pembelian, aktivasi, dan check-in dicatat sekaligus.</small>' +
					'</div>',
				showCancelButton: true,
				confirmButtonText: '<i class="fas fa-bolt me-1"></i> Aktifkan & Check-in',
				cancelButtonText: '<i class="fas fa-times me-1"></i> Batal',
				buttonsStyling: false,
				customClass: {
					confirmButton: 'btn btn-dark px-3 me-2',
					cancelButton: 'btn btn-secondary px-3',
					popup: 'rounded-3 shadow'
				},
				preConfirm: function () {
					var price = $('#swal_sv_price').val();

					if (price === '' || isNaN(price) || Number(price) < 0) {
						Swal.showValidationMessage('Harga tidak valid');
						return false;
					}

					return {
						payment_method: $('#swal_sv_method').val(),
						price_paid: price
					};
				}
			}).then(function (result) {
				if (!result.isConfirmed) {
					return;
				}

				var data = {
					customer_id: customerId,
					payment_method: result.value.payment_method,
					price_paid: result.value.price_paid,
					trainer_id: $('#checkin-trainer').val() || ''
				};
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
							}, 1400);
						}
					},
					error: function () {
						notify('error', 'Terjadi kesalahan saat mengaktifkan visit tunggal');
					}
				});
			});
		});
	});
})();
