# Report Generator Fix Notes

## Problem
Der ANDskincare Report Generator zeigt keine Daten, weil:
1. Die Page ID `103168941408498` im Code stimmt nicht mit der Datenbank überein
2. Die Datenbank verwendet Kundennamen (z.B. "ANDskincare") statt Page IDs

## Lösung
Der Report Generator muss:
1. Den Kundennamen verwenden, um die Page ID aus der Datenbank zu holen
2. ODER die korrekte Page ID für ANDskincare aus der Datenbank abfragen

## Verfügbare Kunden in der Datenbank
- ABDA Apotheken
- ANDskincare
- asphericon
- CASIO G-SHOCK
- CONTIPARK
- famefact GmbH
- fensterart
- GRG Gebäudereiniger
- Heinz Sielmann Stiftung
- Herlitz
- Pelikan
- Reflectives Mineral Make-up
- Vergleich.org
- Vivantes

## Kunde: Renner Kosmetik
Hat zwei Marken:
1. ANDskincare
2. Reflectives Mineral Make-up
