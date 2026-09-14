/**
 * kabadi-guard.js — EcoRoute
 * Add as FIRST script in kabadiwalapanel.html.
 * Only logged-in kabadiwalas can enter; everyone else is bounced out.
 */
(function () {
  var role = sessionStorage.getItem('eco_role');
  if (!role) {
    window.location.replace('kabadiwala-login.html');
  } else if (role !== 'kabadiwala') {
    window.location.replace('index.html');
  }
})();