/**
 * dashboard.js — grafik halaman Sasana Gym › Dashboard.
 *
 * Dipecah dari themes/modern/js/sasana.js (bagian "7. Grafik") supaya
 * Dashboard.php hanya memuat kode yang benar-benar dipakai halamannya:
 * dua grafik Chart.js, tanpa DataTables, kasir, check-in, atau typeahead.
 * Grafik khusus laporan (chart-visits-day & chart-visits-type) tetap
 * tinggal di sasana.js karena hanya Report.php yang memuatnya.
 *
 * Bergantung pada:
 *   Chart          — vendors/chartjs/chart.js (dimuat Dashboard::__construct)
 *   sasanaDashboard — ditulis blok <script> di views/sasana/dashboard.php,
 *                     berisi { visitsByHour: [...], revenueByMonth: [...] }
 */
(function () {
	'use strict';

	function isDarkTheme() {
		return $('html').attr('data-bs-theme') === 'dark';
	}

	function chartTextColor() {
		return isDarkTheme() ? '#e6e6e6' : '#333333';
	}

	function chartGridColor() {
		return isDarkTheme() ? '#3d3d3d' : '#e9e9e9';
	}

	function palette() {
		return typeof window.SASANA_PALETTE !== 'undefined'
			? window.SASANA_PALETTE
			: ['#4b5320', '#373d53', '#8e96a3', '#1a1a1a', '#6b7530', '#4f587a'];
	}

	function paletteColor(index) {
		var p = palette();
		return p[index % p.length];
	}

	function money(value) {
		return 'Rp ' + Number(value || 0).toLocaleString('id-ID');
	}

	// Label jam 00:00 .. 23:00 untuk sumbu X grafik jam ramai.
	function hourLabels() {
		var labels = [];
		for (var h = 0; h < 24; h++) {
			labels.push((h < 10 ? '0' : '') + h + ':00');
		}
		return labels;
	}

	$(document).ready(function () {
		if (typeof Chart === 'undefined' || typeof sasanaDashboard === 'undefined') {
			return;
		}

		var textColor = chartTextColor();
		var gridColor = chartGridColor();

		// Tren pendapatan 6 bulan terakhir.
		if ($('#chart-revenue').length) {
			var revenueSource = sasanaDashboard.revenueByMonth || [];

			new Chart(document.getElementById('chart-revenue'), {
				type: 'bar',
				data: {
					labels: revenueSource.map(function (r) {
						return r.periode;
					}),
					datasets: [
						{
							label: 'Pendapatan',
							data: revenueSource.map(function (r) {
								return r.total;
							}),
							backgroundColor: paletteColor(0)
						}
					]
				},
				options: {
					responsive: true,
					plugins: {
						legend: { display: false },
						tooltip: {
							callbacks: {
								label: function (ctx) {
									return money(ctx.parsed.y);
								}
							}
						}
					},
					scales: {
						x: { ticks: { color: textColor }, grid: { color: gridColor } },
						y: {
							beginAtZero: true,
							ticks: {
								color: textColor,
								callback: function (v) {
									return money(v);
								}
							},
							grid: { color: gridColor }
						}
					}
				}
			});
		}

		// Jam ramai 30 hari terakhir.
		if ($('#chart-visits-hour').length) {
			new Chart(document.getElementById('chart-visits-hour'), {
				type: 'bar',
				data: {
					labels: hourLabels(),
					datasets: [
						{
							label: 'Kunjungan',
							data: sasanaDashboard.visitsByHour || [],
							backgroundColor: paletteColor(1)
						}
					]
				},
				options: {
					responsive: true,
					plugins: { legend: { display: false } },
					scales: {
						x: {
							ticks: { color: textColor, autoSkip: true, maxRotation: 0 },
							grid: { color: gridColor }
						},
						y: {
							beginAtZero: true,
							ticks: { color: textColor, precision: 0 },
							grid: { color: gridColor }
						}
					}
				}
			});
		}
	});
})();
