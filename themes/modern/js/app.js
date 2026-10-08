$(function () {
  /* source: https://gist.github.com/mrgcohen/5062352 */
  window.query_cache = {};
});

(!(function ($) {
  "use strict";
  var MainApp = function () {};

  MainApp.prototype.initLoader = function () {
    /* Preloader */
    $(window).on("load", function () {
      $("#status").fadeOut();
      $("#preloader").delay(250).fadeOut("slow");
    });
  };
  ((MainApp.prototype.init = function () {
    this.initLoader();
  }),
    /* init */
    ($.MainApp = new MainApp()),
    ($.MainApp.Constructor = MainApp));
})(window.jQuery),
  /* initializing */
  (function ($) {
    "use strict";
    $.MainApp.init();
  })(window.jQuery));
