/**
 *	Modul Bangkok Muaythai — sasana.js
 *	Tersisa: utilitas umum, bootstrap DataTables, dan render grafik
 *	(Chart.js) untuk halaman laporan.
 *
 *	Yang masih memuat berkas ini: Report.php.
 *	Seluruh modul lain sudah punya berkasnya sendiri di
 *	themes/plus-admin/js/ — lihat daftar pemetaan di bawah.
 */

$(document).ready(function () {
  /* ------------------------------------------------------------------
   * Utilitas umum
   * ------------------------------------------------------------------ */
  var csrfName =
    typeof window.csrfName !== "undefined" ? window.csrfName : "csrf_test_name";

  function csrfToken() {
    return $('meta[name="' + csrfName + '"]').attr("content") || "";
  }

  function isDarkTheme() {
    return $("html").attr("data-bs-theme") === "dark";
  }

  function chartTextColor() {
    return isDarkTheme() ? "#e6e6e6" : "#333333";
  }

  function chartGridColor() {
    return isDarkTheme() ? "#3d3d3d" : "#e9e9e9";
  }

  function palette() {
    return typeof window.SASANA_PALETTE !== "undefined"
      ? window.SASANA_PALETTE
      : ["#4b5320", "#373d53", "#8e96a3", "#1a1a1a", "#6b7530", "#4f587a"];
  }

  function paletteColor(index) {
    var p = palette();
    return p[index % p.length];
  }

  function money(value) {
    return "Rp " + Number(value || 0).toLocaleString("id-ID");
  }

  function notify(icon, title) {
    if (typeof Swal !== "undefined") {
      Swal.fire({ icon: icon, title: title, showCloseButton: true });
    } else {
      alert(title);
    }
  }

  /* ------------------------------------------------------------------
   * 1. DataTables server-side
   * ------------------------------------------------------------------ */
  var dataTable = null;

  if ($("#table-result").length) {
    var column = [];
    var columnRaw = $("#dataTables-column").html();
    if (typeof columnRaw === "string" && columnRaw.length) {
      column = $.parseJSON(columnRaw);
    }

    var settings = {
      processing: true,
      serverSide: true,
      scrollX: true,
      ajax: {
        url: $("#dataTables-url").text(),
        type: "POST",
        data: function (d) {
          d[csrfName] = csrfToken();
          // Panel "Pencarian" (opsional per halaman): seluruh input di dalam
          // #dt-filter ikut pada tiap request sehingga filter tetap terpasang
          // saat ganti halaman atau urutan kolom.
          $("#dt-filter")
            .find("input, select")
            .each(function () {
              var name = $(this).attr("name");
              if (!name || name === csrfName) return;
              if (
                ($(this).is(":checkbox") || $(this).is(":radio")) &&
                !$(this).is(":checked")
              ) {
                return;
              }
              d[name] = $(this).val();
            });
        },
      },
      columns: column,
    };

    var extra = $("#dataTables-setting");
    if (
      extra.length &&
      typeof extra.html() === "string" &&
      extra.html().length
    ) {
      var parsed = $.parseJSON(extra.html());
      for (var key in parsed) {
        settings[key] = parsed[key];
      }
    }

    dataTable = $("#table-result").DataTable(settings);
  }

  function reloadTable() {
    if (dataTable) {
      dataTable.draw(false);
    }
  }

  /* ------------------------------------------------------------------
   * 1b. Panel pencarian DataTables (#dt-filter)
   * ------------------------------------------------------------------ */
  // Cari: muat ulang dari halaman pertama — hasil filter selalu dimulai
  // dari awal, bukan dari halaman yang sedang dibuka.
  $("#dt-filter").on("submit", function (e) {
    e.preventDefault();
    if (dataTable) dataTable.ajax.reload();
  });

  $("#dt-filter-reset").on("click", function () {
    var form = $("#dt-filter");
    // Hidden input dipakai sebagian halaman untuk nilai tetap — jangan ikut dikosongkan.
    form
      .find("input")
      .not("[type=hidden], [type=submit], [type=button]")
      .val("");
    form.find("select").val("");
    form.find("input:checkbox, input:radio").prop("checked", false);
    if (dataTable) dataTable.ajax.reload();
  });

  // Ikon chevron mengikuti status buka/tutup panel.
  $("#dt-filter-body")
    .on("show.bs.collapse", function () {
      $(this)
        .parent()
        .find(".card-header i")
        .removeClass("fa-chevron-down")
        .addClass("fa-chevron-up");
    })
    .on("hide.bs.collapse", function () {
      $(this)
        .parent()
        .find(".card-header i")
        .removeClass("fa-chevron-up")
        .addClass("fa-chevron-down");
    });

  /* --------------------------------------------------------------------
   * Bagian yang sudah DIPECAH ke themes/plus-admin/js/ — jangan ditambah
   * lagi di sini, edit berkas modulnya:
   *
   *   2.  Hapus customer ................ customer.js
   *   3.  Aktif/nonaktifkan paket ....... package.js
   *   3b. Aktif/nonaktifkan merchandise . merchandise.js
   *   4.  Aktivasi membership ........... purchase.js
   *   5.  Halaman check-in .............. checkin.js
   *   6.  Form pembelian ................ purchase.js
   *   8.  Kasir penjualan ............... sale.js
   *   9.  Batalkan penjualan (void) ..... sale.js
   *   10. Typeahead customer ............ purchase.js & sale.js
   *   11. Typeahead merchandise ......... TIDAK dipindah: kode mati, tak ada
   *       view yang punya #merchandise_name. Kasir memakai typeahead
   *       khusus di sale.js (#sale_merchandise_name).
   *       Cetak struk RawBT ............. sale.js
   *
   * Bagian 1 & 1b (DataTables + panel #dt-filter) ikut DISALIN ke tiap
   * berkas modul, jadi salinan di bawah ini sudah tidak dipakai pemuat
   * mana pun: yang masih memuat berkas ini hanya Report.php (hanya grafik).
   * Dibiarkan sampai modul itu dipecah.
   * -------------------------------------------------------------------- */


  /* ------------------------------------------------------------------
   * 7. Grafik (Chart.js)
   * ------------------------------------------------------------------ */
  var textColor = chartTextColor();
  var gridColor = chartGridColor();

  // Laporan: tren pendapatan
  // Dashboard pakai salinannya sendiri di themes/plus-admin/js/dashboard.js.
  if ($("#chart-revenue").length && typeof sasanaReport !== "undefined") {
    var revenueSource = sasanaReport.revenueByMonth || [];

    var revenueLabels = revenueSource.map(function (r) {
      return r.periode;
    });
    var revenueValues = revenueSource.map(function (r) {
      return r.total;
    });

    new Chart(document.getElementById("chart-revenue"), {
      type: "bar",
      data: {
        labels: revenueLabels,
        datasets: [
          {
            label: "Pendapatan",
            data: revenueValues,
            backgroundColor: paletteColor(0),
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                return money(ctx.parsed.y);
              },
            },
          },
        },
        scales: {
          x: { ticks: { color: textColor }, grid: { color: gridColor } },
          y: {
            beginAtZero: true,
            ticks: {
              color: textColor,
              callback: function (v) {
                return money(v);
              },
            },
            grid: { color: gridColor },
          },
        },
      },
    });
  }

  // Laporan: jam ramai
  // Dashboard pakai salinannya sendiri di themes/plus-admin/js/dashboard.js.
  if ($("#chart-visits-hour").length && typeof sasanaReport !== "undefined") {
    var hourSource = sasanaReport.visitsByHour || [];

    var hourLabels = [];
    for (var h = 0; h < 24; h++) {
      hourLabels.push((h < 10 ? "0" : "") + h + ":00");
    }

    new Chart(document.getElementById("chart-visits-hour"), {
      type: "bar",
      data: {
        labels: hourLabels,
        datasets: [
          {
            label: "Kunjungan",
            data: hourSource,
            backgroundColor: paletteColor(1),
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            ticks: { color: textColor, autoSkip: true, maxRotation: 0 },
            grid: { color: gridColor },
          },
          y: {
            beginAtZero: true,
            ticks: { color: textColor, precision: 0 },
            grid: { color: gridColor },
          },
        },
      },
    });
  }

  // Laporan: kunjungan per hari
  if ($("#chart-visits-day").length && typeof sasanaReport !== "undefined") {
    new Chart(document.getElementById("chart-visits-day"), {
      type: "line",
      data: {
        labels: sasanaReport.visitsByDay.map(function (r) {
          return r.periode;
        }),
        datasets: [
          {
            label: "Kunjungan",
            data: sasanaReport.visitsByDay.map(function (r) {
              return r.jumlah;
            }),
            borderColor: paletteColor(2),
            backgroundColor: "rgba(142,150,163,0.2)",
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            ticks: { color: textColor, autoSkip: true, maxRotation: 0 },
            grid: { color: gridColor },
          },
          y: {
            beginAtZero: true,
            ticks: { color: textColor, precision: 0 },
            grid: { color: gridColor },
          },
        },
      },
    });
  }

  // Laporan: tipe paket
  if ($("#chart-visits-type").length && typeof sasanaReport !== "undefined") {
    var typeLabels = sasanaReport.visitsByType.map(function (r) {
      return r.tipe === "quota"
        ? "Kuota"
        : r.tipe === "unlimited"
          ? "Unlimited"
          : r.tipe;
    });

    new Chart(document.getElementById("chart-visits-type"), {
      type: "doughnut",
      data: {
        labels: typeLabels,
        datasets: [
          {
            data: sasanaReport.visitsByType.map(function (r) {
              return r.jumlah;
            }),
            backgroundColor: sasanaReport.visitsByType.map(function (r, i) {
              return paletteColor(i);
            }),
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: textColor } },
        },
      },
    });
  }

});
