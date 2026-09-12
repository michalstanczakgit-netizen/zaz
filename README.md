# 3D Web Roguelike

Prosta, kompletna gra 3D typu roguelike stworzona w całości przy użyciu HTML, CSS, JavaScript oraz biblioteki Three.js (ładowanej przez CDN).

## Opis gry
Wcielasz się w postać uwięzioną w losowo generowanym lochu. Twoim zadaniem jest znalezienie przejścia na kolejny poziom (niebieski podest w ostatnim pokoju). W trakcie eksploracji napotkasz przeciwników (czerwone sześciany), których musisz unikać lub pokonać. 
Gra zawiera system poziomów (zdobywaj XP za pokonywanie wrogów) i wybór ulepszeń. Zbieraj również przedmioty (kolorowe klocki), które przywracają punkty zdrowia lub trwale zwiększają statystyki.

## Sterowanie
*   **W, A, S, D** - Poruszanie się.
*   **Myszka** - Obrót postaci (celowanie).
*   **Lewy przycisk myszy (lub Spacja)** - Atak przed siebie.

## Jak zagrać lokalnie?
Projekt nie wymaga serwera deweloperskiego (Node.js itp.).
1. Pobierz repozytorium lub skopiuj pliki `index.html`, `style.css` i `game.js` do jednego folderu.
2. Otwórz plik `index.html` w dowolnej nowoczesnej przeglądarce internetowej (Chrome, Firefox, Edge).
3. Gotowe!

## Jak opublikować na GitHub Pages?
1. Utwórz nowe darmowe repozytorium na swoim koncie na GitHubie (np. `moj-roguelike`).
2. Wgraj do niego wszystkie 3 pliki: `index.html`, `style.css` oraz `game.js`.
3. Przejdź do zakładki **Settings** (Ustawienia) w swoim repozytorium.
4. Z lewego menu wybierz sekcję **Pages**.
5. W podsekcji **Build and deployment**, dla ustawienia *Source* wybierz opcję `Deploy from a branch`.
6. W ustawieniu *Branch* wybierz główną gałąź (zazwyczaj `main` lub `master`), a folder ustaw na `/ (root)` i kliknij **Save**.
7. Odczekaj kilka minut. GitHub Pages wygeneruje publiczny link do Twojej gry, który pojawi się w zakładce Pages (np. `https://twoj-nick.github.io/moj-roguelike/`).
