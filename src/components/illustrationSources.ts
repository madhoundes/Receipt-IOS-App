// "Steady" motion set from the design: shapes never morph, only move, scale and fade.
export const SOURCES = {
  hero: require('../../assets/lottie/steady_hero_scan.json'),
  emptyReceipts: require('../../assets/lottie/steady_empty_receipts.json'),
  allCaughtUp: require('../../assets/lottie/steady_all_caught_up.json'),
  noResults: require('../../assets/lottie/steady_no_results.json'),
  noData: require('../../assets/lottie/steady_no_data.json'),
  exportReady: require('../../assets/lottie/steady_export_ready.json'),
  scanFailed: require('../../assets/lottie/steady_scan_failed.json'),
  cameraDenied: require('../../assets/lottie/steady_camera_denied.json'),
  syncFailed: require('../../assets/lottie/steady_sync_failed.json'),
};
export type IllustrationName = keyof typeof SOURCES;
