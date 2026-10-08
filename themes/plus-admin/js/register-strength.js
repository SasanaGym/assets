/**
 * register-strength.js — meter kekuatan password halaman register plus-admin.
 * -----------------------------------------------------------------------------
 * Pengganti themes/modern/js/password-meter.js, yang di halaman ini tidak
 * menghasilkan apa pun karena dua hal:
 *
 *   1. container-nya "#pwd-container", elemen yang tidak ada di view register
 *      mana pun. pwstrength mencari viewport progress DI DALAM container, jadi
 *      pencariannya selalu kosong dan bar-nya tidak pernah ditambahkan —
 *      tanpa error, jadi gejalanya cuma "meternya tidak muncul".
 *   2. selektornya ":password" sehingga ikut mengenai field konfirmasi
 *      password; dua instance menulis ke satu viewport yang sama.
 *
 * Di sini container & viewport cocok dengan markup register/form.php dan hanya
 * #password yang dipasangi meter.
 *
 * Kelas warna bar (bg-success / bg-warning / bg-danger) ditambahkan pustaka
 * sendiri dan sudah ada di Bootstrap 5.3 milik style.css — opsi bootstrap3
 * TIDAK boleh dinyalakan, karena itu akan memakai nama kelas Bootstrap 3
 * (progress-bar-success, dst.) yang tidak ada lagi.
 */
jQuery(function ($) {
	'use strict';

	var $password = $('#password');

	if (!$password.length || typeof $password.pwstrength !== 'function') {
		return;
	}

	$password.pwstrength({
		ui: {
			container: '#pa-pwd-container',
			viewports: {
				progress: '.pa-pwd-progress'
			},
			showVerdictsInsideProgressBar: true,
			showPopover: false,

			/* Bawaannya 1%, yang menyisakan sepotong bar merah sebelum pengguna
			   mengetik apa pun — terbaca sebagai "password Anda sangat lemah"
			   padahal fieldnya masih kosong. 0 membuat track-nya kosong sampai
			   ada yang diketik. */
			progressBarEmptyPercentage: 0
		},
		common: {
			minChar: 8
		},
		i18n: {
			t: function (key) {
				var dict = {
					'wordLength': 'Terlalu pendek',
					'wordNotEmail': 'Jangan pakai alamat email',
					'wordSimilarToUsername': 'Jangan pakai username Anda',
					'wordTwoCharacterClasses': 'Campur huruf dan angka',
					'wordRepetitions': 'Terlalu banyak karakter berulang',
					'wordSequences': 'Ada urutan karakter yang mudah diduga',
					'errorList': '',
					'veryWeak': 'Sangat lemah',
					'weak': 'Lemah',
					'normal': 'Cukup',
					'medium': 'Kuat',
					'strong': 'Sangat kuat',
					'veryStrong': 'Sangat kuat'
				};

				return dict[key] !== undefined ? dict[key] : key;
			}
		}
	});
});
