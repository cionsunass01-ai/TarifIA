#!/usr/bin/env python3
"""
Conversor Oficial de Pliego Tarifario SUNASS (TARIFA.xlsx -> tarifas_data.js y tarifas_catalog.json)
Específicamente diseñado para la sincronización automática con Power Automate / OneDrive / GitHub Actions.
"""

import sys
import os
import json
import datetime
import openpyxl

def parse_period(val):
    if isinstance(val, (datetime.datetime, datetime.date)):
        return val.strftime("%Y-%m")
    val_str = str(val).strip()
    if len(val_str) >= 7 and val_str[4] == '-':
        return val_str[:7]
    try:
        dt = datetime.datetime.strptime(val_str[:10], "%Y-%m-%d")
        return dt.strftime("%Y-%m")
    except Exception:
        return val_str

def parse_rango(val):
    if val is None:
        return None
    val_str = str(val).strip().lower()
    if 'más' in val_str or 'mas' in val_str or val_str == 'null' or val_str == '':
        return None
    try:
        return float(val)
    except ValueError:
        return None

def convert_excel_to_catalog(excel_path="TARIFA.xlsx", js_out="tarifas_data.js", json_out="tarifas_catalog.json"):
    if not os.path.exists(excel_path):
        print(f"Error: No se encontró el archivo '{excel_path}'")
        sys.exit(1)

    print(f"Leyendo '{excel_path}'...")
    wb = openpyxl.load_workbook(excel_path, data_only=True, read_only=True)
    ws = wb.active

    header = None
    rows = []
    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i == 0:
            header = [str(c).strip() if c is not None else "" for c in row]
            continue
        if not any(row):
            continue
        rows.append(row)

    print(f"Filas leídas: {len(rows)}")

    # Mapeo de índices de columnas
    col_idx = {name: idx for idx, name in enumerate(header)}
    
    # Columnas requeridas
    p_idx = col_idx.get("Periodo", 0)
    ep_idx = col_idx.get("EP", 1)
    cargo_idx = col_idx.get("Cargo Fijo", 2)
    loc_idx = col_idx.get("Localidad", 4)
    res_idx = col_idx.get("eett_resolucion", 5)
    cat_idx = col_idx.get("Categoria", 8)
    rini_idx = col_idx.get("rango_ini", 10)
    rfin_idx = col_idx.get("rango_fin", 11)
    tagua_idx = col_idx.get("tarifa_agua", 12)
    talc_idx = col_idx.get("tarifa_alcanta", 13)

    catalog = {}
    eps_set = set()
    localidades_map = {}
    periodos_set = set()
    categorias_map = {}

    for row in rows:
        periodo_raw = row[p_idx]
        if periodo_raw is None:
            continue
        periodo = parse_period(periodo_raw)
        ep = str(row[ep_idx]).strip() if row[ep_idx] is not None else ""
        loc = str(row[loc_idx]).strip() if row[loc_idx] is not None else ""
        cat = str(row[cat_idx]).strip() if row[cat_idx] is not None else ""
        res = str(row[res_idx]).strip() if row[res_idx] is not None else ""
        
        try:
            cargo = float(row[cargo_idx]) if row[cargo_idx] is not None else 0.0
        except (ValueError, TypeError):
            cargo = 0.0
            
        r_ini = float(row[rini_idx]) if row[rini_idx] is not None else 0.0
        r_fin = parse_rango(row[rfin_idx])
        
        try:
            t_agua = float(row[tagua_idx]) if row[tagua_idx] is not None else 0.0
        except (ValueError, TypeError):
            t_agua = 0.0

        try:
            t_alc = float(row[talc_idx]) if row[talc_idx] is not None else 0.0
        except (ValueError, TypeError):
            t_alc = 0.0

        if not ep or not loc or not cat:
            continue

        eps_set.add(ep)
        periodos_set.add(periodo)

        if ep not in localidades_map:
            localidades_map[ep] = set()
        localidades_map[ep].add(loc)

        if ep not in categorias_map:
            categorias_map[ep] = set()
        categorias_map[ep].add(cat)

        if ep not in catalog:
            catalog[ep] = {}
        if loc not in catalog[ep]:
            catalog[ep][loc] = {}
        if periodo not in catalog[ep][loc]:
            catalog[ep][loc][periodo] = {}
        if cat not in catalog[ep][loc][periodo]:
            catalog[ep][loc][periodo][cat] = []

        catalog[ep][loc][periodo][cat].append({
            "ini": r_ini,
            "fin": r_fin,
            "alcanta": t_alc,
            "agua": t_agua,
            "cargo": cargo,
            "res": res
        })

    # Asegurar ordenación de tramos
    for ep in catalog:
        for loc in catalog[ep]:
            for per in catalog[ep][loc]:
                for cat in catalog[ep][loc][per]:
                    catalog[ep][loc][per][cat].sort(key=lambda x: x["ini"])

    # Tratamiento de categorías especiales para Sedacusco (conservar Comercial y otros como alias de Comercial y otros I)
    for ep, locs in catalog.items():
        if "SEDACUSCO" in ep:
            for loc, pers in locs.items():
                for per, cats in pers.items():
                    if "Comercial y otros I" in cats and "Comercial y otros" not in cats:
                        cats["Comercial y otros"] = cats["Comercial y otros I"]
                        categorias_map[ep].add("Comercial y otros")

    sorted_eps = sorted(list(eps_set))
    sorted_periodos = sorted(list(periodos_set))
    sorted_localidades = {ep: sorted(list(locs)) for ep, locs in sorted(localidades_map.items())}
    sorted_categorias = {ep: sorted(list(cats)) for ep, cats in sorted(categorias_map.items())}

    db = {
        "eps": sorted_eps,
        "localidades": sorted_localidades,
        "periodos": sorted_periodos,
        "categorias": sorted_categorias,
        "catalog": catalog
    }

    # Guardar JSON
    print(f"Guardando '{json_out}'...")
    with open(json_out, "w", encoding="utf-8") as f:
        json.dump(db, f, ensure_ascii=False)

    # Guardar JS
    print(f"Guardando '{js_out}'...")
    with open(js_out, "w", encoding="utf-8") as f:
        f.write("window.TARIFAS_DB = " + json.dumps(db, ensure_ascii=False) + ";\n")

    print(f"✅ ¡Conversión completada con éxito!")
    print(f"   • Total EPS: {len(sorted_eps)}")
    print(f"   • Total Periodos: {len(sorted_periodos)} ({sorted_periodos[0]} a {sorted_periodos[-1]})")

if __name__ == "__main__":
    excel = sys.argv[1] if len(sys.argv) > 1 else "TARIFA.xlsx"
    convert_excel_to_catalog(excel)
