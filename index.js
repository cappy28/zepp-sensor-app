// app-side/index.js
// Service compagnon — tourne sur le TÉLÉPHONE dans le contexte de l'app Zepp
// Reçoit les données de la montre et les expose à ton application principale

import { messageBuilder } from '@zos/router';

// ─────────────────────────────────────────────────────────────
// STOCKAGE DES DONNÉES
// ─────────────────────────────────────────────────────────────

// Dernière mesure reçue
let latestData = null;

// Historique circulaire des N dernières mesures
const MAX_HISTORY = 100;
const dataHistory = [];

// Callbacks abonnés (ton app principale peut s'abonner ici)
const subscribers = [];

// ─────────────────────────────────────────────────────────────
// CYCLE DE VIE DU SERVICE
// ─────────────────────────────────────────────────────────────

AppSideService({
  onInit() {
    console.log('[AppSide] Service compagnon démarré');
    setupMessageListener();
  },

  onDestroy() {
    console.log('[AppSide] Service compagnon arrêté');
    subscribers.length = 0;
  }
});

// ─────────────────────────────────────────────────────────────
// ÉCOUTE DES MESSAGES DE LA MONTRE
// ─────────────────────────────────────────────────────────────

function setupMessageListener() {
  // Déclenché à chaque message envoyé par messageBuilder.request() côté montre
  messageBuilder.on('request', (ctx) => {
    const data = ctx.request.payload;

    console.log('[AppSide] Données reçues :', JSON.stringify(data));

    // Valider les données reçues
    if (!isValidData(data)) {
      console.log('[AppSide] Données invalides ignorées');
      ctx.response({ result: 'error', reason: 'invalid_data' });
      return;
    }

    // 1. Stocker les données
    storeData(data);

    // 2. Notifier tous les abonnés (ton app principale)
    notifySubscribers(data);

    // 3. Optionnel : transmettre vers un serveur externe
    // forwardToServer(data);

    // 4. Confirmer la réception à la montre
    // Cela déclenchera le .then() dans messageBuilder.request() côté montre
    ctx.response({
      result: 'ok',
      receivedAt: Date.now(),
      count: dataHistory.length
    });
  });

  console.log('[AppSide] Listener message bridge actif');
}

// ─────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────

function isValidData(data) {
  return (
    data !== null &&
    typeof data === 'object' &&
    typeof data.heartRate === 'number' &&
    typeof data.steps === 'number' &&
    typeof data.timestamp === 'number' &&
    data.timestamp > 0
  );
}

// ─────────────────────────────────────────────────────────────
// STOCKAGE
// ─────────────────────────────────────────────────────────────

function storeData(data) {
  latestData = data;

  // Ajouter à l'historique
  dataHistory.push(data);

  // Limiter la taille de l'historique
  if (dataHistory.length > MAX_HISTORY) {
    dataHistory.shift();
  }
}

// ─────────────────────────────────────────────────────────────
// SYSTÈME D'ABONNEMENT (Pub/Sub)
// ─────────────────────────────────────────────────────────────

function notifySubscribers(data) {
  subscribers.forEach((callback) => {
    try {
      callback(data);
    } catch (err) {
      console.log('[AppSide] Erreur dans subscriber :', err);
    }
  });
}

// ─────────────────────────────────────────────────────────────
// API PUBLIQUE — utilisable depuis ton app principale
// ─────────────────────────────────────────────────────────────

/**
 * S'abonner aux nouvelles données capteurs.
 * Retourne une fonction pour se désabonner.
 *
 * Exemple d'utilisation dans ton app :
 *   const unsubscribe = onSensorData((data) => {
 *     console.log('Nouveau BPM :', data.heartRate);
 *   });
 *   // Plus tard :
 *   unsubscribe();
 */
export function onSensorData(callback) {
  subscribers.push(callback);

  return function unsubscribe() {
    const idx = subscribers.indexOf(callback);
    if (idx !== -1) {
      subscribers.splice(idx, 1);
    }
  };
}

/**
 * Récupérer la dernière mesure reçue.
 * Retourne null si aucune donnée n'a encore été reçue.
 */
export function getLatestData() {
  return latestData;
}

/**
 * Récupérer l'historique des mesures (max MAX_HISTORY entrées).
 * Retourne une copie du tableau (pas de référence directe).
 */
export function getHistory() {
  return [...dataHistory];
}

/**
 * Vider l'historique.
 */
export function clearHistory() {
  dataHistory.length = 0;
  latestData = null;
  console.log('[AppSide] Historique vidé');
}

// ─────────────────────────────────────────────────────────────
// OPTIONNEL : Transmission vers serveur externe
// ─────────────────────────────────────────────────────────────

/**
 * Décommente et configure si tu veux envoyer les données
 * vers ton propre backend (API REST, WebSocket, etc.)
 */
// async function forwardToServer(data) {
//   try {
//     const response = await fetch('https://ton-api.com/sensor', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(data)
//     });
//     const result = await response.json();
//     console.log('[AppSide] Serveur :', result);
//   } catch (err) {
//     console.log('[AppSide] Erreur serveur :', err);
//   }
// }
