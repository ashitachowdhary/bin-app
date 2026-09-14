/**
 * auth-guard.js — EcoRoute
 * Add as FIRST script in index.html and all citizen pages.
 * Blocks unauthenticated users, sends drivers to their panel,
 * and sends kabadiwalas to their panel.
 */
(function () {
  var role = sessionStorage.getItem('eco_role');
  if (!role) {
    // Not logged in at all → sign in
    window.location.replace('signin.html');
  } else if (role === 'driver') {
    // Driver accidentally landed on a citizen page → send to their panel
    window.location.replace('truckpanel.html');
  } else if (role === 'kabadiwala') {
    // Kabadiwala accidentally landed on a citizen page → send to their panel
    window.location.replace('kabadiwalapanel.html');
  }
})();