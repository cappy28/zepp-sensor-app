// page/index.js
// Interface principale affichée sur la montre Amazfit Bip 6
// Collecte les données capteurs et les envoie vers le téléphone

import { createWidget, widget, align, prop, text_style } from '@zos/ui';
import { HeartRate } from '@zos/sensor';
import { Pedometer } from '@zos/sensor';
import { messageBuilder } from '@zos/router';
import { timer } from '@zos/timer';
import { px } from '@zos/utils';

// ─────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────

// Résolution écran Bip 6
const SCREEN_W = 194;
const SCREEN_H = 368;

// Intervalle d'envoi des données vers le téléphone (en ms)
// 5000 = toutes les 5 secondes (bon équilibre batterie / fraîcheur)
const SEND_INTERVAL_MS = 5000;

// ─────────────────────────────────────────────────────────────
// ÉTAT GLOBAL DE LA PAGE
// ─────────────────────────────────────────────────────────────

// Widgets UI (références pour mise à jour)
let wStatus = null;
let wHeartValue = null;
let wStepsValue = null;
let wLastSent = null;

// Instances des capteurs
let heartRateSensor = null;
let pedometerSensor = null;

// Données collectées en temps réel
let currentData = {
  heartRate: 0,
  steps: 0,
  timestamp: 0
};

// Timer d'envoi périodique
let sendTimer = null;

// Compteur d'envois réussis (pour debug)
let sendCount = 0;

// ─────────────────────────────────────────────────────────────
// CYCLE DE VIE DE LA PAGE
// ─────────────────────────────────────────────────────────────

Page({
  onInit() {
    console.log('[SensorBridge] Page initialisée');
    buildUI();
    initSensors();
    startSending();
  },

  onDestroy() {
    console.log('[SensorBridge] Page détruite — nettoyage');
    stopSending();
    stopSensors();
  }
});

// ─────────────────────────────────────────────────────────────
// CONSTRUCTION DE L'INTERFACE
// ─────────────────────────────────────────────────────────────

function buildUI() {
  // ── Titre ──
  createWidget(widget.TEXT, {
    x: 0,
    y: 20,
    w: SCREEN_W,
    h: 35,
    text: 'SENSOR BRIDGE',
    text_size: 16,
    color: 0xFFFFFF,
    align_h: align.CENTER_H,
    text_style: text_style.NONE
  });

  // ── Statut de connexion ──
  wStatus = createWidget(widget.TEXT, {
    x: 0,
    y: 58,
    w: SCREEN_W,
    h: 26,
    text: '● EN ATTENTE',
    text_size: 12,
    color: 0xFFAA00,   // Orange = en attente
    align_h: align.CENTER_H
  });

  // ── Séparateur ──
  createWidget(widget.FILL_RECT, {
    x: 30,
    y: 90,
    w: SCREEN_W - 60,
    h: 1,
    color: 0x333333
  });

  // ── Label fréquence cardiaque ──
  createWidget(widget.TEXT, {
    x: 0,
    y: 102,
    w: SCREEN_W,
    h: 20,
    text: 'FREQUENCE CARDIAQUE',
    text_size: 10,
    color: 0x888888,
    align_h: align.CENTER_H
  });

  // ── Valeur BPM ──
  wHeartValue = createWidget(widget.TEXT, {
    x: 0,
    y: 124,
    w: SCREEN_W,
    h: 52,
    text: '--',
    text_size: 44,
    color: 0xFF3355,   // Rouge cardiaque
    align_h: align.CENTER_H
  });

  createWidget(widget.TEXT, {
    x: 0,
    y: 178,
    w: SCREEN_W,
    h: 18,
    text: 'bpm',
    text_size: 13,
    color: 0xFF3355,
    align_h: align.CENTER_H
  });

  // ── Séparateur ──
  createWidget(widget.FILL_RECT, {
    x: 30,
    y: 204,
    w: SCREEN_W - 60,
    h: 1,
    color: 0x333333
  });

  // ── Label pas ──
  createWidget(widget.TEXT, {
    x: 0,
    y: 214,
    w: SCREEN_W,
    h: 20,
    text: 'PAS DU JOUR',
    text_size: 10,
    color: 0x888888,
    align_h: align.CENTER_H
  });

  // ── Valeur pas ──
  wStepsValue = createWidget(widget.TEXT, {
    x: 0,
    y: 236,
    w: SCREEN_W,
    h: 42,
    text: '0',
    text_size: 36,
    color: 0x44AAFF,   // Bleu
    align_h: align.CENTER_H
  });

  createWidget(widget.TEXT, {
    x: 0,
    y: 280,
    w: SCREEN_W,
    h: 18,
    text: 'pas',
    text_size: 13,
    color: 0x44AAFF,
    align_h: align.CENTER_H
  });

  // ── Séparateur ──
  createWidget(widget.FILL_RECT, {
    x: 30,
    y: 305,
    w: SCREEN_W - 60,
    h: 1,
    color: 0x333333
  });

  // ── Dernier envoi ──
  wLastSent = createWidget(widget.TEXT, {
    x: 0,
    y: 314,
    w: SCREEN_W,
    h: 40,
    text: `Envoi toutes les ${SEND_INTERVAL_MS / 1000}s`,
    text_size: 11,
    color: 0x555555,
    align_h: align.CENTER_H
  });
}

// ─────────────────────────────────────────────────────────────
// GESTION DES CAPTEURS
// ─────────────────────────────────────────────────────────────

function initSensors() {
  // ── Capteur fréquence cardiaque ──
  try {
    heartRateSensor = new HeartRate();

    // Démarrer la mesure en continu
    heartRateSensor.start();

    // Callback déclenché à chaque nouvelle valeur
    heartRateSensor.onCurrentChange(() => {
      const bpm = heartRateSensor.getCurrent();

      // Ignorer les valeurs nulles ou aberrantes (montre pas portée)
      if (bpm > 0 && bpm < 250) {
        currentData.heartRate = bpm;

        // Mettre à jour l'affichage immédiatement
        if (wHeartValue) {
          wHeartValue.setProperty(prop.TEXT, String(bpm));
        }
        console.log(`[Capteur] Fréquence cardiaque : ${bpm} bpm`);
      }
    });

    console.log('[Capteur] HeartRate initialisé');
  } catch (e) {
    console.log('[Capteur] Erreur HeartRate:', e.message);
  }

  // ── Capteur podomètre ──
  try {
    pedometerSensor = new Pedometer();

    pedometerSensor.onStepChange(() => {
      const steps = pedometerSensor.getSteps();
      currentData.steps = steps;

      if (wStepsValue) {
        wStepsValue.setProperty(prop.TEXT, String(steps));
      }
      console.log(`[Capteur] Pas : ${steps}`);
    });

    console.log('[Capteur] Pedometer initialisé');
  } catch (e) {
    console.log('[Capteur] Erreur Pedometer:', e.message);
  }
}

function stopSensors() {
  try {
    if (heartRateSensor) {
      heartRateSensor.stop();
      heartRateSensor = null;
    }
  } catch (e) {
    console.log('[Capteur] Erreur arrêt HeartRate:', e.message);
  }
}

// ─────────────────────────────────────────────────────────────
// ENVOI DES DONNÉES VERS LE TÉLÉPHONE
// ─────────────────────────────────────────────────────────────

function sendData() {
  // Timestamp au moment de l'envoi
  currentData.timestamp = Date.now();

  // Payload JSON à envoyer
  const payload = {
    heartRate: currentData.heartRate,
    steps: currentData.steps,
    timestamp: currentData.timestamp
  };

  console.log('[Bridge] Envoi :', JSON.stringify(payload));

  // Envoi via le message bridge officiel Zepp OS
  // messageBuilder.request() envoie vers app-side/index.js sur le téléphone
  messageBuilder
    .request(payload, { timeout: 3000 })
    .then((response) => {
      // Le téléphone a confirmé la réception
      sendCount++;
      console.log(`[Bridge] Envoi #${sendCount} confirmé :`, JSON.stringify(response));

      // Mettre le statut en vert
      if (wStatus) {
        wStatus.setProperty(prop.TEXT, '● ACTIF');
        wStatus.setProperty(prop.COLOR, 0x00FF88);
      }

      // Afficher l'heure du dernier envoi réussi
      if (wLastSent) {
        const d = new Date(currentData.timestamp);
        const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        wLastSent.setProperty(prop.TEXT, `Dernier envoi : ${timeStr}`);
        wLastSent.setProperty(prop.COLOR, 0x008844);
      }
    })
    .catch((err) => {
      // Erreur BLE ou timeout — le téléphone est peut-être hors portée
      console.log('[Bridge] Erreur envoi :', err);

      if (wStatus) {
        wStatus.setProperty(prop.TEXT, '⚠ HORS PORTEE');
        wStatus.setProperty(prop.COLOR, 0xFF8800);
      }
    });
}

function startSending() {
  // Premier envoi immédiat
  sendData();

  // Envois périodiques
  sendTimer = timer.createTimer(
    SEND_INTERVAL_MS,      // Délai avant premier tick
    SEND_INTERVAL_MS,      // Intervalle entre les ticks
    sendData               // Fonction appelée à chaque tick
  );

  console.log(`[Bridge] Timer démarré (intervalle : ${SEND_INTERVAL_MS}ms)`);
}

function stopSending() {
  if (sendTimer) {
    timer.stopTimer(sendTimer);
    sendTimer = null;
    console.log('[Bridge] Timer arrêté');
  }
}

// ─────────────────────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────────────────────

// Padding zéro pour l'affichage de l'heure (ex: 9 → "09")
function pad(n) {
  return n < 10 ? '0' + n : String(n);
}
