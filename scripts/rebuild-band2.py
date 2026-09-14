#!/usr/bin/env python3
"""
Ersetzt Band 2 in der Excel durch die Vokabelliste der Ausgabe Green Line 2021
(ISBN 864020 — das Buch, mit dem die Klasse arbeitet).

Beispielsaetze je Karte, in dieser Reihenfolge:
  1. Originalsatz aus dem Schulbuch (seed/book-sentences.json + ...-de.json)
  2. Satz aus der frueheren 2021er-Excel (gleiche Ausgabe, identischer Aufbau)
  3. leer — wird beim Nachliefern weiterer Units gefuellt

Aufruf (venv mit pdfplumber + openpyxl): python3 scripts/rebuild-band2.py
"""
import json
import re
import unicodedata
from pathlib import Path

import pdfplumber
from openpyxl import Workbook, load_workbook

import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from importlib import import_module

extract = import_module('extract-pdfs')

ROOT = Path(__file__).resolve().parent.parent
SEED = ROOT / 'seed'
PDF = SEED / 'Vokabelliste_864020_GL_21_2_ukr.pdf'
BOOK_EN = SEED / 'book-sentences.json'
BOOK_DE = SEED / 'book-sentences-de.json'
OLD_XLSX = ROOT / 'Vokabeln_GreenLine_2021_gesamt.xlsx'
XLSX = ROOT / 'Vokabeln_GreenLine_BW2016_gesamt.xlsx'
BAND = 'Band 2'

HEADER = ['Band', 'Lektion', 'Englisch', 'Phonetik', 'Deutsch',
          'Beispielsatz (EN)', 'Beispielsatz (DE)']


def norm(s):
    s = unicodedata.normalize('NFKC', s or '').lower().strip()
    s = s.replace('’', "'").replace('‘', "'").replace('…', '...')
    return re.sub(r'\s+', ' ', s)


def read_pdf():
    rows = []
    pdf = pdfplumber.open(PDF)
    for page in pdf.pages:
        for table in page.extract_tables():
            for raw in table:
                cells = [extract.clean_cell(c) for c in raw]
                if len(cells) != 6 or not any(cells):
                    continue
                if cells[0].startswith(('Lektion', 'Vokabular')):
                    continue
                code, part, english, phonetic, german, _ukr = cells
                ipa, unknown = extract.to_ipa(phonetic)
                if unknown:
                    print(f"  unbekannte Phonetik-Zeichen bei {english!r}: {set(unknown)}")
                rows.append({
                    'band': BAND,
                    'lesson': f'{code} {part}'.strip(),
                    'english': english,
                    'phonetic': ipa,
                    'german': german,
                    'example_en': '',
                    'example_de': '',
                })
    return rows


def book_sentences():
    """{normalisiertes Wort: (EN-Satz, DE-Satz)} aus den Buchfotos"""
    en_by_word = {}
    for items in json.loads(BOOK_EN.read_text())['pages'].values():
        for word, sentence in items:
            en_by_word.setdefault(norm(word), (word, sentence))
    de_by_word = {norm(w): s for w, s in json.loads(BOOK_DE.read_text()).items()}
    out = {}
    for key, (word, sentence) in en_by_word.items():
        de = de_by_word.get(key)
        if de:
            out[key] = (sentence, de)
        else:
            print(f"  ohne Uebersetzung, uebersprungen: {word}")
    return out


def old_excel_sentences():
    """Saetze der frueheren 2021er-Excel, exakt (Wort+Deutsch) und nur Wort"""
    exact, by_en = {}, {}
    ws = load_workbook(OLD_XLSX, read_only=True)['Vokabeln']
    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i == 0 or (row[0] or '').strip() != BAND:
            continue
        en, de, ex_en, ex_de = (str(row[i] or '').strip() for i in (2, 4, 5, 6))
        if not (en and ex_en and ex_de):
            continue
        exact.setdefault((norm(en), norm(de)), (ex_en, ex_de))
        by_en.setdefault(norm(en), []).append((ex_en, ex_de))
    return exact, by_en


def fill_sentences(rows):
    book = book_sentences()
    exact, by_en = old_excel_sentences()
    from_book = from_old = 0
    for r in rows:
        key = norm(r['english'])
        pair = book.get(key)
        if pair:
            from_book += 1
        else:
            pair = exact.get((key, norm(r['german'])))
            if not pair:
                candidates = {p for p in by_en.get(key, [])}
                pair = candidates.pop() if len(candidates) == 1 else None
            if pair:
                from_old += 1
        if pair:
            r['example_en'], r['example_de'] = pair
    return from_book, from_old


def write_excel(band2):
    """Aktuelle Excel lesen, Band 2 ersetzen, in Buchreihenfolge speichern"""
    ws_old = load_workbook(XLSX, read_only=True)['Vokabeln']
    others = []
    for i, row in enumerate(ws_old.iter_rows(values_only=True)):
        if i == 0:
            continue
        values = [str(c or '').strip() for c in row[:7]]
        if values[0] != BAND:
            others.append(values)

    wb = Workbook()
    ws = wb.active
    ws.title = 'Vokabeln'
    ws.append(HEADER)
    bands = sorted({r[0] for r in others} | {BAND})
    for band in bands:
        if band == BAND:
            for r in band2:
                ws.append([r['band'], r['lesson'], r['english'], r['phonetic'],
                           r['german'], r['example_en'], r['example_de']])
        else:
            for r in others:
                if r[0] == band:
                    ws.append(r)
    for col, width in zip('ABCDEFG', (10, 12, 30, 24, 40, 45, 45)):
        ws.column_dimensions[col].width = width
    wb.save(XLSX)
    return len(others)


if __name__ == '__main__':
    rows = read_pdf()
    print(f'{len(rows)} Zeilen aus {PDF.name} gelesen.')
    from_book, from_old = fill_sentences(rows)
    ohne = sum(1 for r in rows if not r['example_en'])
    print(f'Saetze: {from_book} aus dem Schulbuch, {from_old} aus der 2021er-Excel, {ohne} offen.')
    kept = write_excel(rows)
    print(f'{XLSX.name}: {len(rows)} Zeilen Band 2 + {kept} Zeilen der uebrigen Baende.')
