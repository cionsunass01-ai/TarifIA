# TarifIA · Calculadora de Pago Adicional por Exceso de VMA (SUNASS)

Aplicación web interactiva y técnica para la liquidación del **Pago Adicional por Exceso de Concentración (PA)** de los **Valores Máximos Admisibles (VMA)** para **Usuarios No Domésticos (UND)**, desarrollada en estricta conformidad con el marco regulatorio oficial de la **SUNASS** (*Superintendencia Nacional de Servicios de Saneamiento del Perú*) bajo el D.S. N° 010-2019-VIVIENDA y R.C.D. N° 025-2011-SUNASS-CD.

---

## 🚀 Características Principales

1. **Pliego Tarifario Oficial SUNASS Integrado (14,719 registros):**
   * Catálogo optimizado e indexado con **11 Empresas Prestadoras (EPS)** a nivel nacional (*SEDAPAL, SEDALIB, EPS GRAU, SEDAPAR, EPSEL, EMAPICA, SEDACHIMBOTE, etc.*).
   * **152 Localidades y Distritos**.
   * **19 Periodos de facturación (2025 – 2026)**.
   * Categorías de Usuarios No Domésticos (*Comercial y otros, Industrial, Estatal*).
   * Determinación y asignación automática de la tarifa de saneamiento/alcantarillado ($B$) según el volumen consumido ($A$) y el tramo tarifario.

2. **Resolución Paso a Paso en Tiempo Real:**
   * **Paso 1 (Caracterización):** Comparación de descargas de laboratorio ($\text{DBO}_5, \text{DQO}, \text{SST}, \text{AyG}$) frente a los límites normativos VMA ($500, 1000, 500, 100\text{ mg/L}$).
   * **Pasos 2 & 3 (Rangos y Factores):** Matrices normativas que se iluminan y resaltan dinámicamente según la concentración de cada parámetro para asignar los factores individuales ($F_i$).
   * **Pasos 4 & 5 (Factor $F$ y Liquidación $PA$):** Desarrollo algebraico en vivo de la sumatoria de factores de ajuste ($F = \sum F_i$) y cálculo del recargo ($PA = C \times F$).

3. **Espectro Visual Interactivo (*Visual Range Gauges*):**
   * Barras de espectro para cada parámetro con aguja indicadora en tiempo real que ilustra el grado de severidad del exceso.

4. **Liquidación Fiscal Completa:**
   * Desglose formal de la factura: Importe Base ($C$) + Recargo ($PA$) + Subtotal + IGV (18%) + Total Facturado.
   * Botón de impresión con formato optimizado para reportes y exportación en PDF.

5. **100% Autónomo y Portable:**
   * Funciona directamente abriendo `index.html` en cualquier navegador web, sin requerir dependencias de servidor ni sufrir bloqueos por CORS.

---

## 📁 Estructura del Repositorio

```text
├── index.html               # Estructura semántica de la aplicación web
├── styles.css               # Sistema de diseño, tokens visuales e impresión
├── app.js                   # Motor de cálculo reactivo y sincronización DOM
├── tarifas_data.js          # Base de datos tarifaria indexada (SUNASS)
├── tarifas_catalog.json     # Catálogo estructurado en formato JSON
├── TARIFA.xlsx              # Archivo fuente original del pliego tarifario SUNASS
├── SKILL_FRONTEND_DESIGN.md # Guía de principios y directrices de diseño visual
└── README.md                # Documentación del proyecto
```

---

## 🛠️ Cómo Ejecutar

Simplemente clona el repositorio y abre `index.html` en tu navegador:

```bash
git clone https://github.com/cionsunass01-ai/TarifIA.git
cd TarifIA
open index.html # En macOS, o doble clic en index.html
```

---

## ⚖️ Marco Normativo de Referencia
* **Decreto Supremo N° 010-2019-VIVIENDA:** Reglamento de Valores Máximos Admisibles (VMA).
* **Resolución de Consejo Directivo N° 025-2011-SUNASS-CD** y modificatorias: Metodología de determinación del Pago Adicional por Exceso de Concentración.
