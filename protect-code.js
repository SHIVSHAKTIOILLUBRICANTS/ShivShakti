/* ============================================
   SSOL Website — Code Protection Script
   Blocks right-click, view-source & common
   DevTools shortcuts, and when DevTools is
   detected as open, replaces the page with a
   guard character + a "wait" message.

   NOTE (important, please read):
   Ye 100% foolproof nahi hai. Browser ko HTML/
   CSS/JS chalane ke liye woh code download karna
   hi padta hai, isliye koi bhi determined user
   (browser settings badal ke, ya DevTools ko
   "undock" karke) is detection ko bypass kar
   sakta hai. Ye sirf casual/curious visitors ko
   rokta hai — jo 99% traffic hota hai.
   ============================================ */

(function () {
  var GUARD_IMAGE = "assets/guard-character.png"; // adjust path if needed
  var GUARD_MESSAGE = "Ruko zara, thoda sabar karo!";
  var GUARD_SUBTEXT = "Yeh page abhi dekhne ke liye nahi hai.";

  // 1. Disable right-click context menu
  document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
  });

  // 2. Disable common DevTools / view-source / save-page shortcuts
  document.addEventListener("keydown", function (e) {
    var k = e.key ? e.key.toLowerCase() : "";
    if (k === "f12") { e.preventDefault(); return false; }
    if (e.ctrlKey && e.shiftKey && ["i", "j", "c"].indexOf(k) !== -1) {
      e.preventDefault();
      return false;
    }
    if (e.ctrlKey && (k === "u" || k === "s")) {
      e.preventDefault();
      return false;
    }
  });

  // 3. Build the guard overlay (hidden until triggered)
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
  // Script is placed near the end of <body>, so the DOM is already
  // parsed by the time this runs — append directly instead of
  // waiting for an event that has likely already fired.
  if (document.body) {
    document.body.appendChild(overlay);
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      document.body.appendChild(overlay);
    });
  }

  // 4. DevTools-open detector — shows the guard overlay instead of
  //    fully destroying the page (so nothing breaks if it's a false
  //    positive, e.g. a very small browser window).
  var threshold = 160;
  var triggered = false;

  function showGuard() {
    if (triggered) return;
    triggered = true;
    var el = document.getElementById("guard-overlay");
    if (el) el.style.display = "flex";
  }

  function hideGuard() {
    triggered = false;
    var el = document.getElementById("guard-overlay");
    if (el) el.style.display = "none";
  }

  setInterval(function () {
    var widthGap = window.outerWidth - window.innerWidth > threshold;
    var heightGap = window.outerHeight - window.innerHeight > threshold;
    if (widthGap || heightGap) {
      showGuard();
    } else {
      hideGuard();
    }
  }, 800);
})();
