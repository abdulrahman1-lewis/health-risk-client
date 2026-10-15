/*
 * Health Insurance Risk Calculator - client
 *
 * RULE: this file performs NO calculations. It collects input, checks that the
 * input is complete and in a sensible range, calls the Node.js API, and shows
 * what the API returns. All BP, BMI and risk logic lives on the server.
 *
 * API contract (all GET, JSON responses):
 *   /ping
 *   /bp-category?systolic=118&diastolic=76          -> { "category": "normal" }
 *   /bmi?feet=5&inches=9&pounds=165                 -> { "bmi": 24.4, "category": "normal" }
 *   /risk-category?age=42&bmi=normal&bp=elevated
 *        &diabetes=true&cancer=false&alzheimers=false -> { "score": 35, "category": "moderate risk" }
 */
(function () {
  'use strict';

  var API_BASE = String(window.API_BASE_URL || '').replace(/\/+$/, '');
  var $ = function (id) { return document.getElementById(id); };

  var form = $('risk-form');
  var submitBtn = $('submit-btn');
  var statusEl = $('server-status');
  var statusText = $('server-status-text');
  var resultCard = $('result-card');
  var resultsEmpty = $('results-empty');
  var historyWrap = $('history-wrap');
  var historyList = $('history');
  var customerNumber = 0;

  /* ---------- Console logging helpers ---------- */

  function stamp() { return new Date().toISOString(); }

  function logRequest(url) {
    console.log('[API REQUEST ] ' + stamp() + '  GET ' + url);
  }
  function logResponse(name, status, data) {
    console.log('[API RESPONSE] ' + stamp() + '  ' + name + '  HTTP ' + status, data);
  }
  function logError(name, err) {
    console.error('[API ERROR   ] ' + stamp() + '  ' + name + '  ' + (err && err.message ? err.message : err));
  }

  /* ---------- API call ---------- */

  function callApi(name, params) {
    var url = new URL(API_BASE + '/' + name);
    Object.keys(params || {}).forEach(function (k) { url.searchParams.set(k, params[k]); });
    logRequest(url.toString());

    return fetch(url.toString(), { method: 'GET', headers: { 'Accept': 'application/json' } })
      .then(function (res) {
        return res.text().then(function (text) {
          var data = null;
          try { data = text ? JSON.parse(text) : null; } catch (e) { data = { raw: text }; }
          logResponse(name, res.status, data);
          if (!res.ok) {
            var msg = (data && (data.error || data.message)) || ('The server returned an error (' + res.status + ').');
            var err = new Error(msg);
            err.fromServer = true;
            throw err;
          }
          return data;
        });
      })
      .catch(function (err) {
        logError(name, err);
        throw err;
      });
  }

  /* ---------- Server status (ping wakes up the API) ---------- */

  function setStatus(kind, text) {
    statusEl.className = 'status status-' + kind;
    statusText.textContent = text;
  }

  function wakeServer() {
    setStatus('waiting', 'Waking up the server. This can take up to a minute\u2026');
    return callApi('ping')
      .then(function () { setStatus('ready', 'Server ready'); })
      .catch(function () { setStatus('error', 'Server not responding yet. You can still try the form.'); });
  }

  /* ---------- Build the drop-down lists ---------- */

  function fillSelect(select, from, to, placeholder, unit) {
    var first = document.createElement('option');
    first.value = '';
    first.textContent = placeholder;
    select.appendChild(first);
    for (var n = from; n <= to; n++) {
      var o = document.createElement('option');
      o.value = String(n);
      o.textContent = unit ? n + ' ' + unit : String(n);
      select.appendChild(o);
    }
  }

  fillSelect($('feet'), 3, 8, 'Select feet', 'ft');
  fillSelect($('inches'), 0, 11, 'Select inches', 'in');
  fillSelect($('systolic'), 70, 240, 'Select upper number');
  fillSelect($('diastolic'), 40, 140, 'Select lower number');

  /* ---------- Input checks (completeness and range only) ---------- */

  function setError(field, message) {
    var input = $(field);
    var err = $('err-' + field);
    if (message) {
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', 'err-' + field);
      err.textContent = message;
    } else {
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
      err.textContent = '';
    }
  }

  function clearErrors() {
    ['age', 'feet', 'inches', 'pounds', 'systolic', 'diastolic'].forEach(function (f) { setError(f, ''); });
    $('form-error').textContent = '';
  }

  function readWholeNumber(id) {
    var raw = $(id).value.trim();
    if (raw === '' || !/^\d+$/.test(raw)) { return null; }
    return parseInt(raw, 10);
  }

  function validate() {
    clearErrors();
    var firstBad = null;
    function bad(field, msg) { setError(field, msg); if (!firstBad) { firstBad = field; } }

    var age = readWholeNumber('age');
    if (age === null) { bad('age', 'Enter your age as a whole number, like 42.'); }
    else if (age < 18 || age > 120) { bad('age', 'Enter an age between 18 and 120.'); }

    if ($('feet').value === '') { bad('feet', 'Select your height in feet.'); }
    if ($('inches').value === '') { bad('inches', 'Select the extra inches. Choose 0 if there are none.'); }

    var pounds = readWholeNumber('pounds');
    if (pounds === null) { bad('pounds', 'Enter your weight in pounds as a whole number, like 165.'); }
    else if (pounds < 50 || pounds > 700) { bad('pounds', 'Enter a weight between 50 and 700 pounds.'); }

    if ($('systolic').value === '') { bad('systolic', 'Select your systolic (upper) number.'); }
    if ($('diastolic').value === '') { bad('diastolic', 'Select your diastolic (lower) number.'); }

    if (firstBad) {
      $('form-error').textContent = 'Please fix the highlighted questions and try again.';
      $(firstBad).focus();
      return null;
    }

    return {
      age: age,
      feet: $('feet').value,
      inches: $('inches').value,
      pounds: pounds,
      systolic: $('systolic').value,
      diastolic: $('diastolic').value,
      diabetes: $('diabetes').checked,
      cancer: $('cancer').checked,
      alzheimers: $('alzheimers').checked
    };
  }

  /* ---------- Matching API text to chart rows and colors (no math) ---------- */

  function bpKey(category) {
    var c = String(category || '').toLowerCase();
    if (c.indexOf('crisis') > -1) { return 'crisis'; }
    if (c.indexOf('2') > -1) { return 'stage2'; }
    if (c.indexOf('1') > -1) { return 'stage1'; }
    if (c.indexOf('elevated') > -1) { return 'elevated'; }
    if (c.indexOf('normal') > -1) { return 'normal'; }
    return null;
  }

  function riskKey(category) {
    var c = String(category || '').toLowerCase();
    if (c.indexOf('uninsurable') > -1) { return 'uninsurable'; }
    if (c.indexOf('high') > -1) { return 'high'; }
    if (c.indexOf('moderate') > -1) { return 'moderate'; }
    if (c.indexOf('low') > -1) { return 'low'; }
    return null;
  }

  function highlightBpRow(category) {
    var rows = document.querySelectorAll('#bp-chart tbody tr');
    var key = bpKey(category);
    Array.prototype.forEach.call(rows, function (row) {
      row.classList.toggle('is-yours', row.getAttribute('data-bp') === key);
    });
  }

  function titleCase(text) {
    var s = String(text || '');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /* ---------- Show results ---------- */

  function addSummaryRow(list, label, value) {
    var row = document.createElement('div');
    var dt = document.createElement('dt');
    var dd = document.createElement('dd');
    dt.textContent = label;
    dd.textContent = value;
    row.appendChild(dt);
    row.appendChild(dd);
    list.appendChild(row);
  }

  function familyText(inputs) {
    var found = [];
    if (inputs.diabetes) { found.push('Diabetes'); }
    if (inputs.cancer) { found.push('Cancer'); }
    if (inputs.alzheimers) { found.push("Alzheimer's"); }
    return found.length ? found.join(', ') : 'None reported';
  }

  function showResult(inputs, bmi, bp, risk) {
    var riskText = titleCase(risk.category);
    var badge = $('risk-badge');
    badge.textContent = riskText;
    badge.className = 'risk-badge';
    var rk = riskKey(risk.category);
    if (rk) { badge.classList.add('risk-' + rk); }

    $('risk-score').textContent = 'Total risk points: ' + risk.score;

    var list = $('summary');
    list.textContent = '';
    addSummaryRow(list, 'Age', inputs.age + ' years');
    addSummaryRow(list, 'Height', inputs.feet + ' ft ' + inputs.inches + ' in');
    addSummaryRow(list, 'Weight', inputs.pounds + ' lb');
    addSummaryRow(list, 'BMI', bmi.bmi + ' (' + titleCase(bmi.category) + ')');
    addSummaryRow(list, 'Blood pressure', inputs.systolic + ' / ' + inputs.diastolic + ' (' + titleCase(bp.category) + ')');
    addSummaryRow(list, 'Family history', familyText(inputs));

    highlightBpRow(bp.category);

    resultsEmpty.hidden = true;
    resultCard.hidden = false;
    resultCard.focus();
    if (window.matchMedia('(max-width: 880px)').matches) {
      resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    customerNumber += 1;
    var li = document.createElement('li');
    li.textContent = 'Person ' + customerNumber + ': ' + riskText + ' (' + risk.score + ' points)';
    historyList.appendChild(li);
    historyWrap.hidden = false;
  }

  /* ---------- Submit ---------- */

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var inputs = validate();
    if (!inputs) { return; }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Working it out\u2026';

    var bmiParams = { feet: inputs.feet, inches: inputs.inches, pounds: inputs.pounds };
    var bpParams = { systolic: inputs.systolic, diastolic: inputs.diastolic };

    Promise.all([callApi('bmi', bmiParams), callApi('bp-category', bpParams)])
      .then(function (answers) {
        var bmi = answers[0];
        var bp = answers[1];
        return callApi('risk-category', {
          age: inputs.age,
          bmi: bmi.category,
          bp: bp.category,
          diabetes: inputs.diabetes,
          cancer: inputs.cancer,
          alzheimers: inputs.alzheimers
        }).then(function (risk) {
          setStatus('ready', 'Server ready');
          showResult(inputs, bmi, bp, risk);
        });
      })
      .catch(function (err) {
        var msg = err && err.fromServer
          ? err.message
          : 'We could not reach the server. Check your internet connection and try again in a moment.';
        if (!(err && err.fromServer)) { setStatus('error', 'Server not responding'); }
        $('form-error').textContent = msg;
      })
      .then(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Get my risk assessment';
      });
  });

  /* ---------- Start over / next person ---------- */

  function resetForm() {
    form.reset();
    clearErrors();
    highlightBpRow(null);
    resultCard.hidden = true;
    resultsEmpty.hidden = false;
  }

  $('clear-btn').addEventListener('click', function () { resetForm(); $('age').focus(); });

  $('another-btn').addEventListener('click', function () {
    resetForm();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    $('age').focus();
  });

  /* ---------- Go ---------- */

  console.log('[CLIENT      ] ' + stamp() + '  Health Risk client started. API base: ' + API_BASE);
  wakeServer();
})();
