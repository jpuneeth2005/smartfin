/**
 * public/js/admin.js
 * Admin Console Client Logic: Stats & User Management
 */
(function () {
  'use strict';

  var currentPage = 1;
  var currentSearch = '';
  var searchDebounceTimer = null;
  var pendingAction = null; // { userId, userName, targetStatus }
  var confirmModal = null;

  // Cache DOM
  var $statTotalUsers = $('#statTotalUsers');
  var $statActiveUsers = $('#statActiveUsers');
  var $statNewUsers = $('#statNewUsers');
  var $statSystemRecords = $('#statSystemRecords');
  var $statSystemSubtext = $('#statSystemSubtext');
  var $usersTableBody = $('#usersTableBody');
  var $usersEmptyState = $('#usersEmptyState');
  var $userSearchInput = $('#userSearchInput');
  var $clearSearchBtn = $('#clearSearchBtn');
  var $userPaginationControls = $('#userPaginationControls');
  var $showingStart = $('#showingStart');
  var $showingEnd = $('#showingEnd');
  var $totalUsersCount = $('#totalUsersCount');
  var $statusConfirmModal = $('#statusConfirmModal');
  var $statusModalIcon = $('#statusModalIcon');
  var $statusModalMessage = $('#statusModalMessage');
  var $statusModalSubtext = $('#statusModalSubtext');
  var $confirmStatusChangeBtn = $('#confirmStatusChangeBtn');

  // Load Admin Stats
  function loadStats() {
    SmartFin.api('GET', '/api/admin/stats')
      .done(function (res) {
        var data = res.data || {};
        $statTotalUsers.text(data.totalUsers || 0);
        $statActiveUsers.text(data.activeUsers || 0);
        $statNewUsers.text(data.newUsersLast7Days || 0);
        $statSystemRecords.text(
          (data.totalTransactions || 0) + ' / ' + (data.totalBudgets || 0)
        );
        $statSystemSubtext.text('Total Txns: ' + (data.totalTransactions || 0) + ' | Budgets: ' + (data.totalBudgets || 0));
      })
      .fail(function (xhr) {
        SmartFin.showToast('error', 'Failed to load system statistics');
      });
  }

  // Render Table Skeletons
  function renderSkeletons() {
    var skeletonHtml = '';
    for (var i = 0; i < 5; i++) {
      skeletonHtml +=
        '<tr>' +
        '<td class="ps-4 py-3"><div class="placeholder-glow"><span class="placeholder col-8"></span><br><span class="placeholder col-5 text-muted small"></span></div></td>' +
        '<td class="py-3"><span class="placeholder col-4"></span></td>' +
        '<td class="py-3"><span class="placeholder col-4"></span></td>' +
        '<td class="py-3"><span class="placeholder col-6"></span></td>' +
        '<td class="py-3"><span class="placeholder col-6"></span></td>' +
        '<td class="pe-4 py-3 text-end"><span class="placeholder col-4"></span></td>' +
        '</tr>';
    }
    $usersTableBody.html(skeletonHtml);
    $usersEmptyState.addClass('d-none');
  }

  // Load Users List
  function loadUsers(page, search) {
    currentPage = page || 1;
    currentSearch = typeof search !== 'undefined' ? search : currentSearch;

    renderSkeletons();

    var params = '?page=' + currentPage + '&limit=10';
    if (currentSearch && currentSearch.trim()) {
      params += '&search=' + encodeURIComponent(currentSearch.trim());
    }

    SmartFin.api('GET', '/api/admin/users' + params)
      .done(function (res) {
        var data = res.data || {};
        var users = data.users || [];
        var pagination = data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 };

        renderUsers(users, pagination);
      })
      .fail(function (xhr) {
        $usersTableBody.empty();
        SmartFin.showToast('error', 'Failed to load user directory');
      });
  }

  // Render Users Table
  function renderUsers(users, pagination) {
    $usersTableBody.empty();

    if (!users.length) {
      $usersEmptyState.removeClass('d-none');
      $showingStart.text(0);
      $showingEnd.text(0);
      $totalUsersCount.text(0);
      $userPaginationControls.empty();
      return;
    }

    $usersEmptyState.addClass('d-none');

    var start = (pagination.page - 1) * pagination.limit + 1;
    var end = Math.min(pagination.page * pagination.limit, pagination.total);
    $showingStart.text(start);
    $showingEnd.text(end);
    $totalUsersCount.text(pagination.total);

    users.forEach(function (user) {
      var roleBadge =
        user.role === 'admin'
          ? '<span class="badge" style="background:#0FB5A6;">admin</span>'
          : '<span class="badge bg-secondary">user</span>';

      var statusBadge =
        user.isActive
          ? '<span class="badge bg-success bg-opacity-75">Active</span>'
          : '<span class="badge bg-danger bg-opacity-75">Inactive</span>';

      var lastLogin = user.lastLoginAt
        ? SmartFin.formatDate(user.lastLoginAt)
        : '<span class="text-muted">Never</span>';

      var joined = user.createdAt ? SmartFin.formatDate(user.createdAt) : '-';

      var actionBtnClass = user.isActive ? 'btn-outline-danger' : 'btn-outline-success';
      var actionBtnIcon = user.isActive ? 'bi-person-slash' : 'bi-person-check';
      var actionBtnText = user.isActive ? 'Deactivate' : 'Activate';
      var actionAria = (user.isActive ? 'Deactivate ' : 'Activate ') + (user.name || 'user');

      var rowHtml =
        '<tr>' +
        '<td class="ps-4 py-3">' +
        '  <div class="fw-semibold text-dark">' + escapeHtml(user.name) + '</div>' +
        '  <small class="text-muted">' + escapeHtml(user.email) + '</small>' +
        '</td>' +
        '<td class="py-3">' + roleBadge + '</td>' +
        '<td class="py-3">' + statusBadge + '</td>' +
        '<td class="py-3 small text-muted">' + joined + '</td>' +
        '<td class="py-3 small">' + lastLogin + '</td>' +
        '<td class="pe-4 py-3 text-end">' +
        '  <button type="button" class="btn btn-sm ' + actionBtnClass + ' toggle-status-btn d-inline-flex align-items-center gap-1" ' +
        '    data-id="' + user._id + '" ' +
        '    data-name="' + escapeHtml(user.name) + '" ' +
        '    data-is-active="' + user.isActive + '" ' +
        '    aria-label="' + actionAria + '">' +
        '    <i class="bi ' + actionBtnIcon + '"></i> ' + actionBtnText +
        '  </button>' +
        '</td>' +
        '</tr>';

      $usersTableBody.append(rowHtml);
    });

    renderPagination(pagination);
  }

  // Render Pagination Controls
  function renderPagination(pagination) {
    $userPaginationControls.empty();
    if (pagination.totalPages <= 1) return;

    // Previous Button
    var prevDisabled = pagination.page <= 1 ? ' disabled' : '';
    $userPaginationControls.append(
      '<li class="page-item' + prevDisabled + '">' +
      '  <a class="page-link" href="#" data-page="' + (pagination.page - 1) + '" aria-label="Previous page">&laquo;</a>' +
      '</li>'
    );

    // Page numbers
    for (var p = 1; p <= pagination.totalPages; p++) {
      if (
        p === 1 ||
        p === pagination.totalPages ||
        (p >= pagination.page - 1 && p <= pagination.page + 1)
      ) {
        var activeClass = p === pagination.page ? ' active' : '';
        $userPaginationControls.append(
          '<li class="page-item' + activeClass + '">' +
          '  <a class="page-link" href="#" data-page="' + p + '">' + p + '</a>' +
          '</li>'
        );
      } else if (
        p === pagination.page - 2 ||
        p === pagination.page + 2
      ) {
        $userPaginationControls.append('<li class="page-item disabled"><span class="page-link">...</span></li>');
      }
    }

    // Next Button
    var nextDisabled = pagination.page >= pagination.totalPages ? ' disabled' : '';
    $userPaginationControls.append(
      '<li class="page-item' + nextDisabled + '">' +
      '  <a class="page-link" href="#" data-page="' + (pagination.page + 1) + '" aria-label="Next page">&raquo;</a>' +
      '</li>'
    );
  }

  // Simple HTML Escaping for Safe Table Rendering
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Setup Event Listeners
  $(function () {
    confirmModal = new bootstrap.Modal(document.getElementById('statusConfirmModal'));

    // Initial Loads
    loadStats();
    loadUsers(1, '');

    // Search input with 350ms debounce
    $userSearchInput.on('input', function () {
      clearTimeout(searchDebounceTimer);
      var query = $(this).val();
      searchDebounceTimer = setTimeout(function () {
        loadUsers(1, query);
      }, 350);
    });

    // Clear search
    $clearSearchBtn.on('click', function () {
      $userSearchInput.val('');
      loadUsers(1, '');
    });

    // Pagination link click
    $(document).on('click', '#userPaginationControls .page-link', function (e) {
      e.preventDefault();
      var targetPage = parseInt($(this).data('page'), 10);
      if (targetPage && targetPage !== currentPage) {
        loadUsers(targetPage, currentSearch);
      }
    });

    // Click on Activate/Deactivate Button
    $(document).on('click', '.toggle-status-btn', function () {
      var userId = $(this).data('id');
      var userName = $(this).data('name');
      var currentIsActive = $(this).data('is-active') === true || $(this).data('is-active') === 'true';
      var targetStatus = !currentIsActive;

      pendingAction = {
        userId: userId,
        userName: userName,
        targetStatus: targetStatus,
      };

      if (targetStatus === false) {
        // Deactivate confirmation
        $statusModalIcon.html('<i class="bi bi-exclamation-triangle-fill text-danger"></i>');
        $statusModalMessage.text('Are you sure you want to deactivate ' + userName + '?');
        $statusModalSubtext.text('The user will be immediately blocked from logging in.');
        $confirmStatusChangeBtn
          .removeClass('btn-success')
          .addClass('btn-danger')
          .text('Deactivate User');
      } else {
        // Activate confirmation
        $statusModalIcon.html('<i class="bi bi-check-circle-fill text-success"></i>');
        $statusModalMessage.text('Are you sure you want to activate ' + userName + '?');
        $statusModalSubtext.text('The user will regain access to their account.');
        $confirmStatusChangeBtn
          .removeClass('btn-danger')
          .addClass('btn-success')
          .text('Activate User');
      }

      confirmModal.show();
    });

    // Confirm Status Change
    $confirmStatusChangeBtn.on('click', function () {
      if (!pendingAction) return;

      var btn = $(this);
      btn.prop('disabled', true);

      SmartFin.api('PUT', '/api/admin/users/' + pendingAction.userId + '/status', {
        isActive: pendingAction.targetStatus,
      })
        .done(function (res) {
          confirmModal.hide();
          SmartFin.showToast('success', res.message || 'User status updated');
          loadStats();
          loadUsers(currentPage, currentSearch);
        })
        .fail(function (xhr) {
          var err = xhr.responseJSON || {};
          SmartFin.showToast('error', err.message || 'Failed to update user status');
        })
        .always(function () {
          btn.prop('disabled', false);
          pendingAction = null;
        });
    });
  });
})();
