# Maturita 2027 – desktopová aplikace

Kompaktní Windows aplikace pro sledování přípravy na 25 programátorských a 25 síťových maturitních okruhů.

## Spuštění

Po instalaci závislostí spusť vývojovou verzi příkazem `npm start`.

Instalátor pro Windows vytvoří příkaz `npm run dist`. Výsledný `.exe` soubor bude ve složce `dist`.

Původní webová varianta stále funguje otevřením souboru `index.html`, ale systémové připomínky jsou dostupné pouze v desktopové aplikaci.

## Funkce

- aktuální týden a odpočet do 3. 3. 2027;
- celkový postup všech 50 okruhů;
- vyhledávání a filtrování týdnů;
- karty s rozbalovacím checklistem;
- měsíční milníky a týdenní studijní režim;
- světlý a tmavý vzhled;
- automatické ukládání stavu do `localStorage` prohlížeče.
- systémová denní připomínka ve 20:00;
- pondělní souhrn nového týdne a upozornění na skluz;
- automatické spuštění po přihlášení do Windows;
- běh na pozadí v oznamovací oblasti po zavření okna.

Tlačítkem **Připomínky 20:00** lze ihned ověřit, že systémová upozornění fungují. Aplikaci lze úplně ukončit přes její ikonu v oznamovací oblasti vedle hodin.

Po doplnění názvů do `okruhy_sit.md` je potřeba nahradit dočasné názvy síťových okruhů v poli týdnů v `app.js`.
