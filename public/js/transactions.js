(function () {
  'use strict';

  var state = {
    page: 1,
    limit: 10,
    search: '',
    type: '',
    category: '',
    from: '',
    to: '',
    sortBy: 'date',
    order: 'desc',
  };

  var deleteTargetId = null;
  var deleteModalInstance = null;

  function init() {
    var deleteModalEl = document.getElementById('deleteConfirmModal');
    if (deleteModalEl) {
      deleteModalInstance = new bootstrap.Modal(deleteModalEl);
    }

    // Read URL query params on load
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('category')) {
      state.category = urlParams.get('category');
      $('#filterCategory').val(state.category);
    }
    if (urlParams.get('type')) {
      state.type = urlParams.get('type');
      $('#filterType').val(state.type);
    }
    if (urlParams.get('from')) {
      state.from = urlParams.get('from');
      $('#filterFrom').val(state.from);
    }
    if (urlParams.get('to')) {
      state.to = urlParams.get('to');
      $('#filterTo').val(state.to);
    }
    if (urlParams.get('search')) {
      state.search = urlParams.get('search');
      $('#filterSearch').val(state.search);
    }

    // Setup filter event listeners
    var searchTimer = null;
    $('#filterSearch').on('input', function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        state.search = $('#filterSearch').val().trim();
        state.page = 1;
        fetchTransactions();
      }, 400);
    });

    $('#filterType').on('change', function () {
      state.type = $(this).val();
      state.page = 1;
      fetchTransactions();
    });

    $('#filterCategory').on('change', function () {
      state.category = $(this).val();
      state.page = 1;
      fetchTransactions();
    });

    $('#filterFrom').on('change', function () {
      state.from = $(this).val();
      state.page = 1;
      fetchTransactions();
    });

    $('#filterTo').on('change', function () {
      state.to = $(this).val();
      state.page = 1;
      fetchTransactions();
    });

    $('#filterSort').on('change', function () {
      var val = $(this).val();
      if (val === 'date_desc') {
        state.sortBy = 'date';
        state.order = 'desc';
      } else if (val === 'date_asc') {
        state.sortBy = 'date';
        state.order = 'asc';
      } else if (val === 'amount_desc') {
        state.sortBy = 'amount';
        state.order = 'desc';
      } else if (val === 'amount_asc') {
        state.sortBy = 'amount';
        state.order = 'asc';
      }
      state.page = 1;
      fetchTransactions();
    });

    // Reset button
    $('#resetFiltersBtn').on('click', function () {
      state.page = 1;
      state.search = '';
      state.type = '';
      state.category = '';
      state.from = '';
      state.to = '';
      state.sortBy = 'date';
      state.order = 'desc';

      $('#filterSearch').val('');
      $('#filterType').val('');
      $('#filterCategory').val('');
      $('#filterFrom').val('');
      $('#filterTo').val('');
      $('#filterSort').val('date_desc');

      fetchTransactions();
    });

    // Delete confirmation handler
    $('#confirmDeleteBtn').on('click', function () {
      if (!deleteTargetId) return;

      var $btn = $(this);
      $btn.prop('disabled', true).text('Deleting...');

      SmartFin.api('DELETE', '/api/transactions/' + deleteTargetId)
        .done(function () {
          $btn.prop('disabled', false).text('Delete');
          if (deleteModalInstance) deleteModalInstance.hide();
          deleteTargetId = null;
          SmartFin.showToast('success', 'Transaction deleted successfully!');
          fetchTransactions();
        })
        .fail(function (xhr) {
          $btn.prop('disabled', false).text('Delete');
          var res = xhr.responseJSON;
          var msg = (res && res.message) ? res.message : 'Failed to delete transaction';
          SmartFin.showToast('error', msg);
        });
    });

    // Reload on transaction:saved event
    $(document).on('transaction:saved', function () {
      fetchTransactions();
    });

    // Initial fetch
    fetchTransactions();
  }

  function renderSkeleton() {
    var $tbody = $('#txTableBody');
    $tbody.empty();
    $('#txEmptyState').addClass('d-none');
    $('#transactionsTable').removeClass('d-none');

    var rows = '';
    for (var i = 0; i < 5; i++) {
      rows += '<tr>' +
        '<td class="ps-4"><div class="skeleton-line" style="width: 80px;"></div></td>' +
        '<td><div class="skeleton-line" style="width: 160px;"></div></td>' +
        '<td><div class="skeleton-line" style="width: 70px;"></div></td>' +
        '<td><div class="skeleton-line" style="width: 60px;"></div></td>' +
        '<td class="text-end"><div class="skeleton-line ms-auto" style="width: 75px;"></div></td>' +
        '<td class="pe-4 text-end"><div class="skeleton-line ms-auto" style="width: 50px;"></div></td>' +
        '</tr>';
    }
    $tbody.html(rows);
  }

  function fetchTransactions() {
    renderSkeleton();

    var params = {
      page: state.page,
      limit: state.limit,
      sortBy: state.sortBy,
      order: state.order,
    };

    if (state.search) params.search = state.search;
    if (state.type) params.type = state.type;
    if (state.category) params.category = state.category;
    if (state.from) params.from = state.from;
    if (state.to) params.to = state.to;

    var queryString = $.param(params);

    SmartFin.api('GET', '/api/transactions?' + queryString)
      .done(function (res) {
        var data = res.data || {};
        var list = data.transactions || [];
        var pagination = data.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 };

        renderTransactions(list, pagination);
      })
      .fail(function (xhr) {
        $('#txTableBody').empty();
        $('#txEmptyState').removeClass('d-none');
        SmartFin.showToast('error', 'Failed to load transactions');
      });
  }

  function renderTransactions(list, pagination) {
    var $tbody = $('#txTableBody');
    $tbody.empty();

    if (!list || list.length === 0) {
      $('#txEmptyState').removeClass('d-none');
      $('#showingStart').text('0');
      $('#showingEnd').text('0');
      $('#totalTxCount').text('0');
      $('#paginationControls').empty();
      return;
    }

    $('#txEmptyState').addClass('d-none');

    var rows = '';
    list.forEach(function (tx) {
      var isIncome = tx.type === 'income';
      var amountSign = isIncome ? '+ ' : '- ';
      var amountClass = isIncome ? 'text-income' : 'text-expense';
      var badgeClass = isIncome ? 'badge-income' : 'badge-expense';
      var typeLabel = isIncome ? 'Income' : 'Expense';
      var desc = tx.description ? escapeHtml(tx.description) : '<span class="text-muted fst-italic">—</span>';

      rows += '<tr>' +
        '<td class="ps-4 fw-medium text-nowrap">' + SmartFin.formatDate(tx.date) + '</td>' +
        '<td>' + desc + '</td>' +
        '<td><span class="badge bg-light text-dark border fw-normal px-2 py-1">' + escapeHtml(tx.category) + '</span></td>' +
        '<td><span class="badge ' + badgeClass + ' px-2 py-1 fw-semibold">' + typeLabel + '</span></td>' +
        '<td class="text-end fw-bold ' + amountClass + ' text-nowrap">' + amountSign + SmartFin.formatCurrency(tx.amount) + '</td>' +
        '<td class="pe-4 text-end text-nowrap">' +
        '  <button class="btn btn-sm btn-outline-primary me-1 btn-edit-tx" data-id="' + tx._id + '" title="Edit"><i class="bi bi-pencil"></i></button>' +
        '  <button class="btn btn-sm btn-outline-danger btn-delete-tx" data-id="' + tx._id + '" title="Delete"><i class="bi bi-trash"></i></button>' +
        '</td>' +
        '</tr>';
    });

    $tbody.html(rows);

    // Bind action buttons
    $('.btn-edit-tx').on('click', function () {
      var id = $(this).data('id');
      SmartFin.transactionModal.edit(id);
    });

    $('.btn-delete-tx').on('click', function () {
      deleteTargetId = $(this).data('id');
      if (deleteModalInstance) {
        deleteModalInstance.show();
      }
    });

    // Update pagination
    renderPagination(pagination);
  }

  function renderPagination(pagination) {
    var page = pagination.page;
    var limit = pagination.limit;
    var total = pagination.total;
    var totalPages = pagination.totalPages;

    var start = total === 0 ? 0 : (page - 1) * limit + 1;
    var end = Math.min(page * limit, total);

    $('#showingStart').text(start);
    $('#showingEnd').text(end);
    $('#totalTxCount').text(total);

    var $controls = $('#paginationControls');
    $controls.empty();

    if (totalPages <= 1) return;

    // Previous button
    var prevDisabled = page <= 1 ? ' disabled' : '';
    $controls.append(
      '<li class="page-item' + prevDisabled + '">' +
      '<button class="page-link" data-page="' + (page - 1) + '" aria-label="Previous">&laquo;</button>' +
      '</li>'
    );

    // Page buttons (window around current page)
    var maxButtons = 5;
    var startPage = Math.max(1, page - 2);
    var endPage = Math.min(totalPages, startPage + maxButtons - 1);
    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    if (startPage > 1) {
      $controls.append('<li class="page-item"><button class="page-link" data-page="1">1</button></li>');
      if (startPage > 2) {
        $controls.append('<li class="page-item disabled"><span class="page-link">...</span></li>');
      }
    }

    for (var i = startPage; i <= endPage; i++) {
      var activeClass = i === page ? ' active' : '';
      $controls.append(
        '<li class="page-item' + activeClass + '">' +
        '<button class="page-link" data-page="' + i + '">' + i + '</button>' +
        '</li>'
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        $controls.append('<li class="page-item disabled"><span class="page-link">...</span></li>');
      }
      $controls.append('<li class="page-item"><button class="page-link" data-page="' + totalPages + '">' + totalPages + '</button></li>');
    }

    // Next button
    var nextDisabled = page >= totalPages ? ' disabled' : '';
    $controls.append(
      '<li class="page-item' + nextDisabled + '">' +
      '<button class="page-link" data-page="' + (page + 1) + '" aria-label="Next">&raquo;</button>' +
      '</li>'
    );

    // Click handler on page links
    $controls.find('.page-link').on('click', function () {
      var targetPage = parseInt($(this).data('page'), 10);
      if (targetPage && targetPage !== state.page && targetPage >= 1 && targetPage <= totalPages) {
        state.page = targetPage;
        fetchTransactions();
      }
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  $(function () {
    init();
  });
})();
