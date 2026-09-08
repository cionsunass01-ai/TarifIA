/**
 * Calculadora VMA SUNASS - Metodología de Liquidación de Pago Adicional
 * Con integración del Pliego Tarifario Oficial SUNASS (TARIFA.xlsx)
 */

// Definición normativa de parámetros, VMAs y rangos normativos SUNASS
const VMA_CONFIG = {
  dbo5: {
    name: 'Demanda Bioquímica de Oxígeno',
    sigla: 'DBO₅',
    vma: 500,
    unit: 'mg/L',
    gaugeMax: 3000,
    ranges: [
      { max: 600, rango: 1, factor: 60 },
      { max: 1000, rango: 2, factor: 155 },
      { max: 2500, rango: 3, factor: 350 },
      { max: Infinity, rango: 4, factor: 500 }
    ]
  },
  dqo: {
    name: 'Demanda Química de Oxígeno',
    sigla: 'DQO',
    vma: 1000,
    unit: 'mg/L',
    gaugeMax: 5500,
    ranges: [
      { max: 1200, rango: 1, factor: 84 },
      { max: 2500, rango: 2, factor: 217 },
      { max: 4500, rango: 3, factor: 490 },
      { max: Infinity, rango: 4, factor: 700 }
    ]
  },
  sst: {
    name: 'Sólidos Suspendidos Totales',
    sigla: 'SST',
    vma: 500,
    unit: 'mg/L',
    gaugeMax: 4500,
    ranges: [
      { max: 600, rango: 1, factor: 48 },
      { max: 1000, rango: 2, factor: 124 },
      { max: 3500, rango: 3, factor: 280 },
      { max: Infinity, rango: 4, factor: 400 }
    ]
  },
  ayg: {
    name: 'Aceites y Grasas',
    sigla: 'AyG',
    vma: 100,
    unit: 'mg/L',
    gaugeMax: 800,
    ranges: [
      { max: 200, rango: 1, factor: 48 },
      { max: 350, rango: 2, factor: 124 },
      { max: 600, rango: 3, factor: 280 },
      { max: Infinity, rango: 4, factor: 400 }
    ]
  }
};

// Casos de Estudio Predefinidos
const PRESETS = {
  salud: {
    ep: 'SEDAPAL S.A.',
    localidad: 'ANCON',
    periodo: '2025-12',
    categoria: 'Comercial y otros',
    a: 296,
    b: 4.21,
    dbo5: 1100,
    dqo: 2635,
    sst: 2726,
    ayg: 387
  },
  restaurante: {
    ep: 'SEDALIB S.A.',
    localidad: 'TRUJILLO',
    periodo: '2025-06',
    categoria: 'Comercial y otros',
    a: 150,
    dbo5: 950,
    dqo: 1800,
    sst: 550,
    ayg: 450
  },
  textil: {
    ep: 'SEDAPAR S.A.',
    localidad: 'AREQUIPA METROPOLITANA',
    periodo: '2025-01',
    categoria: 'Industrial',
    a: 420,
    dbo5: 480,
    dqo: 3200,
    sst: 1200,
    ayg: 80
  },
  cumple: {
    ep: 'SEDAPAL S.A.',
    localidad: 'MIRAFLORES',
    periodo: '2025-12',
    categoria: 'Comercial y otros',
    a: 200,
    dbo5: 350,
    dqo: 800,
    sst: 400,
    ayg: 65
  }
};

// Estados
let isAutoTariffB = true;
let isAutoCalcC = true;

// Referencias DOM
const dom = {
  selectPreset: document.getElementById('selectPreset'),
  btnPrintReport: document.getElementById('btnPrintReport'),

  // Selectores de Catálogo
  selectEP: document.getElementById('selectEP'),
  selectLocalidad: document.getElementById('selectLocalidad'),
  selectPeriodo: document.getElementById('selectPeriodo'),
  selectCategoria: document.getElementById('selectCategoria'),

  // Metadata de Tarifa
  metaResolucion: document.getElementById('metaResolucion'),
  metaTramo: document.getElementById('metaTramo'),
  metaCargoFijo: document.getElementById('metaCargoFijo'),
  metaTarifaAgua: document.getElementById('metaTarifaAgua'),

  // Facturación
  inputA: document.getElementById('inputA'),
  inputB: document.getElementById('inputB'),
  btnToggleLockB: document.getElementById('btnToggleLockB'),
  bSourceHint: document.getElementById('bSourceHint'),

  inputC: document.getElementById('inputC'),
  btnToggleLockC: document.getElementById('btnToggleLockC'),
  cCalcFormulaHint: document.getElementById('cCalcFormulaHint'),

  // Laboratorio
  inputDBO5: document.getElementById('inputDBO5'),
  inputDQO: document.getElementById('inputDQO'),
  inputSST: document.getElementById('inputSST'),
  inputAyG: document.getElementById('inputAyG'),

  // Hero Display
  heroComplianceBadge: document.getElementById('heroComplianceBadge'),
  heroMultiplierBadge: document.getElementById('heroMultiplierBadge'),
  displayPAAmount: document.getElementById('displayPAAmount'),
  billAnnotation: document.getElementById('billAnnotation'),

  slipBaseC: document.getElementById('slipBaseC'),
  slipAmountPA: document.getElementById('slipAmountPA'),
  slipSubtotal: document.getElementById('slipSubtotal'),
  slipIGV: document.getElementById('slipIGV'),
  slipTotalWithIGV: document.getElementById('slipTotalWithIGV'),

  // Tablas y Fórmulas
  tbodyStep1Rows: document.getElementById('tbodyStep1Rows'),
  boxFormulaF: document.getElementById('boxFormulaF'),
  boxResultF: document.getElementById('boxResultF'),
  boxFormulaPA: document.getElementById('boxFormulaPA'),
  boxResultPA: document.getElementById('boxResultPA')
};

// Formateadores
function formatCurrency(val) {
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val);
}

function formatNumber(val, decimals = 2) {
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  }).format(val);
}

// Búsqueda en la Base de Datos Tarifaria de SUNASS
function lookupTariffRecord() {
  if (!window.TARIFAS_DB || !window.TARIFAS_DB.catalog) return null;

  const ep = dom.selectEP.value;
  const loc = dom.selectLocalidad.value;
  const period = dom.selectPeriodo.value;
  const cat = dom.selectCategoria.value;
  const volA = parseFloat(dom.inputA.value) || 0;

  const epData = window.TARIFAS_DB.catalog[ep];
  if (!epData) return null;
  const locData = epData[loc];
  if (!locData) return null;
  const perData = locData[period];
  if (!perData) return null;
  const catData = perData[cat];
  if (!catData || catData.length === 0) return null;

  // Regla para 'Comercial y otros': es escalable y se suman todos los tramos de la categoría
  if (cat.toLowerCase().startsWith('comercial')) {
    const sumAlcanta = catData.reduce((sum, r) => sum + r.alcanta, 0);
    const sumAgua = catData.reduce((sum, r) => sum + r.agua, 0);
    const tramosStr = catData.map(r => (r.fin === null ? `${r.ini} a más` : `${r.ini}-${r.fin}`)).join(' + ');
    const alcantaBreakdown = catData.map(r => formatNumber(r.alcanta, 2)).join(' + ');
    const aguaBreakdown = catData.map(r => formatNumber(r.agua, 2)).join(' + ');

    return {
      ini: 0,
      fin: null,
      alcanta: +sumAlcanta.toFixed(4),
      agua: +sumAgua.toFixed(4),
      cargo: catData[0].cargo,
      res: catData[0].res,
      tramoDesc: catData.length > 1 ? `${tramosStr} (Suma de ${catData.length} tramos)` : (catData[0].fin === null ? `${catData[0].ini} a más m³` : `${catData[0].ini} a ${catData[0].fin} m³`),
      breakdownText: catData.length > 1 ? `${alcantaBreakdown} = S/ ${formatNumber(sumAlcanta, 2)}` : `S/ ${formatNumber(sumAlcanta, 2)}`,
      aguaBreakdownText: catData.length > 1 ? `${aguaBreakdown} = S/ ${formatNumber(sumAgua, 2)}` : `S/ ${formatNumber(sumAgua, 2)}`,
      isEscalable: catData.length > 1
    };
  }

  // Para otras categorías: búsqueda por tramo según el volumen consumido A
  for (const r of catData) {
    const fin = (r.fin === null || r.fin === undefined) ? Infinity : r.fin;
    if (volA >= r.ini && volA <= fin) {
      return {
        ...r,
        tramoDesc: (r.fin === null ? `${r.ini} m³ a más` : `${r.ini} a ${r.fin} m³`),
        breakdownText: `S/ ${formatNumber(r.alcanta, 4)}`,
        aguaBreakdownText: `S/ ${formatNumber(r.agua, 4)}`,
        isEscalable: false
      };
    }
  }

  const last = catData[catData.length - 1];
  return {
    ...last,
    tramoDesc: (last.fin === null ? `${last.ini} m³ a más` : `${last.ini} a ${last.fin} m³`),
    breakdownText: `S/ ${formatNumber(last.alcanta, 4)}`,
    aguaBreakdownText: `S/ ${formatNumber(last.agua, 4)}`,
    isEscalable: false
  };
}

// Actualizar tarifa B desde el catálogo
function updateTariffFromCatalog() {
  const record = lookupTariffRecord();
  if (record) {
    if (isAutoTariffB) {
      dom.inputB.value = record.alcanta;
      if (record.isEscalable) {
        dom.bSourceHint.textContent = `Tarifa escalable sumada (${record.breakdownText})`;
      } else {
        dom.bSourceHint.textContent = `Obtenida del pliego SUNASS (${dom.selectEP.value})`;
      }
    }

    // Metadata en UI
    dom.metaResolucion.textContent = record.res || 'Resolución SUNASS';
    dom.metaTramo.textContent = record.tramoDesc;
    dom.metaCargoFijo.textContent = `Cargo fijo: S/ ${formatNumber(record.cargo, 3)}`;
    dom.metaTarifaAgua.textContent = `Tarifa agua: S/ ${formatNumber(record.agua, 3)} / m³ ${record.isEscalable ? '(' + record.aguaBreakdownText + ')' : ''}`;
  } else {
    dom.metaTramo.textContent = 'No disponible';
  }
}

// Evaluación individual de parámetro
function evaluateParameter(paramKey, rawValue) {
  const cfg = VMA_CONFIG[paramKey];
  const value = parseFloat(rawValue) || 0;
  const isExceeded = value > cfg.vma;

  let assignedRango = null;
  let factor = 0;

  if (isExceeded) {
    for (const r of cfg.ranges) {
      if (value <= r.max) {
        assignedRango = r.rango;
        factor = r.factor;
        break;
      }
    }
  }

  // Aguja del espectro visual (25% en VMA, 25% a 100% en exceso)
  let gaugePercent = 0;
  if (value <= cfg.vma) {
    gaugePercent = Math.min(25, (value / cfg.vma) * 25);
  } else {
    const excessSpan = cfg.gaugeMax - cfg.vma;
    const progress = Math.min(1, Math.max(0, (value - cfg.vma) / excessSpan));
    gaugePercent = 25 + (progress * 75);
  }

  return {
    key: paramKey,
    name: cfg.name,
    sigla: cfg.sigla,
    vma: cfg.vma,
    unit: cfg.unit,
    concentration: value,
    isExceeded,
    rango: assignedRango,
    factor,
    gaugePercent
  };
}

// Cálculo principal
function calculateVMA() {
  updateTariffFromCatalog();

  const valA = parseFloat(dom.inputA.value) || 0;
  const valB = parseFloat(dom.inputB.value) || 0;

  let valC = 0;
  if (isAutoCalcC) {
    valC = +(valA * valB).toFixed(2);
    dom.inputC.value = valC.toFixed(2);
    dom.cCalcFormulaHint.textContent = `${formatNumber(valA)} m³ × S/ ${formatNumber(valB, 4)} por m³`;
  } else {
    valC = parseFloat(dom.inputC.value) || 0;
    dom.cCalcFormulaHint.textContent = `Importe personalizado manual`;
  }

  const params = {
    dbo5: evaluateParameter('dbo5', dom.inputDBO5.value),
    dqo: evaluateParameter('dqo', dom.inputDQO.value),
    sst: evaluateParameter('sst', dom.inputSST.value),
    ayg: evaluateParameter('ayg', dom.inputAyG.value)
  };

  updateInputEntriesUI(params);
  renderStep1Table(params);
  highlightMatrices(params);

  // Paso 4: Sumatoria de Factores
  const factorTotal = params.dbo5.factor + params.dqo.factor + params.sst.factor + params.ayg.factor;
  
  // Paso 5: Pago Adicional
  const factorMultiplicador = factorTotal / 100;
  const montoPA = valC * factorMultiplicador;

  // Fiscal Totals
  const subtotalSinIGV = valC + montoPA;
  const montoIGV = subtotalSinIGV * 0.18;
  const totalConIGV = subtotalSinIGV + montoIGV;

  updateFormulasDisplay(valC, params, factorTotal, montoPA);
  updateHeroBill(valC, factorTotal, montoPA, subtotalSinIGV, montoIGV, totalConIGV, params);
}

// UI Helpers
function updateInputEntriesUI(params) {
  Object.keys(params).forEach(key => {
    const p = params[key];
    const entryEl = document.getElementById(`entry-${key}`);
    const flagEl = document.getElementById(`flag-${key}`);
    const cursorEl = document.getElementById(`cursor-${key}`);

    if (!entryEl || !flagEl) return;

    if (p.isExceeded) {
      entryEl.classList.remove('is-compliant');
      entryEl.classList.add('is-exceeded');
      flagEl.querySelector('.flag-text').textContent = `Supera VMA (+${formatNumber(p.concentration - p.vma)} ${p.unit})`;
    } else {
      entryEl.classList.remove('is-exceeded');
      entryEl.classList.add('is-compliant');
      flagEl.querySelector('.flag-text').textContent = `Dentro de límite VMA`;
    }

    if (cursorEl) {
      cursorEl.style.left = `${Math.min(99, Math.max(1, p.gaugePercent))}%`;
    }
  });
}

function renderStep1Table(params) {
  let html = '';
  Object.keys(params).forEach(key => {
    const p = params[key];
    const pillClass = p.isExceeded ? 'supera' : 'cumple';
    const pillIcon = p.isExceeded ? 'ph-bold ph-warning-circle' : 'ph-bold ph-check-circle';
    const pillText = p.isExceeded ? 'Supera' : 'Cumple';

    html += `
      <tr>
        <td><strong>${p.name}</strong></td>
        <td><span class="token-letter">${p.sigla}</span></td>
        <td>${p.unit}</td>
        <td><strong>${formatNumber(p.vma)}</strong></td>
        <td style="font-family: var(--font-mono); font-weight: 700; color: ${p.isExceeded ? 'var(--crimson-severe)' : 'var(--compliance-emerald)'};">
          ${formatNumber(p.concentration, 2)}
        </td>
        <td>
          <span class="table-pill ${pillClass}">
            <i class="${pillIcon}"></i>
            ${pillText}
          </span>
        </td>
      </tr>
    `;
  });
  dom.tbodyStep1Rows.innerHTML = html;
}

function highlightMatrices(params) {
  document.querySelectorAll('.matrix-view td.cell-active').forEach(td => {
    td.classList.remove('cell-active');
  });

  Object.keys(params).forEach(key => {
    const p = params[key];
    if (p.rango) {
      const cellRange = document.querySelector(`#mRange-${p.rango} td[data-param="${key}"]`);
      if (cellRange) cellRange.classList.add('cell-active');

      const cellFactor = document.querySelector(`#mFactor-${p.rango} td[data-param="${key}"]`);
      if (cellFactor) cellFactor.classList.add('cell-active');
    }
  });
}

function updateFormulasDisplay(valC, params, factorTotal, montoPA) {
  const parts = [];
  if (params.dbo5.factor > 0) parts.push(`${params.dbo5.factor}_{DBO5}`);
  if (params.dqo.factor > 0) parts.push(`${params.dqo.factor}_{DQO}`);
  if (params.sst.factor > 0) parts.push(`${params.sst.factor}_{SST}`);
  if (params.ayg.factor > 0) parts.push(`${params.ayg.factor}_{AyG}`);

  if (parts.length === 0) {
    dom.boxFormulaF.textContent = 'F = 0% (Ningún parámetro supera los VMA)';
  } else {
    dom.boxFormulaF.textContent = `F = ${parts.join(' + ')}`;
  }
  dom.boxResultF.textContent = `F = ${factorTotal}%`;

  dom.boxFormulaPA.textContent = `PA = S/ ${formatCurrency(valC)} × ${factorTotal}%`;
  dom.boxResultPA.textContent = `PA = S/ ${formatCurrency(montoPA)}`;
}

function updateHeroBill(valC, factorTotal, montoPA, subtotalSinIGV, montoIGV, totalConIGV, params) {
  dom.displayPAAmount.textContent = formatCurrency(montoPA);
  
  const exceededList = Object.values(params).filter(p => p.isExceeded);
  const count = exceededList.length;

  if (count > 0) {
    dom.heroComplianceBadge.className = 'compliance-state-pill';
    dom.heroComplianceBadge.innerHTML = `<i class="ph-bold ph-warning"></i> <span>${count} de 4 parámetros con exceso de VMA</span>`;
    dom.billAnnotation.textContent = `Liquidación correspondiente a los parámetros que superan los Valores Máximos Admisibles (${exceededList.map(e => e.sigla).join(', ')}).`;
  } else {
    dom.heroComplianceBadge.className = 'compliance-state-pill is-ok';
    dom.heroComplianceBadge.innerHTML = `<i class="ph-bold ph-check-circle"></i> <span>Efluente 100% en cumplimiento normativo</span>`;
    dom.billAnnotation.textContent = `Todas las concentraciones de descarga cumplen con los Valores Máximos Admisibles. No aplica recargo.`;
  }

  dom.heroMultiplierBadge.innerHTML = `Factor Total F = <strong>${factorTotal}%</strong> (${(factorTotal / 100).toFixed(2)}×)`;

  dom.slipBaseC.textContent = `S/ ${formatCurrency(valC)}`;
  dom.slipAmountPA.textContent = `S/ ${formatCurrency(montoPA)}`;
  dom.slipSubtotal.textContent = `S/ ${formatCurrency(subtotalSinIGV)}`;
  dom.slipIGV.textContent = `S/ ${formatCurrency(montoIGV)}`;
  dom.slipTotalWithIGV.textContent = `S/ ${formatCurrency(totalConIGV)}`;
}

// Inicialización de Dropdowns desde TARIFAS_DB
function populateSelectors(presetTarget = null) {
  if (!window.TARIFAS_DB) return;

  const db = window.TARIFAS_DB;

  // 1. EPs
  dom.selectEP.innerHTML = db.eps.map(ep => `<option value="${ep}">${ep}</option>`).join('');
  if (presetTarget && presetTarget.ep) {
    dom.selectEP.value = presetTarget.ep;
  }

  // 2. Periodos
  dom.selectPeriodo.innerHTML = db.periodos.map(p => `<option value="${p}">${p}</option>`).join('');
  if (presetTarget && presetTarget.periodo) {
    dom.selectPeriodo.value = presetTarget.periodo;
  } else {
    dom.selectPeriodo.value = '2025-12';
  }

  updateDependentDropdowns(presetTarget);
}

function updateDependentDropdowns(presetTarget = null) {
  const db = window.TARIFAS_DB;
  const currentEP = dom.selectEP.value;

  // Localidades
  const locs = db.localidades[currentEP] || [];
  dom.selectLocalidad.innerHTML = locs.map(l => `<option value="${l}">${l}</option>`).join('');
  if (presetTarget && presetTarget.localidad && locs.includes(presetTarget.localidad)) {
    dom.selectLocalidad.value = presetTarget.localidad;
  }

  // Categorías
  const cats = db.categorias[currentEP] || [];
  dom.selectCategoria.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
  if (presetTarget && presetTarget.categoria && cats.includes(presetTarget.categoria)) {
    dom.selectCategoria.value = presetTarget.categoria;
  }
}

// Cargar preset
function applyPreset(presetKey) {
  const p = PRESETS[presetKey];
  if (!p) return;

  populateSelectors(p);

  dom.inputA.value = p.a;
  if (p.b !== undefined) dom.inputB.value = p.b;
  dom.inputDBO5.value = p.dbo5;
  dom.inputDQO.value = p.dqo;
  dom.inputSST.value = p.sst;
  dom.inputAyG.value = p.ayg;

  isAutoTariffB = true;
  dom.btnToggleLockB.classList.add('active');

  isAutoCalcC = true;
  dom.btnToggleLockC.classList.add('active');

  calculateVMA();
}

// Event Listeners
function initListeners() {
  // Cambio en EP
  dom.selectEP.addEventListener('change', () => {
    updateDependentDropdowns();
    calculateVMA();
  });

  // Cambio en Localidad, Periodo, Categoría
  [dom.selectLocalidad, dom.selectPeriodo, dom.selectCategoria].forEach(select => {
    select.addEventListener('change', calculateVMA);
  });

  // Volumen A
  dom.inputA.addEventListener('input', calculateVMA);

  // Tarifa B manual
  dom.inputB.addEventListener('input', () => {
    isAutoTariffB = false;
    dom.btnToggleLockB.classList.remove('active');
    dom.bSourceHint.textContent = 'Tarifa personalizada ingresada manualmente';
    calculateVMA();
  });

  // Bloqueo B
  dom.btnToggleLockB.addEventListener('click', () => {
    isAutoTariffB = !isAutoTariffB;
    dom.btnToggleLockB.classList.toggle('active', isAutoTariffB);
    calculateVMA();
  });

  // Input C manual
  dom.inputC.addEventListener('input', () => {
    isAutoCalcC = false;
    dom.btnToggleLockC.classList.remove('active');
    calculateVMA();
  });

  // Bloqueo C
  dom.btnToggleLockC.addEventListener('click', () => {
    isAutoCalcC = !isAutoCalcC;
    dom.btnToggleLockC.classList.toggle('active', isAutoCalcC);
    calculateVMA();
  });

  // Parámetros
  [dom.inputDBO5, dom.inputDQO, dom.inputSST, dom.inputAyG].forEach(input => {
    input.addEventListener('input', calculateVMA);
  });

  // Preset
  dom.selectPreset.addEventListener('change', (e) => {
    applyPreset(e.target.value);
  });

  // Imprimir
  dom.btnPrintReport.addEventListener('click', () => {
    window.print();
  });
}

// Inicio
document.addEventListener('DOMContentLoaded', () => {
  populateSelectors();
  initListeners();
  applyPreset('salud');
});
