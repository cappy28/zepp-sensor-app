// utils/logger.js
// Utilitaire de logging centralisé
// Permet d'activer/désactiver les logs facilement en production

const LOG_LEVEL = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 99
};

// Change ici pour filtrer les logs :
// LOG_LEVEL.DEBUG = tout voir
// LOG_LEVEL.WARN  = seulement avertissements et erreurs
// LOG_LEVEL.NONE  = aucun log (production)
const CURRENT_LEVEL = LOG_LEVEL.DEBUG;

const PREFIX = '[SensorBridge]';

export const logger = {
  debug(msg, data) {
    if (CURRENT_LEVEL <= LOG_LEVEL.DEBUG) {
      console.log(`${PREFIX} DEBUG: ${msg}`, data ? JSON.stringify(data) : '');
    }
  },

  info(msg, data) {
    if (CURRENT_LEVEL <= LOG_LEVEL.INFO) {
      console.log(`${PREFIX} INFO: ${msg}`, data ? JSON.stringify(data) : '');
    }
  },

  warn(msg, data) {
    if (CURRENT_LEVEL <= LOG_LEVEL.WARN) {
      console.log(`${PREFIX} WARN: ${msg}`, data ? JSON.stringify(data) : '');
    }
  },

  error(msg, data) {
    if (CURRENT_LEVEL <= LOG_LEVEL.ERROR) {
      console.log(`${PREFIX} ERROR: ${msg}`, data ? JSON.stringify(data) : '');
    }
  }
};
