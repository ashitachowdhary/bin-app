/* =========================================================
   EcoRoute — Driver Pickup Workflow
   ========================================================= */

(function () {
  'use strict';

  const FIREBASE_DB_URL =
    'https://ecoroute-a871a-default-rtdb.firebaseio.com';

  const sessionUser = (() => {
    try {
      return JSON.parse(
        sessionStorage.getItem('eco_user') || '{}'
      );
    } catch (e) {
      return {};
    }
  })();

  const DRIVER_ID = sessionUser.uid || 'unknown-driver';

  const DRIVER_NAME =
    sessionUser.displayName ||
    sessionUser.email ||
    'Current Driver';

  let pickupData = {};
  let pickupBusy = false;


  /* =========================================================
     SAFE HTML
     ========================================================= */

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }


  function formatTime(value) {
    if (!value) return '—';

    const d = new Date(value);

    if (Number.isNaN(d.getTime())) {
      return value;
    }

    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }


  function statusLabel(status) {

    const map = {
      pending: '⏳ Pending',
      assigned: '🚛 Assigned to you',
      on_way: '🛣️ On the way',
      picked_up: '📦 Picked up',
      completed: '✅ Completed'
    };

    return map[status] || '⏳ Pending';
  }


  function statusClass(status) {

    if (status === 'completed') {
      return 'completed';
    }

    if (status === 'picked_up') {
      return 'picked';
    }

    if (status === 'on_way') {
      return 'onway';
    }

    if (status === 'assigned') {
      return 'assigned';
    }

    return 'pending';
  }


  /* =========================================================
     NOTIFICATION
     ========================================================= */

  function notify(msg, type) {

    if (typeof window.toast === 'function') {
      window.toast(
        msg,
        type === 'error' ? 'error' : 'success'
      );

      return;
    }

    const old =
      document.getElementById('driverPickupToast');

    if (old) {
      old.remove();
    }

    const el = document.createElement('div');

    el.id = 'driverPickupToast';

    el.textContent = msg;

    el.style.cssText = `
      position:fixed;
      right:20px;
      bottom:20px;
      z-index:99999;
      background:#1a2a1e;
      color:#fff;
      padding:12px 16px;
      border-radius:10px;
      font:600 13px DM Sans,Arial,sans-serif;
      box-shadow:0 8px 30px rgba(0,0,0,.18);
    `;

    document.body.appendChild(el);

    setTimeout(() => {
      el.remove();
    }, 2600);
  }


  /* =========================================================
     STYLES
     ========================================================= */

  function injectStyles() {

    if (
      document.getElementById(
        'driverPickupStyles'
      )
    ) {
      return;
    }

    const style =
      document.createElement('style');

    style.id = 'driverPickupStyles';

    style.textContent = `

      .driver-pickup-section {
        margin:20px;
        background:#fff;
        border:1px solid #e6ede9;
        border-radius:16px;
        overflow:hidden;
        box-shadow:0 4px 18px rgba(20,50,30,.05);
      }

      .driver-pickup-head {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        padding:18px 20px;
        border-bottom:1px solid #e6ede9;
      }

      .driver-pickup-title {
        display:flex;
        align-items:center;
        gap:11px;
      }

      .driver-pickup-icon {
        width:40px;
        height:40px;
        display:grid;
        place-items:center;
        border-radius:12px;
        background:#e8f5ee;
        font-size:21px;
      }

      .driver-pickup-title h2 {
        margin:0;
        font-size:17px;
        color:#1a2a1e;
      }

      .driver-pickup-title p {
        margin:3px 0 0;
        font-size:11px;
        color:#6b7c71;
      }

      .driver-pickup-refresh {
        border:1px solid #dfe9e3;
        background:#f6f8f5;
        color:#1a7a3e;
        padding:8px 12px;
        border-radius:9px;
        cursor:pointer;
        font-weight:700;
      }

      .driver-pickup-stats {
        display:grid;
        grid-template-columns:
          repeat(4,1fr);

        gap:8px;

        padding:12px 20px;

        background:#fafcfb;

        border-bottom:
          1px solid #e6ede9;
      }

      .driver-pickup-stat {
        padding:10px;

        border:
          1px solid #e6ede9;

        border-radius:10px;

        background:#fff;
      }

      .driver-pickup-stat b {
        display:block;

        font-size:20px;

        color:#1a2a1e;
      }

      .driver-pickup-stat span {
        display:block;

        margin-top:2px;

        font-size:9px;

        color:#6b7c71;

        text-transform:uppercase;

        letter-spacing:.5px;
      }

      .driver-pickup-list {
        padding:
          14px 20px 20px;

        display:flex;

        flex-direction:column;

        gap:10px;
      }

      .driver-pickup-card {
        border:
          1px solid #e6ede9;

        border-radius:13px;

        padding:14px;

        background:#fff;
      }

      .driver-pickup-top {
        display:flex;

        justify-content:space-between;

        gap:10px;

        align-items:flex-start;
      }

      .driver-pickup-id {
        font-family:
          'DM Mono',
          monospace;

        font-size:10px;

        color:#6b7c71;

        margin-bottom:4px;
      }

      .driver-pickup-type {
        font-size:15px;

        font-weight:700;

        color:#1a2a1e;
      }

      .driver-pickup-badge {
        flex-shrink:0;

        padding:5px 8px;

        border-radius:20px;

        font-size:9px;

        font-weight:800;

        white-space:nowrap;
      }

      .driver-pickup-badge.pending {
        background:#fff5e8;

        color:#b45309;
      }

      .driver-pickup-badge.assigned {
        background:#eaf2ff;

        color:#2563eb;
      }

      .driver-pickup-badge.onway {
        background:#eef2ff;

        color:#4f46e5;
      }

      .driver-pickup-badge.picked {
        background:#edfdf7;

        color:#047857;
      }

      .driver-pickup-badge.completed {
        background:#e8f5ee;

        color:#1a7a3e;
      }

      .driver-pickup-details {
        display:grid;

        grid-template-columns:
          repeat(2,1fr);

        gap:7px 16px;

        margin-top:12px;
      }

      .driver-pickup-detail {
        font-size:11px;

        color:#6b7c71;
      }

      .driver-pickup-detail strong {
        display:block;

        margin-top:2px;

        color:#1a2a1e;

        font-size:12px;
      }

      .driver-pickup-actions {
        display:flex;

        flex-wrap:wrap;

        gap:7px;

        margin-top:13px;

        padding-top:12px;

        border-top:
          1px solid #eef2ef;
      }

      .driver-pickup-actions button {
        border:0;

        border-radius:9px;

        padding:9px 12px;

        cursor:pointer;

        font:
          700 11px
          'DM Sans',
          sans-serif;
      }

      .dp-accept {
        background:#1a7a3e;
        color:#fff;
      }

      .dp-way {
        background:#eef2ff;
        color:#4338ca;
      }

      .dp-picked {
        background:#edfdf7;
        color:#047857;
      }

      .dp-complete {
        background:#e8f5ee;
        color:#1a7a3e;
      }

      .dp-map {
        background:#f1f5f9;
        color:#334155;
      }

      .driver-pickup-empty {
        padding:30px 10px;

        text-align:center;

        color:#6b7c71;

        font-size:12px;
      }

      .driver-pickup-loading {
        padding:30px 10px;

        text-align:center;

        color:#6b7c71;

        font-size:12px;
      }

      @media(max-width:700px) {

        .driver-pickup-section {
          margin:12px;
        }

        .driver-pickup-head {
          padding:14px;
        }

        .driver-pickup-stats {
          grid-template-columns:
            repeat(2,1fr);

          padding:
            10px 14px;
        }

        .driver-pickup-list {
          padding:
            12px 14px 16px;
        }
      }

    `;

    document.head.appendChild(style);
  }


  /* =========================================================
     CREATE DRIVER PICKUP SECTION
     ========================================================= */

  function createSection() {

    if (
      document.getElementById(
        'driverPickupSection'
      )
    ) {
      return;
    }

    injectStyles();

    const section =
      document.createElement('section');

    section.id =
      'driverPickupSection';

    section.className =
      'driver-pickup-section';


    section.innerHTML = `

      <div class="driver-pickup-head">

        <div class="driver-pickup-title">

          <div class="driver-pickup-icon">
            🚛
          </div>

          <div>

            <h2>
              Citizen Pickup Requests
            </h2>

            <p>
              Live requests from EcoRoute
              citizens · Driver:
              ${esc(DRIVER_NAME)}
            </p>

          </div>

        </div>


        <button
          class="driver-pickup-refresh"
          id="driverPickupRefresh">

          ↻ Refresh

        </button>

      </div>


      <div class="driver-pickup-stats">

        <div class="driver-pickup-stat">

          <b id="dpPending">
            0
          </b>

          <span>
            Pending
          </span>

        </div>


        <div class="driver-pickup-stat">

          <b id="dpMine">
            0
          </b>

          <span>
            My Pickups
          </span>

        </div>


        <div class="driver-pickup-stat">

          <b id="dpActive">
            0
          </b>

          <span>
            Active
          </span>

        </div>


        <div class="driver-pickup-stat">

          <b id="dpDone">
            0
          </b>

          <span>
            Completed
          </span>

        </div>

      </div>


      <div
        class="driver-pickup-list"
        id="driverPickupList">

        <div class="driver-pickup-loading">

          Loading pickup requests…

        </div>

      </div>

    `;


    const target =

      document.querySelector(
        '.main-content'
      ) ||

      document.querySelector(
        '.content'
      ) ||

      document.querySelector(
        '.main'
      ) ||

      document.body;


    target.appendChild(section);


    document
      .getElementById(
        'driverPickupRefresh'
      )
      .addEventListener(
        'click',
        loadPickupRequests
      );
  }


  /* =========================================================
     FIREBASE GET
     ========================================================= */

  async function getNode(node) {

    const res = await fetch(
      `${FIREBASE_DB_URL}/${node}.json`,
      {
        cache:'no-store'
      }
    );


    if (!res.ok) {

      throw new Error(
        `Firebase GET failed: ${res.status}`
      );

    }


    return await res.json() || {};
  }


  /* =========================================================
     FIREBASE UPDATE
     ========================================================= */

  async function updatePickup(
    id,
    patch
  ) {

    if (pickupBusy) {
      return;
    }

    pickupBusy = true;


    try {

      const res = await fetch(

        `${FIREBASE_DB_URL}/pickup_requests/${encodeURIComponent(id)}.json`,

        {
          method:'PATCH',

          headers:{
            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify(patch)
        }

      );


      if (!res.ok) {

        throw new Error(
          `Firebase PATCH failed: ${res.status}`
        );

      }


      notify(
        'Pickup status updated successfully',
        'success'
      );


      await loadPickupRequests();


    } catch (err) {

      console.error(
        'EcoRoute pickup update:',
        err
      );


      notify(
        'Could not update pickup — check Firebase connection/rules',
        'error'
      );


    } finally {

      pickupBusy = false;

    }
  }


  /* =========================================================
     DRIVER ACTIONS
     ========================================================= */

  window.ecoDriverAcceptPickup =
    function (id) {

      updatePickup(

        id,

        {

          status:'assigned',

          assignedDriver:
            DRIVER_ID,

          assignedDriverName:
            DRIVER_NAME,

          assignedAt:
            new Date().toISOString()

        }

      );

    };


  window.ecoDriverOnWay =
    function (id) {

      updatePickup(

        id,

        {

          status:'on_way',

          driverStartedAt:
            new Date().toISOString()

        }

      );

    };


  window.ecoDriverPickedUp =
    function (id) {

      updatePickup(

        id,

        {

          status:'picked_up',

          pickedUpAt:
            new Date().toISOString()

        }

      );

    };


  window.ecoDriverCompletePickup =
    function (id) {

      updatePickup(

        id,

        {

          status:'completed',

          completedAt:
            new Date().toISOString()

        }

      );

    };


  /* =========================================================
     GOOGLE MAPS
     ========================================================= */

  window.ecoDriverOpenMap =
    function (area) {

      const query =
        encodeURIComponent(
          `${area || 'Pathankot'}, India`
        );


      window.open(

        `https://www.google.com/maps/search/?api=1&query=${query}`,

        '_blank'

      );

    };


  /* =========================================================
     RENDER REQUESTS
     ========================================================= */

  function renderPickupRequests() {

    const list =
      document.getElementById(
        'driverPickupList'
      );


    if (!list) {
      return;
    }


    const entries =

      Object.entries(pickupData)

        .map(
          ([id, value]) => ({
            id,
            ...(value || {})
          })
        )

        .filter(
          r =>
            r.status !==
            'cancelled'
        )

        .sort(
          (a,b) => {

            const rank = {

              pending:0,

              assigned:1,

              on_way:2,

              picked_up:3,

              completed:4

            };


            const ar =
              rank[a.status] ??
              9;

            const br =
              rank[b.status] ??
              9;


            if (ar !== br) {
              return ar - br;
            }


            return String(
              b.requestedAt || ''
            ).localeCompare(
              String(
                a.requestedAt || ''
              )
            );

          }
        );


    /* ---------- COUNTERS ---------- */

    const pending =

      entries.filter(
        r =>
          !r.status ||
          r.status ===
          'pending'
      ).length;


    const mine =

      entries.filter(
        r =>
          r.assignedDriver &&
          r.assignedDriver ===
          DRIVER_ID
      ).length;


    const active =

      entries.filter(
        r =>
          r.assignedDriver ===
          DRIVER_ID &&

          [
            'assigned',
            'on_way',
            'picked_up'
          ].includes(
            r.status
          )
      ).length;


    const done =

      entries.filter(
        r =>
          r.status ===
          'completed' &&

          (
            !r.assignedDriver ||

            r.assignedDriver ===
            DRIVER_ID
          )
      ).length;


    document.getElementById(
      'dpPending'
    ).textContent =
      pending;


    document.getElementById(
      'dpMine'
    ).textContent =
      mine;


    document.getElementById(
      'dpActive'
    ).textContent =
      active;


    document.getElementById(
      'dpDone'
    ).textContent =
      done;


    /* ---------- EMPTY ---------- */

    if (!entries.length) {

      list.innerHTML = `

        <div class="driver-pickup-empty">

          <div
            style="
              font-size:30px;
              margin-bottom:8px;
            ">

            📭

          </div>

          No citizen pickup
          requests yet.

          <div
            style="
              margin-top:5px;
              font-size:10px;
            ">

            New requests will appear
            here automatically.

          </div>

        </div>

      `;

      return;
    }


    /* ---------- CARDS ---------- */

    list.innerHTML =

      entries.map(r => {

        const status =
          r.status ||
          'pending';


        const mineRequest =
          r.assignedDriver ===
          DRIVER_ID;


        let actions = '';


        /* PENDING */

        if (
          status ===
          'pending'
        ) {

          actions = `

            <button
              class="dp-accept"
              onclick="
                ecoDriverAcceptPickup(
                  '${esc(r.id)}'
                )
              ">

              ✓ Accept Pickup

            </button>

          `;

        }


        /* ASSIGNED */

        else if (
          mineRequest &&
          status ===
          'assigned'
        ) {

          actions = `

            <button
              class="dp-way"
              onclick="
                ecoDriverOnWay(
                  '${esc(r.id)}'
                )
              ">

              🛣️ Start Pickup

            </button>


            <button
              class="dp-map"
              onclick="
                ecoDriverOpenMap(
                  '${esc(r.area || '')}'
                )
              ">

              📍 Navigate

            </button>

          `;

        }


        /* ON THE WAY */

        else if (
          mineRequest &&
          status ===
          'on_way'
        ) {

          actions = `

            <button
              class="dp-picked"
              onclick="
                ecoDriverPickedUp(
                  '${esc(r.id)}'
                )
              ">

              📦 Mark Picked Up

            </button>


            <button
              class="dp-map"
              onclick="
                ecoDriverOpenMap(
                  '${esc(r.area || '')}'
                )
              ">

              📍 Navigate

            </button>

          `;

        }


        /* PICKED UP */

        else if (
          mineRequest &&
          status ===
          'picked_up'
        ) {

          actions = `

            <button
              class="dp-complete"
              onclick="
                ecoDriverCompletePickup(
                  '${esc(r.id)}'
                )
              ">

              ✓ Complete Pickup

            </button>

          `;

        }


        /* ASSIGNED TO OTHER DRIVER */

        else if (
          status ===
          'assigned' &&
          !mineRequest
        ) {

          actions = `

            <span
              style="
                font-size:10px;
                color:#6b7c71;
              ">

              Assigned to
              ${esc(
                r.assignedDriverName ||
                'another driver'
              )}

            </span>

          `;

        }


        /* COMPLETED */

        else if (
          status ===
          'completed'
        ) {

          actions = `

            <span
              style="
                font-size:10px;
                color:#1a7a3e;
                font-weight:700;
              ">

              Pickup completed

            </span>

          `;

        }


        return `

          <article
            class="driver-pickup-card">


            <div
              class="driver-pickup-top">

              <div>

                <div
                  class="driver-pickup-id">

                  ${esc(r.id)}

                </div>


                <div
                  class="driver-pickup-type">

                  ${esc(
                    r.wasteType ||
                    'General Waste'
                  )}

                </div>

              </div>


              <span
                class="
                  driver-pickup-badge
                  ${statusClass(status)}
                ">

                ${statusLabel(status)}

              </span>

            </div>


            <div
              class="
                driver-pickup-details
              ">


              <div
                class="
                  driver-pickup-detail
                ">

                📍 Area

                <strong>

                  ${esc(
                    r.area || '—'
                  )}

                </strong>

              </div>


              <div
                class="
                  driver-pickup-detail
                ">

                📞 Phone

                <strong>

                  ${esc(
                    r.phone || '—'
                  )}

                </strong>

              </div>


              <div
                class="
                  driver-pickup-detail
                ">

                📝 Description

                <strong>

                  ${esc(
                    r.description ||
                    'No description'
                  )}

                </strong>

              </div>


              <div
                class="
                  driver-pickup-detail
                ">

                🕒 Requested

                <strong>

                  ${esc(
                    formatTime(
                      r.requestedAt
                    )
                  )}

                </strong>

              </div>


            </div>


            ${
              r.assignedDriverName
              ?

              `

              <div
                style="
                  margin-top:9px;
                  padding:8px 10px;
                  border-radius:8px;
                  background:#f6f8f5;
                  font-size:10px;
                  color:#6b7c71;
                ">

                Driver:

                <strong
                  style="
                    color:#1a2a1e;
                  ">

                  ${esc(
                    r.assignedDriverName
                  )}

                </strong>

              </div>

              `

              :

              ''
            }


            ${
              actions

              ?

              `

              <div
                class="
                  driver-pickup-actions
                ">

                ${actions}

              </div>

              `

              :

              ''
            }


          </article>

        `;

      }).join('');

  }


  /* =========================================================
     LOAD PICKUP REQUESTS
     ========================================================= */

  async function loadPickupRequests() {

    try {

      const data =
        await getNode(
          'pickup_requests'
        );


      pickupData =
        data;


      renderPickupRequests();


    } catch (err) {

      console.error(
        'EcoRoute pickup load:',
        err
      );


      const list =
        document.getElementById(
          'driverPickupList'
        );


      if (list) {

        list.innerHTML = `

          <div
            class="driver-pickup-empty"
            style="color:#dc2626">

            ❌ Could not load
            pickup requests.

            <div
              style="
                margin-top:6px;
                font-size:10px;
                color:#6b7c71;
              ">

              Check Firebase
              Realtime Database
              rules and connection.

            </div>

          </div>

        `;

      }

    }

  }


  /* =========================================================
     START
     ========================================================= */

  function start() {

    if (
      sessionStorage.getItem(
        'eco_role'
      ) !== 'driver'
    ) {

      return;

    }


    createSection();


    loadPickupRequests();


    /*
      Refresh every 5 seconds
      so new citizen requests
      appear automatically.
    */

    setInterval(
      loadPickupRequests,
      5000
    );

  }


  /* =========================================================
     DOM READY
     ========================================================= */

  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      start
    );

  } else {

    start();

  }

})();