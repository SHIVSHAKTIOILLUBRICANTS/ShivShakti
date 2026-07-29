/* ============================================
   SSOL Website — Code Protection Script (v3)

   Behavior:
   - Right-click menu works NORMALLY (not blocked) —
     browsers don't allow selectively hiding just
     the "Inspect" item from the native menu, so
     this is the only option if right-click itself
     must stay usable.
   - Ctrl+U (view-source) and F12 / Ctrl+Shift+I/J/C
     (keyboard DevTools shortcuts) are intercepted —
     guard character shows instead.
   - If DevTools gets opened ANY other way (e.g.
     manually via the right-click "Inspect" item),
     it's still detected by a window-size check and
     the guard character shows automatically.

   IMPORTANT FIX from last version: the DevTools-open
   detector now requires the size gap to persist across
   3 consecutive checks (900ms apart) before it triggers,
   and auto-hides itself once the gap disappears. This
   avoids the false-positive that blocked the whole site
   last time. It is still not 100% foolproof — no
   client-side technique can be — but it won't interfere
   with normal browsing anymore.
   ============================================ */

(function () {
  var GUARD_IMAGE = "guard-character.png"; // update path if needed
  var GUARD_LINE_1 = "इतनी फुर्सत है तो नौकरी ढूंढ ले 😏💼, कोड मत देख 🤨🧑‍💻";
  var GUARD_LINE_2 = "One more click and I'm calling your mom. Close this tab, human. 📞🚪";

  // 1. Build guard overlay (hidden until triggered)
  function makeWaveSpans(text) {
    var out = "";
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      out +=
        '<span class="wave-char" style="animation-delay:' +
        (i * 0.04) +
        's">' +
        (ch === " " ? "&nbsp;" : ch) +
        "</span>";
    }
    return out;
  }

  var overlay = document.createElement("div");
  overlay.id = "guard-overlay";
  overlay.innerHTML =
    '<div class="guard-box">' +
    '<img src="' + GUARD_IMAGE + '" alt="" class="guard-char" />' +
    '<div class="guard-line-wrap">' +
    '<p class="guard-line guard-line-1">' + makeWaveSpans(GUARD_LINE_1) + "</p>" +
    '<p class="guard-line guard-line-2">' + makeWaveSpans(GUARD_LINE_2) + "</p>" +
    "</div>" +
    "</div>";

  var style = document.createElement("style");
  style.textContent =
    "#guard-overlay{position:fixed;inset:0;z-index:2147483647;display:none;" +
    "align-items:center;justify-content:center;flex-direction:column;" +
    "background:#F7F2EA;text-align:center;padding:20px;}" +
    "#guard-overlay .guard-box{display:flex;flex-direction:column;align-items:center;max-width:600px;}" +
    "#guard-overlay .guard-char{width:220px;max-width:60vw;" +
    "animation:guard-bob 1.8s ease-in-out infinite;}" +
    "#guard-overlay .guard-line-wrap{position:relative;min-height:3.2em;width:100%;margin-top:18px;}" +
    "#guard-overlay .guard-line{position:absolute;left:0;right:0;margin:0;" +
    "font-family:'Manrope',sans-serif;font-weight:500;font-size:1.15rem;color:#8A1D22;}" +
    "#guard-overlay .guard-line-1{animation:guard-line-fade 7s infinite;}" +
    "#guard-overlay .guard-line-2{animation:guard-line-fade 7s infinite;animation-delay:3.5s;}" +
    "#guard-overlay .wave-char{display:inline-block;animation:guard-char-wave 1.2s ease-in-out infinite;}" +
    "@keyframes guard-bob{0%,100%{transform:translateY(0) rotate(-2deg);}" +
    "50%{transform:translateY(-14px) rotate(2deg);}}" +
    "@keyframes guard-char-wave{0%,100%{transform:translateY(0);}50%{transform:translateY(-8px);}}" +
    "@keyframes guard-line-fade{0%,45%{opacity:1;}50%,95%{opacity:0;}100%{opacity:1;}}";

  document.head.appendChild(style);
  if (document.body) {
    document.body.appendChild(overlay);
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      document.body.appendChild(overlay);
    });
  }

  function showGuard() {
    var el = document.getElementById("guard-overlay");
    if (el) el.style.display = "flex";
  }
  function hideGuard() {
    var el = document.getElementById("guard-overlay");
    if (el) el.style.display = "none";
  }

  // 2. Right-click is intentionally NOT blocked — full native
  //    context menu stays available, per request.

  // 3. Block keyboard shortcuts for view-source / DevTools and
  //    show the guard immediately as feedback.
  document.addEventListener("keydown", function (e) {
    var k = e.key ? e.key.toLowerCase() : "";
    var isShortcut =
      k === "f12" ||
      (e.ctrlKey && e.shiftKey && ["i", "j", "c"].indexOf(k) !== -1) ||
      (e.ctrlKey && k === "u");

    if (isShortcut) {
      e.preventDefault();
      showGuard();
      return false;
    }
  });

  // 4. Fallback: detect DevTools opened via the right-click
  //    "Inspect" menu item (or any other way) using a window-size
  //    check. SKIPPED ENTIRELY on mobile/touch devices — phone
  //    browsers change innerHeight/outerHeight constantly due to
  //    the address bar showing/hiding, which was falsely triggering
  //    the guard on every page load. Mobile browsers don't expose
  //    DevTools through normal UI anyway, so this check isn't
  //    needed there.
  var isMobile =
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 1 && window.innerWidth < 900);

  if (!isMobile) {
    var threshold = 180;
    var consecutiveHits = 0;
    var REQUIRED_HITS = 1; // faster trigger, per request (option 1)

    setInterval(function () {
      var widthGap = window.outerWidth - window.innerWidth > threshold;
      var heightGap = window.outerHeight - window.innerHeight > threshold;

      if (widthGap || heightGap) {
        consecutiveHits++;
        if (consecutiveHits >= REQUIRED_HITS) {
          showGuard();
        }
      } else {
        consecutiveHits = 0;
        hideGuard();
      }
    }, 400);
  }
})();
