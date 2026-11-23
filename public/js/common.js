(function () {
  'use strict';

  window.SmartFin = {
    // Format currency in Indian locale (INR)
    formatCurrency: function (amount, currency) {
      currency = currency || 'INR';
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
      }).format(amount);
    },

    // Format date
    formatDate: function (dateStr, options) {
      options = options || { day: '2-digit', month: 'short', year: 'numeric' };
      return new Date(dateStr).toLocaleDateString('en-IN', options);
    },

    // Show Bootstrap toast notification
    showToast: function (type, message) {
      var bgClass = type === 'success' ? 'bg-success' : type === 'error' ? 'bg-danger' : type === 'warning' ? 'bg-warning' : 'bg-info';
      var id = 'toast-' + Date.now();
      var html =
        '<div id="' + id + '" class="toast align-items-center text-white ' + bgClass + ' border-0" role="alert" aria-live="assertive" aria-atomic="true">' +
        '<div class="d-flex">' +
        '<div class="toast-body">' + message + '</div>' +
        '<button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>' +
        '</div></div>';
      var $container = $('#toast-container');
      if (!$container.length) {
        $container = $('<div id="toast-container" class="position-fixed bottom-0 end-0 p-3" style="z-index:1100;"></div>');
        $('body').append($container);
      }
      $container.append(html);
      var toastEl = document.getElementById(id);
      var toast = new bootstrap.Toast(toastEl, { delay: 4000 });
      toast.show();
      toastEl.addEventListener('hidden.bs.toast', function () { $(toastEl).remove(); });
    },

    // Generic API helper
    api: function (method, url, data) {
      var options = {
        method: method.toUpperCase(),
        url: url,
        contentType: 'application/json',
        data: data ? JSON.stringify(data) : undefined,
      };
      var csrf = $('meta[name="csrf-token"]').attr('content');
      if (csrf) options.headers = { 'x-csrf-token': csrf };
      return $.ajax(options).done(function (res) {
        if (res && res.data && res.data.csrfToken) {
          $('meta[name="csrf-token"]').attr('content', res.data.csrfToken);
        }
      });
    },
  };

  // Global AJAX setup - send CSRF token if available
  $(function () {
    $.ajaxSetup({
      beforeSend: function (xhr) {
        var csrf = $('meta[name="csrf-token"]').attr('content');
        if (csrf) xhr.setRequestHeader('x-csrf-token', csrf);
      },
    });
  });
})();
