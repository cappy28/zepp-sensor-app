# SensorBridge — Zepp OS App

Application capteur temps réel pour Amazfit Bip 6.
Envoie la fréquence cardiaque et le nombre de pas vers le téléphone via BLE.

---

## Structure du projet

```
zepp-sensor-app/
├── app.json              ← Manifeste (permissions, config)
├── app.js                ← Point d'entrée
├── page/
│   └── index.js          ← Écran de la montre
├── app-side/
│   └── index.js          ← Service compagnon téléphone
├── utils/
│   └── logger.js         ← Utilitaire de log
└── assets/
    └── raw/
        └── watchface/
            └── icon.png  ← Icône 240x240px
```

---

## Import dans Zepp Studio

1. Ouvre Zepp Studio
2. Fichier → Ouvrir un dossier → Sélectionne ce dossier
3. Zepp Studio détecte automatiquement app.json
4. Le projet s'ouvre dans l'IDE

---

## Build et déploiement

### Simulateur (test rapide)
- Clic sur le bouton ▶ Play en haut à droite
- L'app se lance dans le simulateur Bip 6

### Sur la montre (déploiement réel)
1. Active le mode développeur sur ta Bip 6 :
   - App Zepp → Profil → Bip 6 → À propos
   - Appuie 7 fois sur le numéro de version
   - Note l'adresse IP affichée
2. Dans Zepp Studio → Device → entre l'IP de ta montre
3. Clique sur "Install on Device"

### Générer le ZAB pour soumission
1. Dans Zepp Studio → Build → Build Release
2. Le fichier .zab est généré dans /build/
3. Upload ce fichier sur developer.zepp.com

---

## Configuration

Dans page/index.js, tu peux modifier :

```javascript
const SEND_INTERVAL_MS = 5000;  // Intervalle d'envoi (ms)
// 2000  = 2 secondes  (données fraîches, plus de batterie)
// 5000  = 5 secondes  (équilibre recommandé)
// 10000 = 10 secondes (économie batterie maximale)
```

---

## Données envoyées

Format JSON à chaque intervalle :

```json
{
  "heartRate": 72,
  "steps": 4231,
  "timestamp": 1710758400000
}
```

---

## Intégration dans ton app mobile

```javascript
// Dans ton app React Native / Expo
import { onSensorData, getLatestData } from './app-side/index';

// S'abonner aux données en temps réel
const unsubscribe = onSensorData((data) => {
  console.log('BPM :', data.heartRate);
  console.log('Pas :', data.steps);
});

// Se désabonner quand nécessaire
unsubscribe();
```

---

## Permissions requises

Déclarées dans app.json et à cocher dans le formulaire Zepp Store :
- `device:os.heart_rate` → Fréquence cardiaque
- `device:os.step_counter` → Podomètre

---

## Icône

L'icône fournie (icon.png) est un placeholder 240x240px.
Remplace-la par ta propre icône avant soumission sur le store.
Format requis : PNG 240×240px, fond transparent, forme circulaire.
