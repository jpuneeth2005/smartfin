(function () {
  'use strict';

  var monthlyChartInstance = null;

  function showSkeletons() {
    var shimmerHtml = '<div class="skeleton-shimmer" style="height: 32px; width: 140px;"></div>';
    var smallShimmerHtml = '<div class="skeleton-shimmer" style="height: 24px; width: 100px;"></div>';

    $('#statBalance').html(shimmerHtml);
    $('#statTotalIncome').html(shimmerHtml);
    $('#statTotalExpense').html(shimmerHtml);
    $('#statMonthSavings').html(shimmerHtml);

    $('#statTodayExpense').html(smallShimmerHtml);
    $('#statMonthExpense').html(smallShimmerHtml);

    $('#chartSkeleton').show();
    $('#chartContainer').hide();

    $('#recentSkeleton').show();
    $('#recentList').addClass('d-none').empty();
    $('#recentEmptyState').addClass('d-none');
  }

  function fetchDashboard() {
    showSkeletons();
    fetchBudgetAlerts();

    SmartFin.api('GET', '/api/dashboard')
      .done(function (res) {
        var data = res.data;
        if (!data) return;

        renderStats(data);
        renderChart(data.monthlyChart);
        renderRecent(data.recentTransactions);
      })
      .fail(function (xhr) {
        SmartFin.showToast('error', 'Failed to load dashboard metrics');
      });
  }

  function fetchBudgetAlerts() {
    SmartFin.api('GET', '/api/budgets')
      .done(function (res) {
        var alerts = (res && res.data && res.data.alerts) || [];
        var $container = $('#dashboardBudgetAlerts');
        if (!$container.length) return;

        if (alerts.length === 0) {
          $container.addClass('d-none').empty();
          return;
        }

        var exceeded = alerts.filter(function (a) { return a.status === 'exceeded'; });
        var alertClass = exceeded.length > 0 ? 'alert-danger' : 'alert-warning';
        var iconClass = exceeded.length > 0 ? 'bi-exclamation-octagon-fill text-danger' : 'bi-exclamation-triangle-fill text-warning';
        var heading = exceeded.length > 0 ? 'Budget Exceeded' : 'Budget Warning';
        var alertMessages = alerts.map(function (a) { return escapeHtml(a.message); }).join(' &bull; ');

        var html =
          '<div class="alert ' + alertClass + ' d-flex align-items-center justify-content-between shadow-sm py-2 px-3 mb-0" role="alert">' +
          '  <div class="d-flex align-items-center gap-2 overflow-hidden me-2">' +
          '    <i class="bi ' + iconClass + ' fs-5 flex-shrink-0"></i>' +
          '    <div class="small text-truncate">' +
          '      <strong>' + heading + ':</strong> ' + alertMessages +
          '    </div>' +
          '  </div>' +
          '  <a href="/budgets" class="btn btn-sm ' + (exceeded.length > 0 ? 'btn-danger' : 'btn-warning') + ' text-nowrap fw-semibold">' +
          '    Manage Budgets <i class="bi bi-arrow-right"></i>' +
          '  </a>' +
          '</div>';

        $container.html(html).removeClass('d-none');
      })
      .fail(function () {
        $('#dashboardBudgetAlerts').addClass('d-none').empty();
      });
  }

  function renderStats(data) {
    $('#statBalance').text(SmartFin.formatCurrency(data.balance || 0));
    $('#statTotalIncome').text(SmartFin.formatCurrency(data.totalIncome || 0));
    $('#statTotalExpense').text(SmartFin.formatCurrency(data.totalExpense || 0));
    $('#statMonthSavings').text(SmartFin.formatCurrency(data.monthSavings || 0));

    $('#statTodayExpense').text(SmartFin.formatCurrency(data.todayExpense || 0));
    $('#statMonthExpense').text(SmartFin.formatCurrency(data.monthExpense || 0));
  }

  function renderChart(monthlyData) {
    $('#chartSkeleton').hide();
    $('#chartContainer').show();

    var canvas = document.getElementById('monthlyChart');
    if (!canvas) return;

    if (monthlyChartInstance) {
      monthlyChartInstance.destroy();
      monthlyChartInstance = null;
    }

    var labels = (monthlyData && monthlyData.labels) || [];
    var incomeData = (monthlyData && monthlyData.income) || [];
    var expenseData = (monthlyData && monthlyData.expense) || [];

    var ctx = canvas.getContext('2d');
    monthlyChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Income',
            data: incomeData,
            backgroundColor: '#22c55e',
            borderRadius: 4,
            barPercentage: 0.6,
            categoryPercentage: 0.65,
          },
          {
            label: 'Expense',
            data: expenseData,
            backgroundColor: '#ef4444',
            borderRadius: 4,
            barPercentage: 0.6,
            categoryPercentage: 0.65,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              boxWidth: 14,
              font: { family: "'Inter', sans-serif", size: 12, weight: 500 },
              color: '#475569',
            },
          },
          tooltip: {
            backgroundColor: '#0B1F3A',
            padding: 10,
            titleFont: { family: "'Inter', sans-serif", size: 13 },
            bodyFont: { family: "'Inter', sans-serif", size: 12 },
            callbacks: {
              label: function (context) {
                var label = context.dataset.label || '';
                var val = context.parsed.y;
                return label + ': ' + SmartFin.formatCurrency(val);
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { family: "'Inter', sans-serif", size: 11 },
              color: '#64748b',
            },
          },
          y: {
            beginAtZero: true,
            grid: { color: '#f1f5f9' },
            ticks: {
              font: { family: "'Inter', sans-serif", size: 11 },
              color: '#64748b',
              callback: function (val) {
                if (val >= 100000) return '₹' + (val / 100000).toFixed(1) + 'L';
                if (val >= 1000) return '₹' + (val / 1000).toFixed(0) + 'k';
                return '₹' + val;
              },
            },
          },
        },
      },
    });
  }

  function renderRecent(recentList) {
    $('#recentSkeleton').hide();

    if (!recentList || recentList.length === 0) {
      $('#recentList').addClass('d-none').empty();
      $('#recentEmptyState').removeClass('d-none');
      return;
    }

    $('#recentEmptyState').addClass('d-none');
    var $list = $('#recentList');
    $list.removeClass('d-none').empty();

    var html = '';
    recentList.forEach(function (tx) {
      var isIncome = tx.type === 'income';
      var amountSign = isIncome ? '+ ' : '- ';
      var amountClass = isIncome ? 'text-income' : 'text-expense';
      var badgeClass = isIncome ? 'badge-income' : 'badge-expense';
      var desc = tx.description ? escapeHtml(tx.description) : tx.category;

      html += '<li class="list-group-item px-4 py-3 d-flex justify-content-between align-items-center border-bottom">' +
        '<div class="d-flex align-items-center gap-3 overflow-hidden">' +
        '  <span class="badge ' + badgeClass + ' p-2 rounded-circle">' +
        (isIncome ? '<i class="bi bi-arrow-up-right fs-6"></i>' : '<i class="bi bi-arrow-down-left fs-6"></i>') +
        '  </span>' +
        '  <div class="text-truncate">' +
        '    <div class="fw-semibold text-truncate" style="max-width: 170px;">' + desc + '</div>' +
        '    <small class="text-muted">' + SmartFin.formatDate(tx.date) + ' &bull; <span class="badge bg-light text-dark border">' + escapeHtml(tx.category) + '</span></small>' +
        '  </div>' +
        '</div>' +
        '<div class="fw-bold ' + amountClass + ' text-nowrap">' +
        amountSign + SmartFin.formatCurrency(tx.amount) +
        '</div>' +
        '</li>';
    });

    $list.html(html);
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
    fetchDashboard();

    // Re-fetch when transactions are modified
    $(document).on('transaction:saved', function () {
      fetchDashboard();
    });
  });
})();
