/* ============================================
   SSOL Website — Code Protection Script (v2, fixed)

   Fix from last version: pehle wala window-size
   based DevTools detector galat trigger ho raha
   tha aur poori site block kar raha tha. Ab guard
   sirf tab dikhega jab koi ACTUALLY F12 / Ctrl+Shift+I
   / Ctrl+U jaisa shortcut try karega — normal
   browsing (buttons, links, clicks) kabhi block
   nahi hogi.

   NOTE: Ye 100% foolproof nahi hai — koi bhi
   determined user browser settings se DevTools
   khol sakta hai. Ye sirf casual/curious visitors
   ko rokta hai.
   ============================================ */

(function () {
  var GUARD_IMAGE = "guard-character.png"; // update path if needed
  var GUARD_MESSAGE = "Ruko zara, thoda sabar karo!";
  var GUARD_SUBTEXT = "Yeh page abhi dekhne ke liye nahi hai.";
  var AUTO_HIDE_MS = 4000; // guard apne aap hat jayega itne ms baad

  // 1. Right-click disabled (this part is intentional & stays as-is)
  document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
  });

  // 2. Build guard overlay (only shown when explicitly triggered)
  var overlay = document.createElement("div");
  overlay.id = "guard-overlay";
  overlay.innerHTML =
    '<div class="guard-box">' +
    '<img src="' + GUARD_IMAGE + '" alt="" class="guard-char" />' +
    '<p class="guard-msg">' + GUARD_MESSAGE + "</p>" +
    '<p class="guard-sub">' + GUARD_SUBTEXT + "</p>" +
    "</div>";

  var style = document.createElement("style");
  style.textContent =
    "#guard-overlay{position:fixed;inset:0;z-index:2147483647;display:none;" +
    "align-items:center;justify-content:center;flex-direction:column;" +
    "background:#F7F2EA;text-align:center;padding:20px;}" +
    "#guard-overlay .guard-box{display:flex;flex-direction:column;align-items:center;}" +
    "#guard-overlay .guard-char{width:220px;max-width:60vw;" +
    "animation:guard-bob 1.8s ease-in-out infinite;}" +
    "#guard-overlay .guard-msg{font-family:'Fraunces',serif;color:#8A1D22;" +
    "font-size:1.6rem;margin:18px 0 6px;}" +
    "#guard-overlay .guard-sub{font-family:'Manrope',sans-serif;color:#3a3a3a;" +
    "font-size:1rem;opacity:.8;}" +
    "@keyframes guard-bob{0%,100%{transform:translateY(0) rotate(-2deg);}" +
    "50%{transform:translateY(-14px) rotate(2deg);}}";

  document.head.appendChild(style);
  if (document.body) {
    document.body.appendChild(overlay);
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      document.body.appendChild(overlay);
    });
  }

  var hideTimer = null;
  function showGuard() {
    var el = document.getElementById("guard-overlay");
    if (el) el.style.display = "flex";
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(function () {
      if (el) el.style.display = "none";
    }, AUTO_HIDE_MS);
  }

  // 3. Block common DevTools / view-source / save shortcuts AND
  //    show the guard character as visual feedback when tried.
  document.addEventListener("keydown", function (e) {
    var k = e.key ? e.key.toLowerCase() : "";
    var isDevToolsShortcut =
      k === "f12" ||
      (e.ctrlKey && e.shiftKey && ["i", "j", "c"].indexOf(k) !== -1) ||
      (e.ctrlKey && (k === "u" || k === "s"));

    if (isDevToolsShortcut) {
      e.preventDefault();
      showGuard();
      return false;
    }
  });

  // NOTE: window-size-based auto-detection has been REMOVED —
  // it caused false positives that blocked the entire site.
})();
