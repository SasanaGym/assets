/**
 * whatsapp.js — halaman Bangkok Muaythai › WhatsApp Gateway.
 *
 * Isi:
 *   1. BLOK BERSAMA DataTables server-side (sama persis dengan modul lain)
 *   2. typeahead customer → mengisi #wa-customer-id dan #wa-phone
 *   3. pilih template → mengisi #wa-message
 *   4. kirim pesan (AJAX, konfirmasi Swal)
 *   5. cek koneksi & tampilkan QR
 *   6. aktif/nonaktifkan template (halaman Template Pesan)
 *
 * Bergantung pada (semuanya dimuat partials/scripts.php lebih dulu):
 *   jQuery, DataTables + dataTables.bootstrap5, typeahead.bundle,
 *   Swal (sweetalert2), base_url, csrfName
 *
 * Hook dari view/controller:
 *   #table-result        — tabel riwayat (whatsapp-result.php)
 *   #dataTables-column   — definisi kolom (JSON)
 *   #dataTables-setting  — opsi tambahan DataTables (JSON)
 *   #dataTables-url      — endpoint sasana/whatsapp/getDataDT
 *   #wa-form             — form kirim; #wa-customer, #wa-customer-id,
 *                          #wa-phone, #wa-template, #wa-message
 *   #btn-wa-check / #wa-status — status sesi
 *   #btn-wa-qr / #wa-qr        — QR gateway
 *   .btn-toggle-template — dirender whatsapp-templates.php
 *   waEndpoints          — {send, check, qr, customerSearch}
 */
(function () {
	'use strict';

	/* ==================================================================
	 * BLOK BERSAMA — DataTables server-side. JAGA IDENTIK antar modul:
	 * disalin ke customer.js, merchandise.js, package.js, purchase.js,
	 * sale.js, reminder.js, dan whatsapp.js. Mengubah di satu berkas berarti
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

	function endpoints() {
		return typeof waEndpoints !== 'undefined' ? waEndpoints : {};
	}

	/** Escape teks dari server sebelum ditempel ke HTML. */
	function esc(value) {
		return $('<div>').text(value === null || value === undefined ? '' : value).html();
	}

	/* ------------------------------------------------------------------
	 * Typeahead customer
	 *
	 * Sumber pencarian sama dengan modul lain: Customer::typeahead(). Nomor
	 * customer langsung mengisi #wa-phone supaya kasir tidak mengetik ulang.
	 * ------------------------------------------------------------------ */
	function initCustomerTypeahead() {
		var $input = $('#wa-customer');
		var url = endpoints().customerSearch;

		if (!$input.length || !url) {
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
					name: 'customers',
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
									esc(item.membership.package_name) +
									'</span>'
								: '';
							return (
								'<div><strong>' + esc(item.name) + '</strong>' + phone + membership + '</div>'
							);
						}
					},
					source: function (query, processSync, processAsync) {
						var callback =
							typeof processAsync === 'function' ? processAsync : processSync;
						var data = { max_rows: 15, q: query };
						data[csrfName] = csrfToken();

						return $.ajax({
							url: url,
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
					$('#wa-customer-id').val(datum.id);

					// Nomor customer menang atas isi manual sebelumnya: itulah
					// nomor yang benar untuk customer yang baru dipilih.
					$('#wa-phone').val(datum.phone || '');
				}
			)
			.on('typeahead:asyncrequest', function (e) {
				$(e.target).addClass('sLoading');
			})
			.on('typeahead:asynccancel typeahead:asyncreceive', function (e) {
				$(e.target).removeClass('sLoading');
			});

		// Mengosongkan input membatalkan pilihan customer — kalau tidak, id
		// lama tetap terkirim dan pesan bisa masuk ke orang yang salah.
		$input.on('input change', function () {
			if ($(this).val() === '') {
				$('#wa-customer-id').val('');
			}
		});
	}

	/* ------------------------------------------------------------------
	 * Template → textarea
	 * ------------------------------------------------------------------ */
	function bindTemplateSelect() {
		$('#wa-template').on('change', function () {
			var body = $(this).find('option:selected').data('body');

			if (typeof body === 'string' && body.length) {
				$('#wa-message').val(body);
			}
		});
	}

	/* ------------------------------------------------------------------
	 * Kirim pesan
	 * ------------------------------------------------------------------ */
	function bindSend() {
		$('#wa-form').on('submit', function (event) {
			event.preventDefault();

			var form = this;
			var phone = $.trim($('#wa-phone').val());
			var customerId = $('#wa-customer-id').val();
			var message = $.trim($('#wa-message').val());

			if (!phone && !customerId) {
				notify('warning', 'Pilih customer atau isi nomor tujuan');
				return;
			}

			if (!message) {
				notify('warning', 'Isi pesan masih kosong');
				return;
			}

			if (typeof Swal === 'undefined') {
				form.submit();
				return;
			}

			Swal.fire({
				title: 'Kirim pesan WhatsApp?',
				html:
					'Pesan akan dikirim ke <strong>' +
					esc(phone || 'nomor customer terpilih') +
					'</strong> sekarang juga.',
				icon: 'question',
				showCancelButton: true,
				confirmButtonText: 'Ya, kirim',
				cancelButtonText: 'Batal',
				buttonsStyling: false,
				customClass: {
					confirmButton: 'btn btn-success px-3 me-2',
					cancelButton: 'btn btn-secondary px-3',
					popup: 'rounded-3 shadow'
				}
			}).then(function (result) {
				if (!result.isConfirmed) {
					return;
				}

				var $button = $('#btn-wa-send').prop('disabled', true);

				$.ajax({
					type: 'POST',
					url: endpoints().send,
					dataType: 'json',
					data: $(form).serialize(),
					success: function (res) {
						notify(res.status === 'ok' ? 'success' : 'error', res.message);

						if (res.status === 'ok') {
							$('#wa-message').val('');

							// Muat ulang halaman, bukan hanya tabel: kartu
							// "Terkirim/Gagal hari ini" ikut berubah.
							setTimeout(function () {
								window.location.reload();
							}, 900);
						}
					},
					error: function () {
						notify('error', 'Terjadi kesalahan saat mengirim pesan');
					},
					complete: function () {
						$button.prop('disabled', false);
					}
				});
			});
		});
	}

	/* ------------------------------------------------------------------
	 * Status sesi & QR
	 * ------------------------------------------------------------------ */
	function renderStatus(res) {
		var $target = $('#wa-status');

		if (!res || res.status !== 'ok') {
			$target.html(
				'<span class="text-danger">' +
					esc((res && res.message) || 'Gagal memeriksa koneksi') +
					'</span>'
			);
			return;
		}

		var session = res.session || {};
		var statusUpper = String(session.status || '').toUpperCase();
		var isConnected = Boolean(
			session.connected ||
			['READY', 'CONNECTED', 'AUTHENTICATED', 'INCHAT', 'LOGGED_IN'].indexOf(statusUpper) !== -1
		);
		var parts = [
			isConnected
				? '<span class="badge bg-success">Tersambung</span>'
				: '<span class="badge bg-warning text-dark">Belum tersambung</span>',
			'Gateway: <strong>' + esc(session.provider || '-') + '</strong>'
		];

		if (session.status) {
			parts.push('Status: ' + esc(session.status));
		}
		if (session.id) {
			parts.push('Sesi: ' + esc(session.id));
		}
		if (session.phoneNumber) {
			parts.push('Nomor: ' + esc(session.phoneNumber));
		}
		if (session.profileName) {
			parts.push('Profil: ' + esc(session.profileName));
		}

		$target.html(parts.join(' &middot; '));
	}

	function bindCheck() {
		$('#btn-wa-check').on('click', function () {
			var $button = $(this).prop('disabled', true);

			$('#wa-status').html('<span class="text-muted">Memeriksa gateway…</span>');

			$.ajax({
				type: 'GET',
				url: endpoints().check,
				dataType: 'json',
				success: renderStatus,
				error: function () {
					$('#wa-status').html('<span class="text-danger">Gateway tidak merespons.</span>');
				},
				complete: function () {
					$button.prop('disabled', false);
				}
			});
		});
	}

	function bindQr() {
		$('#btn-wa-qr').on('click', function () {
			var $button = $(this).prop('disabled', true);
			var $target = $('#wa-qr');

			$target.html('<span class="text-muted small">Mengambil QR…</span>');

			$.ajax({
				type: 'GET',
				url: endpoints().qr,
				dataType: 'json',
				success: function (res) {
					if (res.status !== 'ok') {
						$target.html('<span class="text-danger small">' + esc(res.message) + '</span>');
						return;
					}

					var statusUpper = String(res.status || '').toUpperCase();
					var isConnected = Boolean(
						res.connected ||
						['READY', 'CONNECTED', 'AUTHENTICATED', 'INCHAT', 'LOGGED_IN'].indexOf(statusUpper) !== -1
					);

					if (isConnected && !res.has_qr) {
						$target.html(
							'<span class="badge bg-success">Sesi sudah tersambung — tidak ada QR.</span>'
						);
						return;
					}

					if (!res.has_qr) {
						$target.html('<span class="text-muted small">Gateway tidak mengirim QR.</span>');
						return;
					}

					$target.html(
						'<div class="border rounded p-2 d-inline-block">' +
							'<img src="' + res.qr + '" width="260" height="260" alt="QR WhatsApp">' +
							'<div class="small text-muted mt-1">Pindai lewat WhatsApp › Perangkat tertaut.</div>' +
							'</div>'
					);
				},
				error: function () {
					$target.html('<span class="text-danger small">Gateway tidak merespons.</span>');
				},
				complete: function () {
					$button.prop('disabled', false);
				}
			});
		});
	}

	/* ------------------------------------------------------------------
	 * Aktif/nonaktifkan template
	 * ------------------------------------------------------------------ */
	function bindToggleTemplate() {
		$('body').on('click', '.btn-toggle-template', function () {
			var id = $(this).data('id');
			var title = $(this).data('toggle-title') || 'Ubah status template ini?';
			var url = baseUrl() + 'sasana/whatsapp/toggleTemplate';

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
							}, 700);
						}
					},
					error: function () {
						notify('error', 'Terjadi kesalahan saat mengubah status template');
					}
				});
			});
		});
	}

	$(document).ready(function () {
		initDataTable();
		initCustomerTypeahead();
		bindTemplateSelect();
		bindSend();
		bindCheck();
		bindQr();
		bindToggleTemplate();
	});
})();
