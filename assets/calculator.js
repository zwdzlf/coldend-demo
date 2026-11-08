/* 计算器页面逻辑 */
(function () {
  'use strict';
  var C = window.COLDEND;
  var state = { mode: 'vacuum' };

  var el = function (id) { return document.getElementById(id); };
  var fmt = function (v, d) {
    if (!isFinite(v)) return '—';
    var s = v.toFixed(d === undefined ? 2 : d);
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  function readInputs() {
    return {
      powerMW: C._num(el('powerMW').value, 0),
      hours: C._num(el('hours').value, 0),
      price: C._num(el('price').value, 0),
      co2f: C._num(el('co2f').value, C.CO2_PER_TCE),
      deltaP: C._num(el('deltaP').value, 0),
      k: C._num(el('k').value, C.K_VACUUM),
      deltaT: C._num(el('deltaT').value, 0),
      kdt: C._num(el('kdt').value, C.K_DELTA_T)
    };
  }

  function compute(inp) {
    var energy = C.energyMWh(inp.powerMW, inp.hours);
    var db, eqVacuum = null, mainIn, mainK;
    if (state.mode === 'vacuum') {
      db = C.dbFromVacuum(inp.deltaP, inp.k);
      mainIn = inp.deltaP; mainK = inp.k;
    } else {
      db = C.dbFromDeltaT(inp.deltaT, inp.kdt);
      eqVacuum = C.vacuumFromDeltaT(inp.deltaT);
      mainIn = inp.deltaT; mainK = inp.kdt;
    }
    var coal = C.annualCoalTon(energy, db);
    return {
      energy: energy, db: db, coal: coal,
      money: C.annualMoneyWan(coal, inp.price),
      co2: C.annualCO2Ton(coal, inp.co2f),
      unitCost: C.unitCostDrop(db, inp.price),
      eqVacuum: eqVacuum, mainIn: mainIn, mainK: mainK
    };
  }

  function render() {
    var inp = readInputs(), r = compute(inp);

    el('out-db').textContent = fmt(r.db, 2);
    el('out-coal').textContent = fmt(r.coal, 0);
    el('out-money').textContent = fmt(r.money, 1);
    el('out-unit').textContent = r.unitCost.toFixed(3);
    el('out-co2').textContent = fmt(r.co2, 0);
    el('out-energy').textContent = fmt(r.energy, 0);

    var eqBox = el('out-eq-wrap');
    if (r.eqVacuum === null) {
      eqBox.style.display = 'none';
    } else {
      eqBox.style.display = '';
      el('out-eq').textContent = r.eqVacuum.toFixed(2);
    }

    // 公式代入行
    var f1 = state.mode === 'vacuum'
      ? 'Δb = Δp × K = ' + fmt(r.mainIn, 2) + ' kPa × ' + r.mainK + ' g/(kW·h·kPa) = ' + fmt(r.db, 2) + ' g/kWh'
      : 'Δb = ΔT × K = ' + fmt(r.mainIn, 2) + ' ℃ × ' + r.mainK + ' g/(kW·h·℃) = ' + fmt(r.db, 2) + ' g/kWh';
    el('fx-db').textContent = f1;
    el('fx-coal').textContent = '年节标煤 = 年发电量 × Δb / 1000 = ' + fmt(r.energy, 0) + ' MWh × ' + fmt(r.db, 2) + ' / 1000 = ' + fmt(r.coal, 0) + ' t';
    el('fx-money').textContent = '年节约 = 年节标煤 × 标煤单价 = ' + fmt(r.coal, 0) + ' t × ' + inp.price + ' 元/t = ' + fmt(r.money, 1) + ' 万元';
    el('fx-co2').textContent = '年减排 CO₂ = 年节标煤 × 因子 = ' + fmt(r.coal, 0) + ' t × ' + inp.co2f + ' = ' + fmt(r.co2, 0) + ' t';

    // 同步分享链接
    var url = new URL(location.href);
    url.search = '';
    url.searchParams.set('mode', state.mode);
    url.searchParams.set('p', inp.powerMW);
    url.searchParams.set('h', inp.hours);
    url.searchParams.set('c', inp.price);
    url.searchParams.set('d', state.mode === 'vacuum' ? inp.deltaP : inp.deltaT);
    url.searchParams.set('k', state.mode === 'vacuum' ? inp.k : inp.kdt);
    el('share').value = url.toString();
  }

  function setMode(m) {
    state.mode = m;
    document.querySelectorAll('.modebar button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.mode === m));
    });
    el('vacuum-fields').style.display = (m === 'vacuum') ? '' : 'none';
    el('deltat-fields').style.display = (m === 'deltat') ? '' : 'none';
    render();
  }

  function applyQuery() {
    var q = new URLSearchParams(location.search);
    var get = function (k, dflt) { return q.has(k) ? q.get(k) : dflt; };
    el('powerMW').value = get('p', 300);
    el('hours').value = get('h', 5500);
    el('price').value = get('c', 800);
    if (q.get('mode') === 'deltat') {
      el('deltaT').value = get('d', 1.0);
      el('kdt').value = get('k', 0.48);
      setMode('deltat');
    } else {
      el('deltaP').value = get('d', 1.0);
      el('k').value = get('k', 2.6);
      setMode('vacuum');
    }
  }

  document.querySelectorAll('.modebar button').forEach(function (b) {
    b.addEventListener('click', function () { setMode(b.dataset.mode); });
  });
  ['powerMW', 'hours', 'price', 'co2f', 'deltaP', 'k', 'deltaT', 'kdt'].forEach(function (id) {
    el(id).addEventListener('input', render);
  });
  el('copy').addEventListener('click', function () {
    var box = el('share');
    box.select();
    var done = function () {
      var b = el('copy'); var t = b.textContent;
      b.textContent = '已复制'; setTimeout(function () { b.textContent = t; }, 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(box.value).then(done, done);
    } else { try { document.execCommand('copy'); done(); } catch (e) {} }
  });

  applyQuery();
})();
