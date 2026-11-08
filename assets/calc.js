/* 冷端节能 · 节能量计算核心（纯函数，可单测）
 *
 * 系数全部来自公开文献，页面内逐条标注出处；不在此处硬编码任何未验证的工程常量。
 * 严格口径：结果=工程估算，以机组热力特性曲线/性能试验为准。
 */
(function (root) {
  'use strict';

  var COLDEND = {
    // ---- 文献系数（默认值）----
    // 供电煤耗对凝汽器真空的敏感系数 [g/kWh per kPa]
    // 来源①贵州省能源局《影响供电煤耗的因素》第9条：真空下降1kPa→供电煤耗上升2.6g/kWh
    //   （原文限定：80%以上负荷、额定真空附近的估算数据）
    K_VACUUM: 2.6,
    // 来源②内蒙电力技术《600MW机组真空系统加装蒸汽喷射器改造》：压力每下降1kPa，煤耗降低1.9g/kWh
    K_VACUUM_600MW: 1.9,
    // 端差对供电煤耗 [g/kWh per ℃]，来源①第17条：端差每增1℃→煤耗上升0.48g/kWh
    K_DELTA_T: 0.48,
    // 端差↔真空等效换算 [kPa per ℃]，来源①第17条：端差增1℃≈排汽温度升1℃≈真空下降0.3kPa
    DELTA_T_TO_KPA: 0.3,
    // CO2 排放因子 [tCO2 / t标煤]，行业常用值，页面标注需按当地碳核算指南核对
    CO2_PER_TCE: 2.66,

    // ---- 计算 ----
    energyMWh: function (powerMW, hours) {
      return num(powerMW, 0) * num(hours, 0);
    },
    // 由真空改善量得到供电煤耗降低值
    dbFromVacuum: function (deltaP_kPa, k) {
      return num(deltaP_kPa, 0) * num(k, COLDEND.K_VACUUM);
    },
    // 由端差降低量得到供电煤耗降低值
    dbFromDeltaT: function (deltaT_C, k) {
      return num(deltaT_C, 0) * num(k, COLDEND.K_DELTA_T);
    },
    // 端差改善量折算为等效真空改善量
    vacuumFromDeltaT: function (deltaT_C) {
      return num(deltaT_C, 0) * COLDEND.DELTA_T_TO_KPA;
    },
    // 年节标煤量 [t] = 年发电量[MWh] × Δb[g/kWh] / 1000
    annualCoalTon: function (energyMWh, db) {
      return num(energyMWh, 0) * num(db, 0) / 1000;
    },
    // 年节约费用 [万元] = 节标煤[t] × 标煤单价[元/t] / 10000
    annualMoneyWan: function (coalTon, pricePerTce) {
      return num(coalTon, 0) * num(pricePerTce, 0) / 10000;
    },
    // 年减排 CO2 [t]
    annualCO2Ton: function (coalTon, factor) {
      return num(coalTon, 0) * num(factor, COLDEND.CO2_PER_TCE);
    },
    // 度电成本下降 [元/kWh] = Δb[g/kWh] × 标煤单价[元/t] / 1e6
    unitCostDrop: function (db, pricePerTce) {
      return num(db, 0) * num(pricePerTce, 0) / 1e6;
    }
  };

  function num(v, dflt) {
    var n = typeof v === 'number' ? v : parseFloat(v);
    if (!isFinite(n) || n < 0) return dflt;
    return n;
  }

  COLDEND._num = num;
  root.COLDEND = COLDEND;
  if (typeof module !== 'undefined' && module.exports) module.exports = COLDEND;
})(typeof window !== 'undefined' ? window : globalThis);
