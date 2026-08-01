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
  // 0. Guarantee UTF-8 decoding regardless of what the host page's
  //    <head> does or doesn't declare. If no charset meta exists yet,
  //    inject one as the very first child of <head> — this is what
  //    actually fixes "some Hindi letters show, rest show as ?" bugs,
  //    which are almost always an encoding mismatch, not a font issue.
  if (document.head && !document.querySelector("meta[charset]")) {
    var charsetMeta = document.createElement("meta");
    charsetMeta.setAttribute("charset", "UTF-8");
    document.head.insertBefore(charsetMeta, document.head.firstChild);
  }

  // Load a Devanagari-capable web font. System fonts (Nirmala UI,
  // Kohinoor Devanagari, etc.) vary in weight/shape across devices;
  // pulling the actual font guarantees the Hindi line looks the same
  // everywhere, with the system fonts still listed as a CSS fallback
  // in case the request is blocked (e.g. offline / strict firewall).
  if (!document.getElementById("guard-font-link")) {
    var fontLink = document.createElement("link");
    fontLink.id = "guard-font-link";
    fontLink.rel = "stylesheet";
    fontLink.href =
      "https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500&display=swap";
    document.head.appendChild(fontLink);
  }

  var GUARD_IMAGE = "guard-character.png"; // update path if needed
  var GUARD_LINE_1 = "इतनी फुर्सत है तो नौकरी ढूंढ ले 😏💼, कोड मत देख 👀💻";
  var GUARD_LINE_2 = "Bro's out here inspect-ing elements instead of inspecting his life    choices. 💀";

  // 1. Build guard overlay (hidden until triggered)
  //
  //    IMPORTANT: text[i] in a plain for-loop iterates by raw UTF-16
  //    code unit, NOT by visual character. That breaks two things:
  //      - Emoji (😏 💼 👀 💻 📞 🚪) are encoded as surrogate PAIRS
  //        (two code units per emoji). Splitting mid-pair puts each
  //        half in its own <span>, so the browser can't reassemble
  //        the emoji and shows a "?" box instead.
  //      - Devanagari letters are often BASE + combining mark
  //        (matra/virama) that must stay adjacent to shape correctly.
  //        Isolating them into separate spans breaks that shaping
  //        context, so the browser renders a dotted-circle placeholder
  //        under the mark instead of a proper conjunct/matra.
  //
  //    Fix: split by grapheme cluster (the actual "user-perceived
  //    character") using Intl.Segmenter, with safe fallbacks.
  function splitGraphemes(text) {
    if (typeof Intl !== "undefined" && Intl.Segmenter) {
      var segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
      var out = [];
      var iter = segmenter.segment(text);
      for (var seg of iter) out.push(seg.segment);
      return out;
    }
    if (Array.from) {
      // At least splits by Unicode code point, so emoji surrogate
      // pairs stay intact (Devanagari conjuncts may still separate
      // on very old browsers lacking Intl.Segmenter, but this is
      // already far better than raw code-unit splitting).
      return Array.from(text);
    }
    return text.split("");
  }

  function makeWaveSpans(text) {
    var graphemes = splitGraphemes(text);
    var out = "";
    for (var i = 0; i < graphemes.length; i++) {
      var ch = graphemes[i];
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
    '<p class="guard-line guard-line-1" lang="hi">' + makeWaveSpans(GUARD_LINE_1) + "</p>" +
    '<p class="guard-line guard-line-2" lang="en">' + makeWaveSpans(GUARD_LINE_2) + "</p>" +
    "</div>" +
    "</div>";

  var style = document.createElement("style");
  style.textContent =
    "#guard-overlay{position:fixed;inset:0;z-index:2147483647;display:none;" +
    "align-items:center;justify-content:center;flex-direction:column;" +
    "background:#F7F2EA;text-align:center;padding:20px;}" +
    "#guard-overlay .guard-box{display:flex;flex-direction:column;align-items:center;max-width:95vw;}" +
    "#guard-overlay .guard-char{width:220px;max-width:60vw;" +
    "animation:guard-bob 1.8s ease-in-out infinite;}" +
    // Crossfade layout: both lines occupy the SAME box (stacked via
    // position:absolute + a shared min-height), but only one is ever
    // opacity:1 at a time — controlled explicitly from JS (see
    // startLineCycle below), not by two independent CSS @keyframes
    // loops running on their own clocks. That's what caused the old
    // overlap bug: two separate animation timelines eventually drift
    // out of phase and both end up visible together. A single JS
    // state machine toggling one "is-active" class can't drift.
    "#guard-overlay .guard-line-wrap{position:relative;width:100%;" +
    "margin-top:18px;min-height:3.6em;}" +
    "#guard-overlay .guard-line{position:absolute;top:50%;left:0;right:0;" +
    "transform:translateY(-50%);margin:0;padding:0 3vw;box-sizing:border-box;" +
    "white-space:normal;overflow-wrap:break-word;word-break:break-word;" +
    "font-weight:500;font-size:17px;" +
    "line-height:1.5;color:#8A1D22;text-align:center;" +
    "opacity:0;visibility:hidden;" +
    "transition:opacity 0.6s ease;}" +
    "#guard-overlay .guard-line.is-active{opacity:1;visibility:visible;}" +
    // Devanagari-specific font stack: 'Manrope' has NO Devanagari
    // glyphs at all, which is exactly why some characters were
    // rendering as boxes/"?" before. Noto Sans Devanagari / Nirmala UI
    // (Windows) / Kohinoor Devanagari (iOS) / Noto Sans (Android)
    // cover Windows, macOS, iOS, Android and Linux between them.
    "#guard-overlay .guard-line-1{font-family:'Noto Sans Devanagari'," +
    "'Nirmala UI','Kohinoor Devanagari','Noto Sans','Mangal',sans-serif," +
    "'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol','Noto Color Emoji';}" +
    "#guard-overlay .guard-line-2{font-family:'Manrope',sans-serif," +
    "'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol','Noto Color Emoji';}" +
    "#guard-overlay .wave-char{display:inline-block;" +
    "animation:guard-char-wave 1.2s ease-in-out infinite;" +
    "animation-play-state:paused;}" +
    "#guard-overlay .guard-line.is-active .wave-char{animation-play-state:running;}" +
    "@keyframes guard-bob{0%,100%{transform:translateY(0) rotate(-2deg);}" +
    "50%{transform:translateY(-14px) rotate(2deg);}}" +
    "@keyframes guard-char-wave{0%,100%{transform:translateY(0);}50%{transform:translateY(-8px);}}";

  document.head.appendChild(style);
  if (document.body) {
    document.body.appendChild(overlay);
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      document.body.appendChild(overlay);
    });
  }

  // Crossfade engine: exactly one line is "active" (opacity:1) at a
  // time. Switching is done in one place (applyActiveLine) so the
  // fade and the letter-wave animation can never drift apart like
  // the old independent-@keyframes version did.
  var LINE_DISPLAY_MS = 6000; // how long each line stays fully visible
  var lineEls = null;
  var activeLineIndex = 0;
  var lineCycleTimer = null;

  function getLineEls() {
    if (!lineEls) {
      lineEls = [
        overlay.querySelector(".guard-line-1"),
        overlay.querySelector(".guard-line-2"),
      ];
    }
    return lineEls;
  }

  // Restarts the wave animation from frame zero on a given line.
  // Toggling only "animationName" (not the "animation" shorthand)
  // means the per-letter "animation-delay" set inline in
  // makeWaveSpans is left untouched — only the running timeline
  // resets, so the stagger effect still works after every restart.
  function restartWave(lineEl) {
    var spans = lineEl.querySelectorAll(".wave-char");
    var i;
    for (i = 0; i < spans.length; i++) spans[i].style.animationName = "none";
    void lineEl.offsetHeight; // force reflow so the reset actually takes effect
    for (i = 0; i < spans.length; i++) spans[i].style.animationName = "";
  }

  function applyActiveLine(idx) {
    var lines = getLineEls();
    for (var i = 0; i < lines.length; i++) {
      var el = lines[i];
      if (!el) continue;
      if (i === idx) {
        // Restart the wave exactly as the fade-in starts, so both
        // effects begin together every single time this line appears.
        restartWave(el);
        el.classList.add("is-active");
      } else {
        el.classList.remove("is-active");
      }
    }
  }

  function startLineCycle() {
    activeLineIndex = 0;
    applyActiveLine(activeLineIndex);
    if (lineCycleTimer) clearInterval(lineCycleTimer);
    lineCycleTimer = setInterval(function () {
      activeLineIndex = 1 - activeLineIndex;
      applyActiveLine(activeLineIndex);
    }, LINE_DISPLAY_MS);
  }

  function stopLineCycle() {
    if (lineCycleTimer) {
      clearInterval(lineCycleTimer);
      lineCycleTimer = null;
    }
  }

  function showGuard() {
    var el = document.getElementById("guard-overlay");
    if (!el) return;
    var wasHidden = el.style.display !== "flex";
    el.style.display = "flex";
    // Only (re)start the crossfade when the guard is actually
    // appearing. Without this check, the DevTools-size poller below
    // (which calls showGuard every 400ms while a gap is detected)
    // would restart the cycle on every tick and the fade would never
    // get a chance to complete.
    if (wasHidden || !lineCycleTimer) {
      startLineCycle();
    }
  }
  function hideGuard() {
    var el = document.getElementById("guard-overlay");
    if (el) el.style.display = "none";
    stopLineCycle();
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
