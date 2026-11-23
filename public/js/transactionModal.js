(function () {
  'use strict';

  var INCOME_CATEGORIES = ['Salary', 'Other'];
  var EXPENSE_CATEGORIES = ['Food', 'Shopping', 'Transport', 'Education', 'Bills', 'Entertainment', 'Healthcare', 'Other'];

  function getTodayISTString() {
    var now = new Date();
    var ist = new Date(now.getTime() + (5 * 60 + 30) * 60 * 1000);
    return ist.toISOString().slice(0, 10);
  }

  function formatDateForInput(dateVal) {
    if (!dateVal) return getTodayISTString();
    var date = new Date(dateVal);
    var ist = new Date(date.getTime() + (5 * 60 + 30) * 60 * 1000);
    return ist.toISOString().slice(0, 10);
  }

  var $modal = null;
  var bsModal = null;

  function initModal() {
    $modal = $('#transactionModal');
    if (!$modal.length) return;
    var el = document.getElementById('transactionModal');
    bsModal = bootstrap.Modal.getInstance(el) || new bootstrap.Modal(el);

    // Event listener for type change (Income / Expense)
    $('input[name="txType"]').on('change', function () {
      var selectedType = $(this).val();
      updateCategoryDropdown(selectedType);
      clearFieldError('category');
    });

    // Description char counter
    $('#txDescription').on('input', function () {
      var len = $(this).val().length;
      $('#txDescCounter').text(len);
      if (len > 200) {
        setFieldError('description', 'Maximum 200 characters allowed');
      } else {
        clearFieldError('description');
      }
    });

    // Clear field errors on input
    $('#txAmount').on('input', function () { clearFieldError('amount'); });
    $('#txCategory').on('change', function () { clearFieldError('category'); });
    $('#txDate').on('input change', function () { clearFieldError('date'); });

    // Handle form submit
    $('#transactionForm').on('submit', handleFormSubmit);
  }

  function updateCategoryDropdown(type, selectedCategory) {
    var categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    var $select = $('#txCategory');
    $select.empty();
    $select.append('<option value="">Select Category</option>');

    categories.forEach(function (cat) {
      var isSelected = cat === selectedCategory ? ' selected' : '';
      $select.append('<option value="' + cat + '"' + isSelected + '>' + cat + '</option>');
    });
  }

  function clearAllErrors() {
    $('#transactionForm .is-invalid').removeClass('is-invalid');
    $('#transactionForm .invalid-feedback').text('');
  }

  function setFieldError(field, msg) {
    var inputId = '';
    var errorId = '';
    if (field === 'amount') {
      inputId = '#txAmount';
      errorId = '#txAmountError';
    } else if (field === 'category') {
      inputId = '#txCategory';
      errorId = '#txCategoryError';
    } else if (field === 'date') {
      inputId = '#txDate';
      errorId = '#txDateError';
    } else if (field === 'description') {
      inputId = '#txDescription';
      errorId = '#txDescError';
    } else if (field === 'type') {
      errorId = '#txTypeError';
    }

    if (inputId) $(inputId).addClass('is-invalid');
    if (errorId) $(errorId).text(msg).show();
  }

  function clearFieldError(field) {
    var inputId = '';
    var errorId = '';
    if (field === 'amount') {
      inputId = '#txAmount';
      errorId = '#txAmountError';
    } else if (field === 'category') {
      inputId = '#txCategory';
      errorId = '#txCategoryError';
    } else if (field === 'date') {
      inputId = '#txDate';
      errorId = '#txDateError';
    } else if (field === 'description') {
      inputId = '#txDescription';
      errorId = '#txDescError';
    }
    if (inputId) $(inputId).removeClass('is-invalid');
    if (errorId) $(errorId).text('');
  }

  function setSubmittingState(isSaving) {
    var $btn = $('#txSubmitBtn');
    var $spinner = $('#txSubmitSpinner');
    var $text = $('#txSubmitText');

    $btn.prop('disabled', isSaving);
    if (isSaving) {
      $spinner.removeClass('d-none');
      $text.text('Saving...');
    } else {
      $spinner.addClass('d-none');
      var isEdit = Boolean($('#txId').val());
      $text.text(isEdit ? 'Update Transaction' : 'Save Transaction');
    }
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    clearAllErrors();

    var id = $('#txId').val();
    var type = $('input[name="txType"]:checked').val();
    var amount = parseFloat($('#txAmount').val());
    var category = $('#txCategory').val();
    var date = $('#txDate').val();
    var description = $('#txDescription').val().trim();

    var hasClientError = false;

    if (isNaN(amount) || amount < 0.01 || amount > 10000000) {
      setFieldError('amount', 'Amount must be between 0.01 and 10,000,000');
      hasClientError = true;
    }

    if (!category) {
      setFieldError('category', 'Please select a category');
      hasClientError = true;
    }

    if (!date) {
      setFieldError('date', 'Please select a date');
      hasClientError = true;
    }

    if (description.length > 200) {
      setFieldError('description', 'Description cannot exceed 200 characters');
      hasClientError = true;
    }

    if (hasClientError) return;

    setSubmittingState(true);

    var method = id ? 'PUT' : 'POST';
    var url = id ? '/api/transactions/' + id : '/api/transactions';
    var payload = {
      type: type,
      amount: amount,
      category: category,
      date: date,
      description: description,
    };

    SmartFin.api(method, url, payload)
      .done(function (res) {
        setSubmittingState(false);
        if (bsModal) bsModal.hide();
        var msg = id ? 'Transaction updated successfully!' : 'Transaction created successfully!';
        SmartFin.showToast('success', msg);
        $(document).trigger('transaction:saved', [res.data]);

        // If saved an EXPENSE, check budget alerts for that category or Overall
        if (payload.type === 'expense') {
          var txMonth = (payload.date && payload.date.slice(0, 7)) || undefined;
          var budgetUrl = '/api/budgets' + (txMonth ? '?month=' + txMonth : '');
          SmartFin.api('GET', budgetUrl)
            .done(function (bRes) {
              if (bRes && bRes.data && bRes.data.alerts && Array.isArray(bRes.data.alerts)) {
                bRes.data.alerts.forEach(function (alert) {
                  if (alert.category === payload.category || alert.category === 'Overall') {
                    SmartFin.showToast('warning', alert.message);
                  }
                });
              }
            })
            .fail(function () {
              // Silently ignore budget alert fetch error
            });
        }
      })
      .fail(function (xhr) {
        setSubmittingState(false);
        var res = xhr.responseJSON;
        if (res && res.errors && Array.isArray(res.errors)) {
          res.errors.forEach(function (err) {
            setFieldError(err.field, err.msg);
          });
        } else {
          var errMsg = (res && res.message) ? res.message : 'Failed to save transaction';
          SmartFin.showToast('error', errMsg);
        }
      });
  }

  // Transaction modal public API
  window.SmartFin = window.SmartFin || {};
  window.SmartFin.transactionModal = {
    open: function (opts) {
      opts = opts || {};
      var type = opts.type === 'income' ? 'income' : 'expense';

      if (!bsModal) initModal();
      clearAllErrors();

      $('#txId').val('');
      $('#txModalTitle').text(type === 'income' ? 'Add Income' : 'Add Expense');
      $('#txSubmitText').text('Save Transaction');

      // Select type radio
      if (type === 'income') {
        $('#txTypeIncome').prop('checked', true);
      } else {
        $('#txTypeExpense').prop('checked', true);
      }

      updateCategoryDropdown(type);
      $('#txAmount').val('');
      $('#txDate').val(getTodayISTString());
      $('#txDescription').val('');
      $('#txDescCounter').text('0');

      setSubmittingState(false);
      bsModal.show();
    },

    edit: function (id) {
      if (!id) return;
      if (!bsModal) initModal();
      clearAllErrors();

      $('#txModalTitle').text('Edit Transaction');
      $('#txSubmitText').text('Update Transaction');
      setSubmittingState(true);
      bsModal.show();

      SmartFin.api('GET', '/api/transactions/' + id)
        .done(function (res) {
          setSubmittingState(false);
          var tx = res.data;
          if (!tx) {
            bsModal.hide();
            SmartFin.showToast('error', 'Transaction not found');
            return;
          }

          $('#txId').val(tx._id);
          if (tx.type === 'income') {
            $('#txTypeIncome').prop('checked', true);
          } else {
            $('#txTypeExpense').prop('checked', true);
          }

          updateCategoryDropdown(tx.type, tx.category);
          $('#txAmount').val(tx.amount);
          $('#txDate').val(formatDateForInput(tx.date));
          $('#txDescription').val(tx.description || '');
          $('#txDescCounter').text((tx.description || '').length);
        })
        .fail(function (xhr) {
          setSubmittingState(false);
          bsModal.hide();
          var res = xhr.responseJSON;
          var msg = (res && res.message) ? res.message : 'Error fetching transaction details';
          SmartFin.showToast('error', msg);
        });
    },
  };

  $(function () {
    initModal();
  });
})();
