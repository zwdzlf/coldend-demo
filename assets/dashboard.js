/* 看板页面逻辑：敏感性曲线全部由 calc.js 的公式实时派生，无预置数据 */
(function () {
  'use strict';
  var C = window.COLDEND;
  var el = function (id) { return document.getElementById(id); };
  var charts = {};

  function readBase() {
    return {
      powerMW: C._num(el('powerMW').value, 0),
      hours: C._num(el('hours').value, 0),
      price: C._num(el('price').value, 0)
    };
  }

  function series(powerMW, hours, price) {
    var energy = C.energyMWh(powerMW, hours);
    var xs = [], coal26 = [], coal19 = [], money26 = [];
    for (var i = 0; i <= 30; i++) {
      var dp = i * 0.1;
      var db26 = C.dbFromVacuum(dp, C.K_VACUUM);
      var db19 = C.dbFromVacuum(dp, C.K_VACUUM_600MW);
      var t26 = C.annualCoalTon(energy, db26);
      xs.push(dp.toFixed(1));
      coal26.push(+t26.toFixed(0));
      coal19.push(+C.annualCoalTon(energy, db19).toFixed(0));
      money26.push(+C.annualMoneyWan(t26, price).toFixed(1));
    }
    return { xs: xs, coal26: coal26, coal19: coal19, money26: money26 };
  }

  function axisCommon(name) {
    return {
      name: name, nameTextStyle: { fontSize: 12, color: '#3d4a57' },
      axisLine: { lineStyle: { color: '#dfe5ec' } },
      axisLabel: { color: '#3d4a57', fontSize: 11 },
      splitLine: { lineStyle: { color: '#eef1f5' } }
    };
  }

  function draw() {
    var b = readBase();
    var s = series(b.powerMW, b.hours, b.price);

    charts.coal.setOption({
      grid: { left: 10, right: 24, top: 46, bottom: 10, containLabel: true },
      tooltip: { trigger: 'axis' },
      legend: { top: 4, textStyle: { fontSize: 12 } },
      xAxis: Object.assign(axisCommon('真空改善 Δp (kPa)'), {
        type: 'category', data: s.xs, boundaryGap: false,
        axisLabel: { color: '#3d4a57', fontSize: 11, interval: 4 }
      }),
      yAxis: Object.assign(axisCommon('年节标煤 (t)'), { type: 'value' }),
      series: [
        { name: 'K=2.6 g/(kW·h·kPa)（通用估算）', type: 'line', smooth: true, symbol: 'none',
          data: s.coal26, lineStyle: { width: 2.5, color: '#0b6b5f' }, itemStyle: { color: '#0b6b5f' },
          areaStyle: { color: 'rgba(11,107,95,.10)' } },
        { name: 'K=1.9 g/(kW·h·kPa)（600MW 实测）', type: 'line', smooth: true, symbol: 'none',
          data: s.coal19, lineStyle: { width: 2, color: '#0f7d8c', type: 'dashed' }, itemStyle: { color: '#0f7d8c' } }
      ]
    }, true);

    charts.money.setOption({
      grid: { left: 10, right: 24, top: 38, bottom: 10, containLabel: true },
      tooltip: { trigger: 'axis' },
      xAxis: Object.assign(axisCommon('真空改善 Δp (kPa)'), {
        type: 'category', data: s.xs, boundaryGap: true,
        axisLabel: { color: '#3d4a57', fontSize: 11, interval: 4 }
      }),
      yAxis: Object.assign(axisCommon('年节约 (万元)'), { type: 'value' }),
      series: [
        { name: '年节约费用（按当前标煤单价）', type: 'bar',
          data: s.money26, itemStyle: { color: 'rgba(18,138,122,.72)', borderRadius: [3, 3, 0, 0] } }
      ]
    }, true);
  }

  function init() {
    charts.coal = echarts.init(el('chart-coal'));
    charts.money = echarts.init(el('chart-money'));
    ['powerMW', 'hours', 'price'].forEach(function (id) {
      el(id).addEventListener('input', draw);
    });
    window.addEventListener('resize', function () {
      charts.coal.resize(); charts.money.resize();
    });
    draw();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
