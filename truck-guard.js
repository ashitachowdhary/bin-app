/**
 * truck-guard.js — EcoRoute
 * Driver-only protection for truckpanel.html
 */

(function () {

    const role = sessionStorage.getItem("eco_role");

    // Not logged in
    if (!role) {
        window.location.replace("signin.html");
        return;
    }

    // Logged in but not driver
    if (role !== "driver") {
        window.location.replace("index.html");
        return;
    }

})();