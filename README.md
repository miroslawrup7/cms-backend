# CMS Backend

API: Node.js + Express + MongoDB (Mongoose).

## Wymagania
- Node.js 18+
- MongoDB (lokalnie lub Atlas)
- Plik `.env` (patrz sekcja **Konfiguracja**)

## Konfiguracja
1. Zainstaluj zależności:
   ```bash
   cd backend
   npm install
   ```
2. Ustaw zmienne środowiskowe w `.env` (przykładowe klucze):
   - `PORT` (domyślnie 5000)
   - `MONGO_URI`
   - `JWT_SECRET`
   - `CLIENT_ORIGIN` – do CORS (np. `http://localhost:3000`)
   - `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` *(dla powiadomień e‑mail)*
3. (Jeśli używasz lokalnego uploadu) **utwórz katalog** `backend/uploads/` i zapewnij uprawnienia do zapisu.
   - Middleware `middleware/upload.js` zapisuje pliki do `uploads/` (patrz `multer.diskStorage`).
4. Uruchom serwer:
   ```bash
   # dev (np. z nodemon)
   npm run dev

   # prod
   npm start
   ```

Serwer nasłuchuje na `http://localhost:5000` (o ile `PORT` nie wskazuje inaczej).

## Struktura
- `server.js` – Express, CORS, połączenie z MongoDB
- `routes/` – trasy (auth, article, comment, user, admin)
- `controllers/` – logika
- `models/` – modele Mongoose
- `middleware/` – m.in. `auth`, `requireAdmin`, `upload` (multer → `uploads/`)
- `utils/sendEmail.js` – wysyłka maili (SMTP)

## Uwagi dot. CORS
- W `server.js` jest ustawiony `origin: "http://localhost:3000"`.
- Warto podpiąć to pod `CLIENT_ORIGIN` w `.env`, aby rozdzielić dev/prod.

## Bezpieczeństwo (skrót)
- Upewnij się, że ciasteczka JWT mają odpowiednie flagi (`HttpOnly`, `SameSite`, `Secure` w produkcji).
- Sanityzuj treści z użyciem `sanitize-html` (jest w projekcie).
- Ogranicz `multer` (rozmiary/typy plików), jeśli upload jest publiczny.

## CORS (dev/prod)
W `server.js` konfiguracja CORS powinna korzystać ze zmiennej środowiskowej:
```js
app.use(cors({
  origin: process.env.CLIENT_ORIGIN?.split(',').map(s => s.trim()),
  credentials: true
}))
```
Ustaw w `.env`:
```env
# dev
CLIENT_ORIGIN=http://localhost:3000

# prod (wiele adresów rozdzielone przecinkiem)
# CLIENT_ORIGIN=https://twojadomena.pl,https://admin.twojadomena.pl
```
