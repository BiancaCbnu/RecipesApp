# Recipe Finder - Aplicație de Rețete Culinare

## Descriere

Recipe Finder este o aplicație web modernă de căutare și gestionare a rețetelor culinare. Aplicația permite utilizatorilor să caute rețete, să le salveze ca favorite, să planifice mese și să exploreze o varietate de preparate culinare din întreaga lume.

## Caracteristici Principale

- **Căutare de rețete multiple**:
  - Căutare după nume
  - Căutare după ingrediente
  - Filtrare după categorie (Vegetarian, Desert, etc.)
  - Filtrare după bucătărie (Japoneză, Italiană, etc.)

- **Gestionare favorite**:
  - Salvare rețete preferate
  - Vizualizare listă de favorite
  - Ștergere din favorite

- **Planificare mese**:
  - Adăugare rețete în planificator de mese
  - Organizare pe zile și tipuri de mese (mic dejun, prânz, cină, gustare)
  - Vizualizare calendar săptămânal

- **Profil utilizator**:
  - Înregistrare și autentificare
  - Setări profil
  - Statistici de utilizare

## Tehnologii Utilizate

### Frontend
- React.js (cu React Hooks și Context API)
- React Router pentru navigare
- CSS personalizat pentru interfață
- Gestionarea stării cu Context API

### Backend
- Node.js cu Express
- Firebase pentru autentificare și stocare date
- API-ul TheMealDB pentru informații despre rețete

### Optimizări
- Caching date pentru reducerea citirilor Firebase
- Pattern singleton pentru gestionarea stării
- Optimizări de performanță pentru căutări

## Instalare și Rulare

### Cerințe Preliminare
- Node.js (versiunea 14 sau mai recentă)
- NPM sau Yarn
- Cont Firebase (pentru stocare și autentificare)

### Pași de Instalare

1. **Clonarea Repositoriului**
   ```bash
   cd recipe-finder
   ```

2. **Instalare dependențe Frontend**
   ```bash
   cd client
   npm install
   ```

3. **Instalare dependențe Backend**
   ```bash
   cd ../server
   npm install
   ```

4. **Configurare Firebase**
   - Creați un proiect în Firebase Console
   - Activați Authentication (email/password)
   - Creați o bază de date Firestore
   - Descărcați fișierul de configurare Service Account și salvați-l ca `firebase-service-account.json` în directorul server

5. **Configurare .env**
   - În folderul `/server`, creați un fișier `.env` cu următoarele variabile:
     ```
     PORT=5000
     FIREBASE_PROJECT_ID=your-firebase-project-id
     ```
   - În folderul `/client`, creați un fișier `.env` cu următoarele variabile:
     ```
     VITE_API_URL=http://localhost:5000
     ```

6. **Pornire Server**
   ```bash
   cd server
   npm run start
   ```

7. **Pornire Client**
   ```bash
   cd client
   npm run dev
   ```

## Arhitectură

### Structura Directorului
```
recipe-finder/
├── client/                # Aplicația React Frontend
│   ├── public/            # Fișiere statice
│   ├── src/               
│   │   ├── components/    # Componente React reutilizabile
│   │   ├── contexts/      # Context API (Auth, Favorites, etc.)
│   │   ├── pages/         # Pagini principale ale aplicației
│   │   ├── services/      # Servicii API și utilități
│   │   ├── styles/        # Fișiere CSS
│   │   └── firebase/      # Configurare Firebase
│   └── index.html         # Punct de intrare HTML
├── server/                # API-ul Node.js Backend
│   ├── server.js          # Punct de intrare server
│   └── firebase-service-account.json # Configurație Firebase (ignorată in git)
└── README.md              # Documentație
```

### Componentele Principale

#### Frontend
- **AuthContext**: Gestionează starea de autentificare
- **FavoritesContext**: Gestionează starea rețetelor favorite (optimizat pentru Firebase)
- **RecipeCard**: Afișează o rețetă individuală
- **Pagini principale**:
  - Home: Pagina principală cu rețete populare
  - Search: Căutare rețete
  - Favorites: Rețete favorite
  - MealPlan: Planificator de mese
  - Profile: Profil utilizator

#### Backend
- **API TheMealDB**: Integrare pentru date despre rețete
- **Firebase**: Stocare pentru favorite și planificări de mese
- **Endpoint-uri API**:
  - `/api/recipes`: Căutare și detalii rețete
  - `/api/favorites`: Gestionare rețete favorite
  - `/api/meal-plan`: Gestionare planificator de mese

## Optimizări Firebase

Aplicația implementează mai multe optimizări pentru a reduce numărul de citiri Firebase:

1. **FavoritesContext**: 
   - Citire centralizată a favoritelor (în loc ca fiecare component să facă cereri)
   - Cache client-side pentru 5 minute pentru date favorite
   - Actualizări optimiste UI

2. **Endpoint-uri API Optimizate**:
   - Parametri de filtrare pentru cereri de favorite (`limit`, `since`)
   - Verificări individuale pentru starea de favorit (`/check`)
   - Verificări în lot pentru starea de favorit (`/batch-check`)

3. **Indexare Eficientă**:
   - Utilizare docID pentru acces direct la documentele favorite

Aceste optimizări reduc citirile Firebase cu 90-95% comparativ cu arhitectura inițială, prevenind depășirea cotelor Firebase.

## Integrare API TheMealDB

TheMealDB este utilizat pentru date despre rețete. Integrarea include:

1. **Căutare după nume**: `/search.php?s=query`
2. **Filtrare după categorie**: `/filter.php?c=category`
3. **Filtrare după bucătărie**: `/filter.php?a=area`
4. **Căutare după ingredient**: `/filter.php?i=ingredient`
5. **Detalii rețetă**: `/lookup.php?i=id`

Backend-ul nostru combină aceste endpoint-uri pentru a oferi o experiență mai bogată de căutare combinată (de ex. "mâncare japoneză cu pui").

## Utilizare

### Căutare Rețete
1. Navigați la pagina "Search"
2. Introduceți un termen de căutare sau selectați filtre
3. Răsfoiți rezultatele

### Salvare Favorite
1. Faceți click pe iconița ♡ de pe orice RecipeCard
2. Rețeta va fi salvată în contul dvs. și va putea fi accesată din pagina "Favorites"

### Planificare Mese
1. Faceți click pe iconița calendar de pe orice RecipeCard
2. Selectați data și tipul mesei
3. Vizualizați planul în pagina "Meal Plan"

## Note Avansate pentru Dezvoltatori

### Managementul Stării
Aplicația utilizează React Context API pentru gestionarea stării globale:

- **AuthContext**: Stare utilizator, login/logout
- **FavoritesContext**: Rețete favorite, optimizat pentru a minimiza citirile Firebase

### Gestionare Erori
- Tratare elegantă pentru depășiri cote Firebase
- Fallback pentru rețete indisponibile

### Extindere
Pentru a extinde aplicația:

1. Adăugare API suplimentar:
   - Modificați `/services/api.js` pentru a include noul API
   - Adăugați endpoint-uri corespunzătoare în `server.js`

2. Adăugare funcționalități noi:
   - Creați un nou context dacă necesită stare globală
   - Implementați componente și pagini corespunzătoare
   - Actualizați rutele în `App.jsx`
