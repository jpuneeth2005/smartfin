(function () {
  'use strict';

  var currentPreset = 'thisMonth';
  var currentGroupBy = 'day';
  var currentFrom = '';
  var currentTo = '';

  var trendChartInstance = null;
  var categoryChartInstance = null;
  var incomeVsExpenseChartInstance = null;
  var savingsChartInstance = null;

  var CATEGORY_COLORS = [
    '#f97316', '#a855f7', '#3b82f6', '#06b6d4', '#eab308',
    '#ec4899', '#ef4444', '#64748b', '#0FB5A6', '#84cc16',
    '#6366f1', '#14b8a6', '#d946ef', '#f43f5e'
  ];

  function getISTDateParts(d) {
    var date = d || new Date();
    var ist = new Date(date.getTime() + (5 * 60 + 30) * 60 * 1000);
    return {
      year: ist.getUTCFullYear(),
      month: ist.getUTCMonth() + 1,
      day: ist.getUTCDate(),
      dateStr: ist.toISOString().slice(0, 10),
    };
  }

  function computePresetDates(preset) {
    var now = new Date();
    var parts = getISTDateParts(now);
    var todayStr = parts.dateStr;

    if (preset === 'today') {
      return { from: todayStr, to: todayStr, defaultGroup: 'day' };
    }

    if (preset === 'last7') {
      var d7 = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      var p7 = getISTDateParts(d7);
      return { from: p7.dateStr, to: todayStr, defaultGroup: 'day' };
    }

    if (preset === 'thisMonth') {
      var mStr = String(parts.month).padStart(2, '0');
      var fromM = parts.year + '-' + mStr + '-01';
      return { from: fromM, to: todayStr, defaultGroup: 'day' };
    }

    if (preset === 'thisYear') {
      var fromY = parts.year + '-01-01';
      return { from: fromY, to: todayStr, defaultGroup: 'month' };
    }

    // Default to this month
    var defM = String(parts.month).padStart(2, '0');
    return { from: parts.year + '-' + defM + '-01', to: todayStr, defaultGroup: 'day' };
  }

  function setPreset(preset) {
    currentPreset = preset;
    $('#presetButtonGroup button').removeClass('active');
    $('#presetButtonGroup button[data-preset="' + preset + '"]').addClass('active');

    if (preset === 'custom') {
      $('#customDateRow').removeClass('d-none');
      $('#inputFrom').val(currentFrom);
      $('#inputTo').val(currentTo);
      return;
    }

    $('#customDateRow').addClass('d-none');
    var computed = computePresetDates(preset);
    currentFrom = computed.from;
    currentTo = computed.to;
    setGroupBy(computed.defaultGroup, false);
    fetchAllAnalytics();
  }

  function setGroupBy(group, triggerFetch) {
    currentGroupBy = group;
    $('#groupByButtonGroup button').removeClass('active');
    $('#groupByButtonGroup button[data-group="' + group + '"]').addClass('active');

    var badgeText = group === 'day' ? 'Daily' : group === 'week' ? 'Weekly' : group === 'month' ? 'Monthly' : 'Yearly';
    $('#trendBadge').text(badgeText);

    if (triggerFetch !== false) {
      fetchAllAnalytics();
    }
  }

  function showAllSkeletons() {
    var shimmer = '<div class="skeleton-shimmer" style="height: 28px; width: 120px;"></div>';
    $('#statPeriodExpense').html(shimmer);
    $('#statPeriodIncome').html(shimmer);
    $('#statPeriodSavings').html(shimmer);
    $('#statTopCategory').html(shimmer);

    $('#trendSkeleton').show();
    $('#trendChartContainer').hide();
    $('#trendEmptyState').addClass('d-none');

    $('#categorySkeleton').show();
    $('#categoryChartContainer').hide();
    $('#categoryEmptyState').addClass('d-none');

    $('#incomeVsExpenseSkeleton').show();
    $('#incomeVsExpenseChartContainer').hide();
    $('#incomeVsExpenseEmptyState').addClass('d-none');

    $('#savingsSkeleton').show();
    $('#savingsChartContainer').hide();
    $('#savingsEmptyState').addClass('d-none');
  }

  function fetchAllAnalytics() {
    showAllSkeletons();

    var pTrend = SmartFin.api('GET', '/api/analytics/trend?from=' + currentFrom + '&to=' + currentTo + '&groupBy=' + currentGroupBy + '&type=expense');
    var pCategories = SmartFin.api('GET', '/api/analytics/categories?from=' + currentFrom + '&to=' + currentTo + '&type=expense');
    var pIncomeVsExpense = SmartFin.api('GET', '/api/analytics/income-vs-expense?from=' + currentFrom + '&to=' + currentTo + '&groupBy=' + currentGroupBy);
    var pSavings = SmartFin.api('GET', '/api/analytics/savings?months=12');

    $.when(pTrend, pCategories, pIncomeVsExpense, pSavings)
      .done(function (rTrend, rCategories, rIncomeVsExpense, rSavings) {
        var trendData = rTrend[0].data;
        var categoryData = rCategories[0].data;
        var incomeVsExpenseData = rIncomeVsExpense[0].data;
        var savingsData = rSavings[0].data;

        renderSummaryCards(categoryData, incomeVsExpenseData);
        renderTrendChart(trendData);
        renderCategoryChart(categoryData);
        renderIncomeVsExpenseChart(incomeVsExpenseData);
        renderSavingsChart(savingsData);
      })
      .fail(function (xhr) {
        SmartFin.showToast('error', 'Failed to load some analytics data');
      });
  }

  function renderSummaryCards(categoryData, incomeVsExpenseData) {
    var totalIncome = 0;
    var totalExpense = 0;

    if (Array.isArray(incomeVsExpenseData)) {
      incomeVsExpenseData.forEach(function (item) {
        totalIncome += item.income || 0;
        totalExpense += item.expense || 0;
      });
    }

    var netSavings = totalIncome - totalExpense;
    var savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : '0.0';

    $('#statPeriodExpense').text(SmartFin.formatCurrency(totalExpense));
    $('#statPeriodIncome').text(SmartFin.formatCurrency(totalIncome));

    var $savingsEl = $('#statPeriodSavings');
    if (netSavings >= 0) {
      $savingsEl.removeClass('text-danger').addClass('text-navy').text(SmartFin.formatCurrency(netSavings));
    } else {
      $savingsEl.removeClass('text-navy').addClass('text-danger').text('- ' + SmartFin.formatCurrency(Math.abs(netSavings)));
    }
    $('#statSavingsRate').text('Savings Rate: ' + savingsRate + '%');

    if (categoryData && categoryData.categories && categoryData.categories.length > 0) {
      var top = categoryData.categories[0];
      $('#statTopCategory').text(top.category);
      $('#statTopCategoryDetail').text(SmartFin.formatCurrency(top.total) + ' (' + top.percent + '%)');
    } else {
      $('#statTopCategory').text('None');
      $('#statTopCategoryDetail').text('No expenses in period');
    }
  }

  function renderTrendChart(trendData) {
    $('#trendSkeleton').hide();

    if (trendChartInstance) {
      trendChartInstance.destroy();
      trendChartInstance = null;
    }

    var points = (trendData && trendData.points) || [];
    var summary = (trendData && trendData.summary) || { total: 0, average: 0, highest: 0 };
    var hasData = points.some(function (p) { return p.total > 0; });

    if (!hasData) {
      $('#trendChartContainer').hide();
      $('#trendEmptyState').removeClass('d-none');
      return;
    }

    $('#trendEmptyState').addClass('d-none');
    $('#trendChartContainer').show();

    var labels = points.map(function (p) { return p.label; });
    var values = points.map(function (p) { return p.total; });
    var avgLine = points.map(function () { return summary.average; });

    var canvas = document.getElementById('trendChart');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');

    trendChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Expense',
            data: values,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            borderWidth: 2,
            tension: 0.3,
            fill: true,
            pointBackgroundColor: '#ef4444',
            pointRadius: points.length > 31 ? 1 : 3,
            pointHoverRadius: 6,
          },
          {
            label: 'Average (' + SmartFin.formatCurrency(summary.average) + ')',
            data: avgLine,
            borderColor: '#f59e0b',
            borderWidth: 1.5,
            borderDash: [6, 6],
            pointRadius: 0,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              boxWidth: 14,
              font: { family: "'Inter', sans-serif", size: 12 },
              color: '#475569',
            },
          },
          tooltip: {
            backgroundColor: '#0B1F3A',
            padding: 10,
            callbacks: {
              label: function (context) {
                var label = context.dataset.label || '';
                return label + ': ' + SmartFin.formatCurrency(context.parsed.y);
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
              maxRotation: 45,
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

  function renderCategoryChart(categoryData) {
    $('#categorySkeleton').hide();

    if (categoryChartInstance) {
      categoryChartInstance.destroy();
      categoryChartInstance = null;
    }

    var categories = (categoryData && categoryData.categories) || [];
    var total = (categoryData && categoryData.total) || 0;

    if (categories.length === 0 || total === 0) {
      $('#categoryChartContainer').hide();
      $('#categoryEmptyState').removeClass('d-none');
      return;
    }

    $('#categoryEmptyState').addClass('d-none');
    $('#categoryChartContainer').show();

    var labels = categories.map(function (c) { return c.category; });
    var data = categories.map(function (c) { return c.total; });
    var colors = categories.map(function (_, i) { return CATEGORY_COLORS[i % CATEGORY_COLORS.length]; });

    var canvas = document.getElementById('categoryChart');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');

    categoryChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: '#ffffff',
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: function (evt, elements) {
          if (elements && elements.length > 0) {
            var idx = elements[0].index;
            var cat = categories[idx].category;
            window.location.href = '/transactions?category=' + encodeURIComponent(cat) + '&from=' + currentFrom + '&to=' + currentTo + '&type=expense';
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              font: { family: "'Inter', sans-serif", size: 11 },
              color: '#475569',
              padding: 12,
            },
          },
          tooltip: {
            backgroundColor: '#0B1F3A',
            padding: 10,
            callbacks: {
              label: function (context) {
                var label = context.label || '';
                var val = context.parsed;
                var pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
                return label + ': ' + SmartFin.formatCurrency(val) + ' (' + pct + '%)';
              },
            },
          },
        },
        cutout: '62%',
      },
    });
  }

  function renderIncomeVsExpenseChart(data) {
    $('#incomeVsExpenseSkeleton').hide();

    if (incomeVsExpenseChartInstance) {
      incomeVsExpenseChartInstance.destroy();
      incomeVsExpenseChartInstance = null;
    }

    var items = data || [];
    var hasData = items.some(function (i) { return (i.income > 0 || i.expense > 0); });

    if (!hasData) {
      $('#incomeVsExpenseChartContainer').hide();
      $('#incomeVsExpenseEmptyState').removeClass('d-none');
      return;
    }

    $('#incomeVsExpenseEmptyState').addClass('d-none');
    $('#incomeVsExpenseChartContainer').show();

    var labels = items.map(function (i) { return i.label; });
    var incomeData = items.map(function (i) { return i.income; });
    var expenseData = items.map(function (i) { return i.expense; });

    var canvas = document.getElementById('incomeVsExpenseChart');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');

    incomeVsExpenseChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Income',
            data: incomeData,
            backgroundColor: '#22c55e',
            borderRadius: 4,
            barPercentage: 0.65,
            categoryPercentage: 0.65,
          },
          {
            label: 'Expense',
            data: expenseData,
            backgroundColor: '#ef4444',
            borderRadius: 4,
            barPercentage: 0.65,
            categoryPercentage: 0.65,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              boxWidth: 14,
              font: { family: "'Inter', sans-serif", size: 12 },
              color: '#475569',
            },
          },
          tooltip: {
            backgroundColor: '#0B1F3A',
            padding: 10,
            callbacks: {
              label: function (context) {
                var label = context.dataset.label || '';
                return label + ': ' + SmartFin.formatCurrency(context.parsed.y);
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
              maxRotation: 45,
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

  function renderSavingsChart(savingsData) {
    $('#savingsSkeleton').hide();

    if (savingsChartInstance) {
      savingsChartInstance.destroy();
      savingsChartInstance = null;
    }

    var items = savingsData || [];
    var hasData = items.some(function (i) { return (i.income > 0 || i.expense > 0); });

    if (!hasData) {
      $('#savingsChartContainer').hide();
      $('#savingsEmptyState').removeClass('d-none');
      return;
    }

    $('#savingsEmptyState').addClass('d-none');
    $('#savingsChartContainer').show();

    var labels = items.map(function (i) { return i.label; });
    var savingsValues = items.map(function (i) { return i.savings; });
    var barColors = items.map(function (i) { return i.savings >= 0 ? '#22c55e' : '#ef4444'; });

    var canvas = document.getElementById('savingsChart');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');

    savingsChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Net Savings',
            data: savingsValues,
            backgroundColor: barColors,
            borderRadius: 4,
            barPercentage: 0.6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0B1F3A',
            padding: 10,
            callbacks: {
              label: function (context) {
                var item = items[context.dataIndex];
                return [
                  'Savings: ' + SmartFin.formatCurrency(item.savings),
                  'Savings Rate: ' + item.savingsRate + '%',
                  'Income: ' + SmartFin.formatCurrency(item.income) + ' | Expense: ' + SmartFin.formatCurrency(item.expense),
                ];
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
              maxRotation: 45,
            },
          },
          y: {
            grid: { color: '#f1f5f9' },
            ticks: {
              font: { family: "'Inter', sans-serif", size: 11 },
              color: '#64748b',
              callback: function (val) {
                if (Math.abs(val) >= 100000) return '₹' + (val / 100000).toFixed(1) + 'L';
                if (Math.abs(val) >= 1000) return '₹' + (val / 1000).toFixed(0) + 'k';
                return '₹' + val;
              },
            },
          },
        },
      },
    });
  }

  function handleCustomApply() {
    var fromVal = $('#inputFrom').val();
    var toVal = $('#inputTo').val();
    var $err = $('#customDateError').addClass('d-none').text('');

    if (!fromVal || !toVal) {
      $err.text('Both From and To dates are required').removeClass('d-none');
      return;
    }

    var fromDate = new Date(fromVal);
    var toDate = new Date(toVal);

    if (fromDate > toDate) {
      $err.text('From date cannot be after To date').removeClass('d-none');
      return;
    }

    var fiveYearsMs = 5 * 365.25 * 24 * 60 * 60 * 1000;
    if (toDate.getTime() - fromDate.getTime() > fiveYearsMs) {
      $err.text('Date range cannot exceed 5 years').removeClass('d-none');
      return;
    }

    currentFrom = fromVal;
    currentTo = toVal;
    fetchAllAnalytics();
  }

  $(function () {
    // Initial load: 'thisMonth'
    var initDates = computePresetDates('thisMonth');
    currentFrom = initDates.from;
    currentTo = initDates.to;
    currentGroupBy = initDates.defaultGroup;

    // Presets
    $('#presetButtonGroup').on('click', 'button', function () {
      var preset = $(this).data('preset');
      setPreset(preset);
    });

    // Group By
    $('#groupByButtonGroup').on('click', 'button', function () {
      var grp = $(this).data('group');
      setGroupBy(grp, true);
    });

    // Apply custom dates
    $('#btnApplyCustom').on('click', handleCustomApply);

    // Initial fetch
    fetchAllAnalytics();

    // Re-fetch on transaction saved
    $(document).on('transaction:saved', function () {
      fetchAllAnalytics();
    });
  });
})();
