/**
 * csrf.js — menyuntikkan token CSRF segar ke setiap request AJAX.
 *
 * Dipindahkan apa adanya dari blok <script> inline di header.php tema lama
 * (60 baris) supaya header tetap terbaca sebagai markup, dan supaya berkas ini
 * bisa di-cache browser alih-alih dikirim ulang di setiap halaman.
 *
 * Bergantung pada dua variabel global yang ditulis di partials/head.php:
 *   csrfName — nama field/header token (mis. 'csrf_test_name')
 *   csrfHash — nilai token saat halaman dirender
 */
(function () {
	'use strict';

	function getToken() {
		return $('meta[name="' + csrfName + '"]').attr('content') || csrfHash;
	}

	function syncToken(newToken) {
		if (!newToken) {
			return;
		}
		csrfHash = newToken;
		$('meta[name="' + csrfName + '"]').attr('content', newToken);
		$('input[name="' + csrfName + '"]').val(newToken);
	}

	// Token segar untuk setiap request (header + body).
	$.ajaxPrefilter(function (options) {
		var token = getToken();
		if (!token) {
			return;
		}

		if (!options.headers) {
			options.headers = {};
		}
		options.headers[csrfName] = token;

		var method = (options.type || options.method || 'GET').toUpperCase();
		if (method === 'GET' || method === 'HEAD' || options.method === 'OPTIONS') {
			return;
		}

		if (typeof options.data === 'string') {
			var re = new RegExp('(^|&)' + csrfName + '=[^&]*');
			if (re.test(options.data)) {
				options.data = options.data.replace(re, '$1' + csrfName + '=' + encodeURIComponent(token));
			} else {
				options.data += (options.data.length ? '&' : '') + csrfName + '=' + encodeURIComponent(token);
			}
		} else if (
			options.data &&
			typeof options.data === 'object' &&
			!(window.FormData && options.data instanceof FormData) &&
			!(options.data instanceof Blob) &&
			!(options.data instanceof ArrayBuffer)
		) {
			options.data[csrfName] = token;
		} else if (!options.data) {
			options.data = {};
			options.data[csrfName] = token;
		} else if (window.FormData && options.data instanceof FormData) {
			options.data.set(csrfName, token);
		}
		options.headers['X-CSRF-TOKEN'] = token;
	});

	// Token baru dari setiap respons disinkronkan ke meta, input, dan variabel.
	$.ajaxSetup({
		complete: function (xhr) {
			var fromHeader = xhr.getResponseHeader(csrfName);
			if (fromHeader) {
				syncToken(fromHeader);
				return;
			}

			var response = xhr.responseJSON;
			if (response && response[csrfName]) {
				syncToken(response[csrfName]);
			}
		}
	});
})();
