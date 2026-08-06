/**
 * truck-guard.js — EcoRoute
 * Add as FIRST script in truckpanel.html.
 * Only drivers can enter. Everyone else is bounced out.
 */
(function () {
  var role = sessionStorage.getItem('eco_role');
  if (!role) {
    // Not logged in → sign in
    window.location.replace('signin.html');
  } else if (role !== 'driver') {
    // Logged in but not a driver → back to citizen home
    window.location.replace('index.html');
  }
})();