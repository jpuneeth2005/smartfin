(function () {
  'use strict';

  var currentMonth = getInitialMonth();
  var bsModal = null;
  var bsDeleteModal = null;
  var budgetToDeleteId = null;
  var currentBudgetsCache = [];

  var CATEGORY_ICONS = {
    Overall: { icon: 'bi-wallet2', bg: 'rgba(15, 181, 166, 0.1)', color: '#0FB5A6' },
    Food: { icon: 'bi-cup-hot', bg: 'rgba(249, 115, 22, 0.1)', color: '#f97316' },
    Shopping: { icon: 'bi-bag', bg: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' },
    Transport: { icon: 'bi-car-front', bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' },
    Education: { icon: 'bi-mortarboard', bg: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4' },
    Bills: { icon: 'bi-receipt', bg: 'rgba(234, 179, 8, 0.1)', color: '#eab308' },
    Entertainment: { icon: 'bi-film', bg: 'rgba(236, 72, 153, 0.1)', color: '#ec4899' },
    Healthcare: { icon: 'bi-heart-pulse', bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' },
    Other: { icon: 'bi-tag', bg: 'rgba(100, 116, 139, 0.1)', color: '#64748b' },
  };

  function getInitialMonth() {
    var now = new Date();
    var ist = new Date(now.getTime() + (5 * 60 + 30) * 60 * 1000);
    return ist.toISOString().slice(0, 7);
  }

  function formatMonthDisplay(monthStr) {
    var parts = monthStr.split('-');
    var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }

  function changeMonth(offset) {
    var parts = currentMonth.split('-');
    var y = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    m += offset;
    while (m < 1) {
      m += 12;
      y -= 1;
    }
    while (m > 12) {
      m -= 12;
      y += 1;
    }
    currentMonth = y + '-' + String(m).padStart(2, '0');
    $('#currentMonthInput').val(currentMonth);
    loadBudgets();
  }

  function loadBudgets() {
    showLoading();

    SmartFin.api('GET', '/api/budgets?month=' + currentMonth)
      .done(function (res) {
        var data = res.data;
        if (!data) return;
        currentBudgetsCache = data.budgets || [];
        renderAlerts(data.alerts || []);
        renderSummary(data.summary || {});
        renderBudgets(currentBudgetsCache);
      })
      .fail(function (xhr) {
        hideLoading();
        var msg = (xhr.responseJSON && xhr.responseJSON.message) ? xhr.responseJSON.message : 'Failed to load budgets';
        SmartFin.showToast('error', msg);
      });
  }

  function showLoading() {
    $('#budgetSkeletonGrid').removeClass('d-none');
    $('#budgetGrid').addClass('d-none').empty();
    $('#budgetEmptyState').addClass('d-none');
    $('#budgetSummaryBar').hide();
    $('#bannerExceeded').addClass('d-none');
    $('#bannerWarning').addClass('d-none');
  }

  function hideLoading() {
    $('#budgetSkeletonGrid').addClass('d-none');
  }

  function renderAlerts(alerts) {
    var exceeded = alerts.filter(function (a) { return a.status === 'exceeded'; });
    var warning = alerts.filter(function (a) { return a.status === 'warning'; });

    if (exceeded.length > 0) {
      var $list = $('#exceededAlertsList').empty();
      exceeded.forEach(function (a) {
        $list.append('<li>' + escapeHtml(a.message) + '</li>');
      });
      $('#bannerExceeded').removeClass('d-none');
    } else {
      $('#bannerExceeded').addClass('d-none');
    }

    if (warning.length > 0) {
      var $wList = $('#warningAlertsList').empty();
      warning.forEach(function (a) {
        $wList.append('<li>' + escapeHtml(a.message) + '</li>');
      });
      $('#bannerWarning').removeClass('d-none');
    } else {
      $('#bannerWarning').addClass('d-none');
    }
  }

  function renderSummary(summary) {
    if (!summary || summary.total === 0) {
      $('#budgetSummaryBar').hide();
      return;
    }

    $('#summaryTotalCount').text(summary.total || 0);
    $('#summaryOkCount').text(summary.ok || 0);
    $('#summaryWarningCount').text(summary.warning || 0);
    $('#summaryExceededCount').text(summary.exceeded || 0);
    $('#budgetSummaryBar').show();
  }

  function renderBudgets(budgets) {
    hideLoading();

    if (!budgets || budgets.length === 0) {
      $('#budgetEmptyState').removeClass('d-none');
      $('#budgetGrid').addClass('d-none').empty();
      return;
    }

    $('#budgetEmptyState').addClass('d-none');
    var $grid = $('#budgetGrid').removeClass('d-none').empty();

    budgets.forEach(function (b) {
      var catInfo = CATEGORY_ICONS[b.category] || CATEGORY_ICONS.Other;
      var statusBadge = '';
      var progressColor = 'bg-success';

      if (b.status === 'exceeded') {
        progressColor = 'bg-danger';
        statusBadge = '<span class="badge bg-danger text-white"><i class="bi bi-exclamation-circle me-1"></i>Exceeded</span>';
      } else if (b.status === 'warning') {
        progressColor = 'bg-warning text-dark';
        statusBadge = '<span class="badge bg-warning text-dark"><i class="bi bi-exclamation-triangle me-1"></i>Warning (' + b.percentUsed + '%)</span>';
      } else {
        statusBadge = '<span class="badge bg-success text-white"><i class="bi bi-check-circle me-1"></i>On Track</span>';
      }

      var progressPercent = Math.min(b.percentUsed, 100);
      var remainingText = b.remaining >= 0
        ? SmartFin.formatCurrency(b.remaining)
        : '- ' + SmartFin.formatCurrency(Math.abs(b.remaining));
      var remainingClass = b.remaining >= 0 ? 'text-success' : 'text-danger fw-bold';

      var cardHtml =
        '<div class="col-12 col-md-6 col-xl-4">' +
        '  <div class="card budget-card border-0 shadow-sm p-4 h-100 bg-white d-flex flex-column justify-content-between">' +
        '    <div>' +
        '      <div class="d-flex justify-content-between align-items-center mb-3">' +
        '        <div class="d-flex align-items-center gap-2">' +
        '          <div class="rounded-circle d-flex align-items-center justify-content-center" style="width: 44px; height: 44px; background:' + catInfo.bg + '; color:' + catInfo.color + ';">' +
        '            <i class="bi ' + catInfo.icon + ' fs-5"></i>' +
        '          </div>' +
        '          <div>' +
        '            <h5 class="fw-bold mb-0 text-dark">' + escapeHtml(b.category) + '</h5>' +
        '            <small class="text-muted">Threshold: ' + b.alertThreshold + '%</small>' +
        '          </div>' +
        '        </div>' +
        '        <div>' + statusBadge + '</div>' +
        '      </div>' +

        '      <!-- Progress Bar -->' +
        '      <div class="mb-3">' +
        '        <div class="d-flex justify-content-between align-items-center small mb-1">' +
        '          <span class="text-muted fw-semibold">Progress</span>' +
        '          <span class="fw-bold ' + (b.status === 'exceeded' ? 'text-danger' : b.status === 'warning' ? 'text-warning' : 'text-success') + '">' + b.percentUsed + '%</span>' +
        '        </div>' +
        '        <div class="progress" style="height: 10px; border-radius: 5px; background: #e2e8f0;">' +
        '          <div class="progress-bar ' + progressColor + '" role="progressbar" style="width: ' + progressPercent + '%; border-radius: 5px;" aria-valuenow="' + progressPercent + '" aria-valuemin="0" aria-valuemax="100"></div>' +
        '        </div>' +
        '      </div>' +

        '      <!-- Spending Metrics -->' +
        '      <div class="row g-2 text-center py-2 mb-3 bg-light rounded">' +
        '        <div class="col-4 border-end">' +
        '          <small class="text-muted d-block" style="font-size: 0.75rem;">SPENT</small>' +
        '          <span class="fw-bold small text-navy">' + SmartFin.formatCurrency(b.spent) + '</span>' +
        '        </div>' +
        '        <div class="col-4 border-end">' +
        '          <small class="text-muted d-block" style="font-size: 0.75rem;">LIMIT</small>' +
        '          <span class="fw-bold small text-navy">' + SmartFin.formatCurrency(b.limit) + '</span>' +
        '        </div>' +
        '        <div class="col-4">' +
        '          <small class="text-muted d-block" style="font-size: 0.75rem;">REMAINING</small>' +
        '          <span class="small ' + remainingClass + '">' + remainingText + '</span>' +
        '        </div>' +
        '      </div>' +
        '    </div>' +

        '    <!-- Actions -->' +
        '    <div class="d-flex justify-content-end gap-2 pt-3 border-top">' +
        '      <button type="button" class="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 btn-edit-budget" data-id="' + b._id + '">' +
        '        <i class="bi bi-pencil"></i> Edit' +
        '      </button>' +
        '      <button type="button" class="btn btn-sm btn-outline-danger d-flex align-items-center gap-1 btn-delete-budget" data-id="' + b._id + '" data-category="' + escapeHtml(b.category) + '">' +
        '        <i class="bi bi-trash3"></i> Delete' +
        '      </button>' +
        '    </div>' +
        '  </div>' +
        '</div>';

      $grid.append(cardHtml);
    });
  }

  function initModals() {
    var modalEl = document.getElementById('budgetModal');
    if (modalEl) {
      bsModal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    }
    var delEl = document.getElementById('deleteBudgetModal');
    if (delEl) {
      bsDeleteModal = bootstrap.Modal.getInstance(delEl) || new bootstrap.Modal(delEl);
    }

    // Range input sync
    $('#budgetAlertThresholdRange').on('input', function () {
      var val = $(this).val();
      $('#budgetAlertThreshold').val(val);
      $('#thresholdDisplay').text(val + '%');
    });

    $('#budgetAlertThreshold').on('input', function () {
      var val = Math.max(1, Math.min(100, parseInt($(this).val(), 10) || 80));
      $('#budgetAlertThresholdRange').val(val);
      $('#thresholdDisplay').text(val + '%');
    });

    // Form submit
    $('#budgetForm').on('submit', handleBudgetSubmit);

    // Confirm delete
    $('#confirmDeleteBudgetBtn').on('click', executeDeleteBudget);
  }

  function openAddModal() {
    clearFormErrors();
    $('#budgetId').val('');
    $('#budgetModalTitle').text('Set Budget');
    $('#budgetSubmitText').text('Save Budget');

    $('#budgetMonth').val(currentMonth).prop('disabled', false);
    $('#budgetCategory').val('').prop('disabled', false);
    $('#budgetMonthHelp').hide();
    $('#budgetCategoryHelp').hide();

    $('#budgetLimit').val('');
    $('#budgetAlertThreshold').val(80);
    $('#budgetAlertThresholdRange').val(80);
    $('#thresholdDisplay').text('80%');

    setSubmitting(false);
    if (bsModal) bsModal.show();
  }

  function openEditModal(id) {
    var budget = currentBudgetsCache.find(function (b) { return b._id === id; });
    if (!budget) return;

    clearFormErrors();
    $('#budgetId').val(budget._id);
    $('#budgetModalTitle').text('Edit Budget');
    $('#budgetSubmitText').text('Update Budget');

    // Month and category disabled when editing
    $('#budgetMonth').val(budget.month).prop('disabled', true);
    $('#budgetCategory').val(budget.category).prop('disabled', true);
    $('#budgetMonthHelp').show();
    $('#budgetCategoryHelp').show();

    $('#budgetLimit').val(budget.limit);
    $('#budgetAlertThreshold').val(budget.alertThreshold || 80);
    $('#budgetAlertThresholdRange').val(budget.alertThreshold || 80);
    $('#thresholdDisplay').text((budget.alertThreshold || 80) + '%');

    setSubmitting(false);
    if (bsModal) bsModal.show();
  }

  function handleBudgetSubmit(e) {
    e.preventDefault();
    clearFormErrors();

    var id = $('#budgetId').val();
    var isEdit = Boolean(id);
    var month = $('#budgetMonth').val();
    var category = $('#budgetCategory').val();
    var limit = parseFloat($('#budgetLimit').val());
    var threshold = parseInt($('#budgetAlertThreshold').val(), 10);

    var hasError = false;

    if (!isEdit) {
      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        showFieldError('#budgetMonth', '#budgetMonthError', 'Please select a valid month');
        hasError = true;
      }
      if (!category) {
        showFieldError('#budgetCategory', '#budgetCategoryError', 'Please select a category');
        hasError = true;
      }
    }

    if (isNaN(limit) || limit <= 0) {
      showFieldError('#budgetLimit', '#budgetLimitError', 'Limit must be greater than ₹0');
      hasError = true;
    }

    if (isNaN(threshold) || threshold < 1 || threshold > 100) {
      showFieldError('#budgetAlertThreshold', '#budgetAlertThresholdError', 'Alert threshold must be 1% - 100%');
      hasError = true;
    }

    if (hasError) return;

    setSubmitting(true);

    var method = isEdit ? 'PUT' : 'POST';
    var url = isEdit ? '/api/budgets/' + id : '/api/budgets';
    var payload = isEdit
      ? { limit: limit, alertThreshold: threshold }
      : { month: month, category: category, limit: limit, alertThreshold: threshold };

    SmartFin.api(method, url, payload)
      .done(function () {
        setSubmitting(false);
        if (bsModal) bsModal.hide();
        SmartFin.showToast('success', isEdit ? 'Budget updated successfully!' : 'Budget created successfully!');
        loadBudgets();
      })
      .fail(function (xhr) {
        setSubmitting(false);
        var res = xhr.responseJSON;
        if (res && res.errors && Array.isArray(res.errors)) {
          res.errors.forEach(function (err) {
            if (err.field === 'limit') showFieldError('#budgetLimit', '#budgetLimitError', err.msg);
            else if (err.field === 'category') showFieldError('#budgetCategory', '#budgetCategoryError', err.msg);
            else if (err.field === 'month') showFieldError('#budgetMonth', '#budgetMonthError', err.msg);
            else if (err.field === 'alertThreshold') showFieldError('#budgetAlertThreshold', '#budgetAlertThresholdError', err.msg);
          });
        } else {
          var msg = (res && res.message) ? res.message : 'Error saving budget';
          SmartFin.showToast('error', msg);
        }
      });
  }

  function confirmDelete(id, categoryName) {
    budgetToDeleteId = id;
    $('#deleteCategoryName').text(categoryName);
    $('#deleteBudgetSpinner').addClass('d-none');
    $('#confirmDeleteBudgetBtn').prop('disabled', false);
    if (bsDeleteModal) bsDeleteModal.show();
  }

  function executeDeleteBudget() {
    if (!budgetToDeleteId) return;

    $('#deleteBudgetSpinner').removeClass('d-none');
    $('#confirmDeleteBudgetBtn').prop('disabled', true);

    SmartFin.api('DELETE', '/api/budgets/' + budgetToDeleteId)
      .done(function () {
        if (bsDeleteModal) bsDeleteModal.hide();
        SmartFin.showToast('success', 'Budget deleted successfully');
        loadBudgets();
      })
      .fail(function (xhr) {
        $('#deleteBudgetSpinner').addClass('d-none');
        $('#confirmDeleteBudgetBtn').prop('disabled', false);
        var msg = (xhr.responseJSON && xhr.responseJSON.message) ? xhr.responseJSON.message : 'Failed to delete budget';
        SmartFin.showToast('error', msg);
      });
  }

  function showFieldError(inputSel, errorSel, msg) {
    $(inputSel).addClass('is-invalid');
    $(errorSel).text(msg).show();
  }

  function clearFormErrors() {
    $('#budgetForm .is-invalid').removeClass('is-invalid');
    $('#budgetForm .invalid-feedback').text('').hide();
  }

  function setSubmitting(isSaving) {
    $('#budgetSubmitBtn').prop('disabled', isSaving);
    if (isSaving) {
      $('#budgetSubmitSpinner').removeClass('d-none');
      $('#budgetSubmitText').text('Saving...');
    } else {
      $('#budgetSubmitSpinner').addClass('d-none');
      var isEdit = Boolean($('#budgetId').val());
      $('#budgetSubmitText').text(isEdit ? 'Update Budget' : 'Save Budget');
    }
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
    $('#currentMonthInput').val(currentMonth);
    initModals();
    loadBudgets();

    // Month picker events
    $('#btnPrevMonth').on('click', function () { changeMonth(-1); });
    $('#btnNextMonth').on('click', function () { changeMonth(1); });
    $('#currentMonthInput').on('change', function () {
      var val = $(this).val();
      if (val && /^\d{4}-\d{2}$/.test(val)) {
        currentMonth = val;
        loadBudgets();
      }
    });

    // Add budget buttons
    $('#btnOpenAddBudget, #btnEmptyAddBudget').on('click', openAddModal);

    // Delegation for edit and delete buttons on grid
    $('#budgetGrid').on('click', '.btn-edit-budget', function () {
      var id = $(this).data('id');
      openEditModal(id);
    });

    $('#budgetGrid').on('click', '.btn-delete-budget', function () {
      var id = $(this).data('id');
      var category = $(this).data('category');
      confirmDelete(id, category);
    });

    // Refresh budgets if transactions change
    $(document).on('transaction:saved', function () {
      loadBudgets();
    });
  });
})();
