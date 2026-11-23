(function () {
  'use strict';

  // Show/hide password toggle helper
  function setupPasswordToggle(toggleId, inputId, iconId) {
    $(document).on('click', '#' + toggleId, function () {
      var $input = $('#' + inputId);
      var $icon = $('#' + iconId);
      if ($input.attr('type') === 'password') {
        $input.attr('type', 'text');
        $icon.removeClass('bi-eye').addClass('bi-eye-slash');
      } else {
        $input.attr('type', 'password');
        $icon.removeClass('bi-eye-slash').addClass('bi-eye');
      }
    });
  }

  // Clear field errors
  function clearErrors() {
    $('.form-control').removeClass('is-invalid');
    $('.invalid-feedback').text('');
    $('#form-error').addClass('d-none').text('');
  }

  // Show field-level errors from API
  function showFieldErrors(errors) {
    if (!errors || !errors.length) return;
    errors.forEach(function (err) {
      var $field = $('#' + err.field);
      if ($field.length) {
        $field.addClass('is-invalid');
        $('#' + err.field + '-error').text(err.msg);
      }
    });
  }

  // Show/hide spinner
  function setLoading(loading) {
    if (loading) {
      $('#btnText').text('Please wait...');
      $('#btnSpinner').removeClass('d-none');
      $('#submitBtn').prop('disabled', true);
    } else {
      $('#submitBtn').prop('disabled', false);
      $('#btnSpinner').addClass('d-none');
      // Restore original button text based on form type
      var form = $('[data-form]').data('form');
      $('#btnText').text(form === 'login' ? 'Sign In' : 'Create Account');
    }
  }

  $(function () {
    // Password toggle
    setupPasswordToggle('togglePassword', 'password', 'eyeIcon');
    setupPasswordToggle('toggleConfirmPassword', 'confirmPassword', 'eyeIcon2');

    // Login form
    $('#login-form').on('submit', function (e) {
      e.preventDefault();
      clearErrors();
      setLoading(true);
      var data = { email: $('#email').val(), password: $('#password').val() };
      SmartFin.api('POST', '/api/auth/login', data)
        .done(function (res) {
          SmartFin.showToast('success', res.message || 'Login successful');
          setTimeout(function () { window.location.href = '/dashboard'; }, 500);
        })
        .fail(function (xhr) {
          setLoading(false);
          var res = xhr.responseJSON || {};
          if (res.errors) {
            showFieldErrors(res.errors);
          } else {
            $('#form-error').removeClass('d-none').text(res.message || 'Login failed');
          }
        });
    });

    // Register form
    $('#register-form').on('submit', function (e) {
      e.preventDefault();
      clearErrors();
      setLoading(true);
      var data = {
        name: $('#name').val(),
        email: $('#email').val(),
        password: $('#password').val(),
        confirmPassword: $('#confirmPassword').val(),
      };
      SmartFin.api('POST', '/api/auth/register', data)
        .done(function (res) {
          SmartFin.showToast('success', res.message || 'Registration successful');
          setTimeout(function () { window.location.href = '/dashboard'; }, 500);
        })
        .fail(function (xhr) {
          setLoading(false);
          var res = xhr.responseJSON || {};
          if (res.errors) {
            showFieldErrors(res.errors);
          } else {
            $('#form-error').removeClass('d-none').text(res.message || 'Registration failed');
          }
        });
    });

    // Logout buttons in the desktop and mobile navigation
    $(document).on('click', '.logout-btn', function (e) {
      e.preventDefault();
      SmartFin.api('POST', '/api/auth/logout')
        .always(function () { window.location.href = '/login'; });
    });
  });
})();
