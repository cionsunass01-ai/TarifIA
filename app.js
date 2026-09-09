/**
 * Calculadora VMA SUNASS - Metodología de Liquidación de Pago Adicional
 * Con integración del Pliego Tarifario Oficial SUNASS (TARIFA.xlsx)
 * y Generador de Cuadros Oficiales para Resoluciones del Tribunal Administrativo (TRASS)
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
    dbo5: 1100,
    dqo: 2635,
    sst: 2726,
    ayg: 387
  },
  resolucion: {
    ep: 'SEDAPAL S.A.',
    localidad: 'COMAS',
    periodo: '2025-10',
    categoria: 'Comercial y otros',
    a: 17,
    dbo5: 629.5,
    dqo: 1399,
    sst: 211,
    ayg: 195
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
let isAutoCalcB = true;
let isAutoCalcC = true;

// Referencias DOM
const dom = {
  selectPreset: document.getElementById('selectPreset'),
  btnExportResolutionImg: document.getElementById('btnExportResolutionImg'),
  btnExportCuadroResolucion: document.getElementById('btnExportCuadroResolucion'),
  resolutionCanvasBlock: document.getElementById('resolutionCanvasBlock'),

  // Selectores de Catálogo
  selectEP: document.getElementById('selectEP'),
  selectLocalidad: document.getElementById('selectLocalidad'),
  selectPeriodo: document.getElementById('selectPeriodo'),
  selectCategoria: document.getElementById('selectCategoria'),

  // Metadata de Tarifa
  metaResolucion: document.getElementById('metaResolucion'),

  // Desglose Comercial Integrado
  breakdownCategoryBadge: document.getElementById('breakdownCategoryBadge'),
  tbodyCommercialBreakdown: document.getElementById('tbodyCommercialBreakdown'),
  tfootCommercialBreakdown: document.getElementById('tfootCommercialBreakdown'),

  // Facturación Comercial
  inputA: document.getElementById('inputA'),
  inputB: document.getElementById('inputB'),
  btnToggleLockB: document.getElementById('btnToggleLockB'),
  bSourceHint: document.getElementById('bSourceHint'),

  inputC: document.getElementById('inputC'),
  btnToggleLockC: document.getElementById('btnToggleLockC'),
  cSourceHint: document.getElementById('cSourceHint'),

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

  slipBaseB: document.getElementById('slipBaseB'),
  slipBaseC: document.getElementById('slipBaseC'),
  slipAmountPA: document.getElementById('slipAmountPA'),
  slipSubtotal: document.getElementById('slipSubtotal'),
  slipIGV: document.getElementById('slipIGV'),
  slipTotalWithIGV: document.getElementById('slipTotalWithIGV'),

  // Step 1
  tbodyStep1Rows: document.getElementById('tbodyStep1Rows'),

  // Resolución TRASS Fórmulas (Numeral 3.2.3 y 3.2.4)
  resoFormulaExpanded: document.getElementById('resoFormulaExpanded'),
  resoFormulaTotal: document.getElementById('resoFormulaTotal'),
  resoPAExpanded: document.getElementById('resoPAExpanded'),
  resoPATotal: document.getElementById('resoPATotal'),

  // Toast
  toastNotification: document.getElementById('toastNotification'),
  toastMessage: document.getElementById('toastMessage')
};

// Toast
function showToast(msg) {
  if (!dom.toastNotification || !dom.toastMessage) return;
  dom.toastMessage.textContent = msg;
  dom.toastNotification.classList.add('show');
  setTimeout(() => {
    dom.toastNotification.classList.remove('show');
  }, 3500);
}

// Exportar Bloque Oficial de Resolución en PNG
async function exportResolutionCuadro() {
  const target = dom.resolutionCanvasBlock;
  if (!target) return;
  if (typeof window.html2canvas !== 'function') {
    alert('La herramienta de captura está inicializando...');
    return;
  }

  try {
    showToast('Generando cuadro de resolución...');

    const canvas = await window.html2canvas(target, {
      scale: 2.5, // Ultra alta resolución para documentos oficiales de Word/PDF
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false
    });

    const link = document.createElement('a');
    link.download = `Cuadro_Resolucion_VMA_${dom.selectEP.value.split(' ')[0]}_${dom.selectLocalidad.value}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Cuadro descargado con éxito');
  } catch (err) {
    console.error('Error al generar cuadro:', err);
    alert('Ocurrió un error al generar la imagen.');
  }
}

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

// Búsqueda y Facturación Escalonada por Bloques en la Base de Datos Tarifaria de SUNASS
function lookupTariffRecord() {
  if (!window.TARIFAS_DB || !window.TARIFAS_DB.catalog) return null;

  const ep = dom.selectEP.value;
  const loc = dom.selectLocalidad.value;
  const period = dom.selectPeriodo.value;
  const cat = dom.selectCategoria.value;
  const volA = Math.max(0, parseFloat(dom.inputA.value) || 0);

  const epData = window.TARIFAS_DB.catalog[ep];
  if (!epData) return null;
  const locData = epData[loc];
  if (!locData) return null;
  const perData = locData[period];
  let catData = perData[cat];
  if (!catData && cat === 'Comercial y otros') {
    catData = perData['Comercial y otros I'];
  }
  if (!catData || catData.length === 0) return null;

  // Desglose por bloques de consumo
  let remVol = volA;
  let totalAlcanta = 0;
  let totalAgua = 0;
  const tableRows = [];

  for (let i = 0; i < catData.length; i++) {
    const tramo = catData[i];
    const tramoCapacity = (tramo.fin === null || tramo.fin === undefined) ? Infinity : (tramo.fin - tramo.ini);
    
    // Volumen asignado a este bloque
    const volInTramo = Math.min(remVol, tramoCapacity);
    const rangeStr = tramo.fin === null ? `${tramo.ini} m³ a más` : `${tramo.ini} a ${tramo.fin} m³`;
    const tramoLabel = catData.length > 1 ? `Tramo ${i + 1} (${rangeStr})` : `Tramo único (${rangeStr})`;

    const activeVol = (volInTramo > 0 || (i === 0 && volA === 0)) ? volInTramo : 0;
    const impAlc = activeVol * tramo.alcanta;
    const impAg = activeVol * tramo.agua;

    totalAlcanta += impAlc;
    totalAgua += impAg;

    tableRows.push({
      tramoLabel,
      vol: activeVol,
      rateAlc: tramo.alcanta,
      impAlc,
      rateAg: tramo.agua,
      impAg,
      isActive: activeVol > 0 || volA === 0
    });

    remVol = Math.max(0, remVol - volInTramo);
  }

  // Tarifa media unitaria equivalente
  const effectiveTariffB = volA > 0 ? +(totalAlcanta / volA).toFixed(4) : catData[0].alcanta;
  const effectiveTariffAgua = volA > 0 ? +(totalAgua / volA).toFixed(4) : catData[0].agua;

  return {
    volA,
    alcanta: effectiveTariffB,
    agua: effectiveTariffAgua,
    totalAlcanta: +totalAlcanta.toFixed(2),
    totalAgua: +totalAgua.toFixed(2),
    cargo: catData[0].cargo,
    res: catData[0].res,
    cat,
    isEscalable: catData.length > 1,
    tableRows
  };
}

// Actualizar tabla de facturación comercial y tarifas desde el catálogo
function updateTariffFromCatalog() {
  const record = lookupTariffRecord();
  if (!record) return;

  if (dom.metaResolucion) {
    dom.metaResolucion.textContent = record.res || 'Resolución SUNASS';
  }

  if (dom.breakdownCategoryBadge) {
    dom.breakdownCategoryBadge.textContent = record.cat;
  }

  // Renderizar filas de la tabla de desglose comercial
  if (dom.tbodyCommercialBreakdown && record.tableRows) {
    dom.tbodyCommercialBreakdown.innerHTML = record.tableRows.map(r => `
      <tr class="${r.isActive ? '' : 'row-inactive'}">
        <td><strong>${r.tramoLabel}</strong></td>
        <td>${formatNumber(r.vol)} m³</td>
        <td>S/ ${formatNumber(r.rateAlc, 4)}</td>
        <td class="td-highlight-alcanta">S/ ${formatCurrency(r.impAlc)}</td>
        <td>S/ ${formatNumber(r.rateAg, 4)}</td>
        <td class="td-highlight-agua">S/ ${formatCurrency(r.impAg)}</td>
      </tr>
    `).join('');
  }

  // Renderizar fila de totales
  if (dom.tfootCommercialBreakdown) {
    dom.tfootCommercialBreakdown.innerHTML = `
      <tr>
        <td><strong>Total facturado</strong></td>
        <td><strong>${formatNumber(record.volA)} m³</strong></td>
        <td><strong>S/ ${formatNumber(record.alcanta, 4)} / m³</strong></td>
        <td class="td-highlight-alcanta"><strong>S/ ${formatCurrency(record.totalAlcanta)}</strong></td>
        <td><strong>S/ ${formatNumber(record.agua, 4)} / m³</strong></td>
        <td class="td-highlight-agua"><strong>S/ ${formatCurrency(record.totalAgua)}</strong></td>
      </tr>
    `;
  }

  // Importe Facturado Alcantarillado B (Sin IGV)
  if (isAutoCalcB && dom.inputB) {
    dom.inputB.value = record.totalAlcanta.toFixed(2);
    if (dom.bSourceHint) {
      dom.bSourceHint.textContent = 'Importe base de alcantarillado calculado (Sin IGV)';
    }
  }

  // Importe Facturado Agua C (Sin IGV)
  if (isAutoCalcC && dom.inputC) {
    dom.inputC.value = record.totalAgua.toFixed(2);
    if (dom.cSourceHint) {
      dom.cSourceHint.textContent = 'Importe de agua potable calculado (Sin IGV)';
    }
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

  // Aguja del espectro visual
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
  const record = lookupTariffRecord();

  const valA = parseFloat(dom.inputA.value) || 0;

  let valB = 0;
  if (isAutoCalcB) {
    valB = record ? record.totalAlcanta : (parseFloat(dom.inputB.value) || 0);
    dom.inputB.value = valB.toFixed(2);
  } else {
    valB = parseFloat(dom.inputB.value) || 0;
  }

  let valC = 0;
  if (isAutoCalcC) {
    valC = record ? record.totalAgua : (parseFloat(dom.inputC.value) || 0);
    dom.inputC.value = valC.toFixed(2);
  } else {
    valC = parseFloat(dom.inputC.value) || 0;
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
  
  // Paso 5: Pago Adicional (PA = Importe facturado alcantarillado B × Factor)
  const factorMultiplicador = factorTotal / 100;
  const montoPA = valB * factorMultiplicador;

  // Totales Fiscales del Recibo (Alcantarillado B + Agua C + Recargo PA)
  const subtotalSinIGV = valB + valC + montoPA;
  const montoIGV = subtotalSinIGV * 0.18;
  const totalConIGV = subtotalSinIGV + montoIGV;

  updateFormulasDisplay(valB, params, factorTotal, montoPA);
  updateHeroBill(valB, valC, factorTotal, montoPA, subtotalSinIGV, montoIGV, totalConIGV, params);
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
  // Limpiar estados activos
  document.querySelectorAll('.reso-table td.cell-active').forEach(td => {
    td.classList.remove('cell-active');
  });

  // Aplicar a las tablas oficiales de resolución
  Object.keys(params).forEach(key => {
    const p = params[key];
    if (p.rango) {
      // Tabla de Rangos
      const cellRange = document.querySelector(`#resoRango-${p.rango} td[data-param="${key}"]`);
      if (cellRange) cellRange.classList.add('cell-active');

      // Tabla de Factores
      const cellFactor = document.querySelector(`#resoFactor-${p.rango} td[data-param="${key}"]`);
      if (cellFactor) cellFactor.classList.add('cell-active');
    }
  });
}

function updateFormulasDisplay(valB, params, factorTotal, montoPA) {
  // Formato oficial de resolución TRASS (F = DBO + DQO + SST + AyG)
  // Muestra 0% para parámetros que no superen VMA (conforme a resoluciones TRASS)
  const line2Text = `F = ${params.dbo5.factor}% + ${params.dqo.factor}% + ${params.sst.factor}% + ${params.ayg.factor}%`;
  
  if (dom.resoFormulaExpanded) {
    dom.resoFormulaExpanded.textContent = line2Text;
  }
  if (dom.resoFormulaTotal) {
    dom.resoFormulaTotal.textContent = `F = ${factorTotal}%`;
  }

  // Formato de liquidación PA (PA = Importe facturado alcantarillado B x F)
  if (dom.resoPAExpanded) {
    dom.resoPAExpanded.textContent = `PA = S/ ${formatCurrency(valB)} × ${factorTotal}%`;
  }
  if (dom.resoPATotal) {
    dom.resoPATotal.textContent = `PA = S/ ${formatCurrency(montoPA)}`;
  }
}

function updateHeroBill(valB, valC, factorTotal, montoPA, subtotalSinIGV, montoIGV, totalConIGV, params) {
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

  if (dom.slipBaseB) {
    dom.slipBaseB.textContent = `S/ ${formatCurrency(valB)}`;
  }
  if (dom.slipBaseC) {
    dom.slipBaseC.textContent = `S/ ${formatCurrency(valC)}`;
  }
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

// Obtener categorías disponibles dinámicamente según EP, Localidad y Periodo
function getCategoriesFor(ep, loc, period) {
  const db = window.TARIFAS_DB;
  if (!db || !db.catalog || !db.catalog[ep] || !db.catalog[ep][loc]) {
    return db?.categorias?.[ep] || ['Comercial y otros', 'Estatal', 'Industrial'];
  }

  const locData = db.catalog[ep][loc];
  if (period && locData[period]) {
    return Object.keys(locData[period]);
  }

  const catSet = new Set();
  Object.values(locData).forEach(perObj => {
    Object.keys(perObj).forEach(cat => catSet.add(cat));
  });
  return Array.from(catSet);
}

function updateCategoryDropdown(targetCategory = null) {
  const currentEP = dom.selectEP.value;
  const currentLoc = dom.selectLocalidad.value;
  const currentPeriod = dom.selectPeriodo.value;
  const prevSelected = targetCategory || dom.selectCategoria.value;

  const cats = getCategoriesFor(currentEP, currentLoc, currentPeriod);
  dom.selectCategoria.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');

  if (prevSelected && cats.includes(prevSelected)) {
    dom.selectCategoria.value = prevSelected;
  } else if (cats.length > 0) {
    dom.selectCategoria.value = cats[0];
  }
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

  // Categorías según la EP y Localidad seleccionadas
  updateCategoryDropdown(presetTarget ? presetTarget.categoria : null);
}

// Cargar preset
function applyPreset(presetKey) {
  const p = PRESETS[presetKey];
  if (!p) return;

  populateSelectors(p);

  dom.inputA.value = p.a;

  isAutoCalcB = true;
  dom.btnToggleLockB.classList.add('active');

  isAutoCalcC = true;
  dom.btnToggleLockC.classList.add('active');

  if (p.b !== undefined) {
    dom.inputB.value = p.b;
    isAutoCalcB = false;
    dom.btnToggleLockB.classList.remove('active');
  }

  if (p.c !== undefined) {
    dom.inputC.value = p.c;
    isAutoCalcC = false;
    dom.btnToggleLockC.classList.remove('active');
  }

  dom.inputDBO5.value = p.dbo5;
  dom.inputDQO.value = p.dqo;
  dom.inputSST.value = p.sst;
  dom.inputAyG.value = p.ayg;

  calculateVMA();
}

// Event Listeners
function initListeners() {
  // Cambio en EP
  dom.selectEP.addEventListener('change', () => {
    updateDependentDropdowns();
    calculateVMA();
  });

  // Cambio en Localidad
  dom.selectLocalidad.addEventListener('change', () => {
    updateCategoryDropdown();
    calculateVMA();
  });

  // Cambio en Periodo
  dom.selectPeriodo.addEventListener('change', () => {
    updateCategoryDropdown();
    calculateVMA();
  });

  // Cambio en Categoría
  dom.selectCategoria.addEventListener('change', calculateVMA);

  // Volumen A
  dom.inputA.addEventListener('input', calculateVMA);

  // Input B (Importe facturado alcantarillado manual)
  dom.inputB.addEventListener('input', () => {
    isAutoCalcB = false;
    dom.btnToggleLockB.classList.remove('active');
    if (dom.bSourceHint) dom.bSourceHint.textContent = 'Importe personalizado ingresado manualmente (Sin IGV)';
    calculateVMA();
  });

  // Bloqueo B
  dom.btnToggleLockB.addEventListener('click', () => {
    isAutoCalcB = !isAutoCalcB;
    dom.btnToggleLockB.classList.toggle('active', isAutoCalcB);
    calculateVMA();
  });

  // Input C (Importe facturado agua manual)
  dom.inputC.addEventListener('input', () => {
    isAutoCalcC = false;
    dom.btnToggleLockC.classList.remove('active');
    if (dom.cSourceHint) dom.cSourceHint.textContent = 'Importe personalizado ingresado manualmente (Sin IGV)';
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


  // Botón principal de Descargar Cuadro
  if (dom.btnExportResolutionImg) {
    dom.btnExportResolutionImg.addEventListener('click', exportResolutionCuadro);
  }

  // Botón interno en la tarjeta
  if (dom.btnExportCuadroResolucion) {
    dom.btnExportCuadroResolucion.addEventListener('click', exportResolutionCuadro);
  }
}

// Inicio
document.addEventListener('DOMContentLoaded', () => {
  populateSelectors();
  initListeners();
  applyPreset('salud');
});
