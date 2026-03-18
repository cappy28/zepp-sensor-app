// app.js
// Point d'entrée principal de SensorBridge
// Gère le cycle de vie global de l'application Zepp OS

App({
  // Appelé une seule fois au lancement de l'app
  onCreate(options) {
    console.log('[SensorBridge] App démarrée', JSON.stringify(options));
  },

  // Appelé quand l'app est détruite (swipe pour fermer, etc.)
  onDestroy() {
    console.log('[SensorBridge] App arrêtée');
  }
});
