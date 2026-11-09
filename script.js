(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var LOGO_HANDOFF_MS = 1800;
  var LOGO_REMOVE_MS = 2500;

  function revealHero() {
    var heading = document.querySelector(".hero-name");
    var popup = document.querySelector(".popup-card");
    if (!heading) return;

    requestAnimationFrame(function () {
      heading.classList.add("is-in");
    });

    window.setTimeout(function () {
      if (popup) popup.classList.add("is-in");
    }, 550);
  }

  function runLogoIntro(onDone) {
    var overlay = document.querySelector(".intro-overlay");

    var alreadyPlayed = false;
    try {
      alreadyPlayed = sessionStorage.getItem("keystoneIntroPlayed") === "1";
    } catch (e) {}

    if (!overlay || reduceMotion || alreadyPlayed) {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      onDone();
      return;
    }

    try {
      sessionStorage.setItem("keystoneIntroPlayed", "1");
    } catch (e) {}

    requestAnimationFrame(function () {
      overlay.classList.add("is-visible");
    });

    window.setTimeout(function () {
      overlay.classList.add("is-hidden");
      onDone();
    }, LOGO_HANDOFF_MS);

    window.setTimeout(function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, LOGO_REMOVE_MS);
  }

  function initPopupTilt() {
    var card = document.querySelector(".popup-card");
    if (!card || reduceMotion) return;

    var alreadyPlayed = false;
    try {
      alreadyPlayed = sessionStorage.getItem("keystoneIntroPlayed") === "1";
    } catch (e) {}
    var settleDelay = alreadyPlayed ? 100 : LOGO_HANDOFF_MS + 550 + 900;

    window.setTimeout(function () {
      card.style.transition = "transform 0.2s ease, box-shadow 0.3s ease";
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty("--rx", (py * -6) + "deg");
        card.style.setProperty("--ry", (px * 8) + "deg");
      });
      card.addEventListener("pointerleave", function () {
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      });
    }, settleDelay);
  }

  function runServiceReveal() {
    var cards = Array.prototype.slice.call(document.querySelectorAll(".svc-card-h"));
    if (!cards.length) return;

    if (reduceMotion || !window.IntersectionObserver) {
      cards.forEach(function (c) { c.classList.add("is-in"); });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );

    cards.forEach(function (card, i) {
      card.style.transitionDelay = Math.min(i * 90, 270) + "ms";
      observer.observe(card);
    });
  }

  // ===== Instant estimate: free but email-verified (Keystone n8n backend) =====
  // Step 1: details + unticked consent -> 6-digit code by email. Step 2: code -> "from" prices + audit offer.
  var CALC_API = "https://keystoneconsultancy.app.n8n.cloud/webhook/";
  var CALC_SERVICES = [
    { value: "invoicing", label: "Invoice Automation" },
    { value: "phone", label: "AI Phone Booking" },
    { value: "quotes", label: "Quote Calculator" },
    { value: "reporting", label: "Reporting Dashboard" },
  ];
  var CALC_BANDS = [
    { value: "under500k", label: "Under £500k" },
    { value: "500k-1m", label: "£500k–£1M" },
    { value: "1m-3m", label: "£1M–£3M" },
    { value: "3m-10m", label: "£3M–£10M" },
    { value: "over10m", label: "Over £10M" },
  ];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function gbp(n) { return "£" + Math.round(Number(n) || 0).toLocaleString("en-GB"); }

  // text/plain keeps this a "simple" cross-site request (no CORS preflight).
  function callApi(path, data) {
    return fetch(CALC_API + path, { method: "POST", headers: { "Content-Type": "text/plain;charset=UTF-8" }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().catch(function () { return { ok: false, message: "Something went wrong. Please try again." }; }); })
      .catch(function () { return { ok: false, message: "We could not reach our server. Please check your connection and try again." }; });
  }

  function formStep() {
    var opts = CALC_BANDS.map(function (b) { return '<option value="' + b.value + '">' + b.label + "</option>"; }).join("");
    var svcs = CALC_SERVICES.map(function (s) {
      return '<label class="calc-check"><input type="checkbox" name="services" value="' + s.value + '"> ' + s.label + "</label>";
    }).join("");
    return '<h3 class="quote-modal-title">Get your estimate</h3>' +
      '<p class="quote-modal-subtitle">Free. We email you a 6-digit code to show your prices.</p>' +
      '<form class="calc-form" data-calc-form novalidate>' +
      '<label>Your name<input name="name" autocomplete="name" required></label>' +
      '<label>Business email<input name="email" type="email" autocomplete="email" required></label>' +
      '<label>Company name<input name="company" autocomplete="organization" required></label>' +
      '<label>Annual revenue<select name="revenueBand" required><option value="">Choose…</option>' + opts + "</select></label>" +
      '<fieldset><legend>Which services interest you? (optional)</legend>' + svcs + "</fieldset>" +
      // Honeypot: hidden from people, bots fill it in.
      '<div class="calc-hp" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div>' +
      '<label class="calc-check calc-consent"><input type="checkbox" name="consent"><span>Keystone may email me useful tips and offers (up to 4 emails in the first 3 weeks, then about one a month). I can unsubscribe at any time. Keystone can see if an email is opened or a link is clicked. See our <a href="privacy.html" target="_blank" rel="noopener">privacy notice</a>.</span></label>' +
      '<div class="quote-submit-row"><button type="submit" class="quote-submit">Email me a code</button></div>' +
      '<p class="calc-msg" data-calc-msg role="status"></p></form>';
  }

  function codeStep(email) {
    return '<h3 class="quote-modal-title">Check your email</h3>' +
      '<p class="quote-modal-subtitle">We sent a 6-digit code to ' + esc(email) + '. It lasts 15 minutes.</p>' +
      '<form class="calc-form" data-calc-code novalidate>' +
      '<label>Your code<input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required></label>' +
      '<div class="quote-submit-row"><button type="submit" class="quote-submit">Show my estimate</button></div>' +
      '<p class="calc-msg" data-calc-msg role="status"></p>' +
      '<button type="button" class="calc-link" data-calc-restart>Use a different email</button></form>';
  }

  function resultStep(r) {
    var pk = (r.packages || []).map(function (p) {
      return "<li><strong>" + esc(p.name) + "</strong> from " + gbp(p.from) + "/month</li>";
    }).join("");
    return '<h3 class="quote-modal-title">Your estimate</h3>' +
      '<div class="calc-result">' +
      '<div class="calc-figure"><span>Setup</span><strong>from ' + gbp(r.setupFrom) + "</strong><em>one-off" + (r.services && r.services.length ? ", " + esc(r.services.join(", ")) : "") + "</em></div>" +
      '<div class="calc-figure"><span>Monthly</span><strong>from ' + gbp(r.monthlyFrom) + "</strong><em>" + esc(r.packageName) + " package, monitoring and fixes included</em></div>" +
      "</div>" +
      '<p class="quote-note">' + esc(r.note || "Exact price depends on business size.") + "</p>" +
      '<ul class="calc-packages">' + pk + "</ul>" +
      '<p class="calc-cta">' + esc(r.cta) + "</p>" +
      '<a class="btn btn-primary quote-cta" href="mailto:keystoneconsultancy.co@gmail.com?subject=Finance%20Ops%20Audit">Book my Finance Ops Audit</a>';
  }

  function initCalculator() {
    var overlay = document.querySelector("[data-quote-modal]");
    var triggers = document.querySelectorAll("[data-calc-open]");
    if (!overlay || !triggers.length) return;
    var body = overlay.querySelector("[data-quote-body]");
    var closeBtn = overlay.querySelector("[data-quote-close]");
    var state = { requestId: null, email: null };

    function msg(text, bad) {
      var m = body.querySelector("[data-calc-msg]");
      if (m) { m.textContent = text || ""; m.classList.toggle("is-bad", !!bad); }
    }
    function busy(form, on) {
      var b = form.querySelector("button[type=submit]");
      if (b) { b.disabled = on; b.classList.toggle("is-busy", on); }
    }
    function showForm() {
      body.innerHTML = formStep();
      var form = body.querySelector("[data-calc-form]");
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var fd = new FormData(form);
        var data = {
          name: String(fd.get("name") || "").trim(), email: String(fd.get("email") || "").trim(), company: String(fd.get("company") || "").trim(),
          revenueBand: String(fd.get("revenueBand") || ""), services: fd.getAll("services"), consent: fd.get("consent") === "on", website: String(fd.get("website") || ""),
        };
        if (!data.name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email) || !data.company || !data.revenueBand) {
          msg("Please fill in your name, a valid business email, your company name and annual revenue.", true);
          return;
        }
        busy(form, true); msg("Sending your code…");
        callApi("ks-calc-start", data).then(function (r) {
          busy(form, false);
          if (r && r.ok && r.requestId) { state.requestId = r.requestId; state.email = data.email; showCode(); }
          else msg((r && r.message) || "Something went wrong. Please try again.", true);
        });
      });
    }
    function showCode() {
      body.innerHTML = codeStep(state.email);
      var form = body.querySelector("[data-calc-code]");
      body.querySelector("[data-calc-restart]").addEventListener("click", showForm);
      var input = form.querySelector("input[name=code]");
      if (input) input.focus();
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var code = String(new FormData(form).get("code") || "").replace(/\D/g, "");
        if (code.length !== 6) { msg("Please enter the 6-digit code from the email.", true); return; }
        busy(form, true); msg("Checking…");
        callApi("ks-calc-verify", { requestId: state.requestId, code: code }).then(function (r) {
          busy(form, false);
          if (r && r.ok) body.innerHTML = resultStep(r);
          else msg((r && r.message) || "That code did not work. Please try again.", true);
        });
      });
    }
    function openModal() {
      showForm();
      overlay.hidden = false;
      document.body.classList.add("quote-modal-locked");
      requestAnimationFrame(function () { overlay.classList.add("is-open"); });
    }
    function closeModal() {
      overlay.classList.remove("is-open");
      document.body.classList.remove("quote-modal-locked");
      window.setTimeout(function () { overlay.hidden = true; body.innerHTML = ""; }, reduceMotion ? 0 : 280);
    }
    Array.prototype.forEach.call(triggers, function (t) { t.addEventListener("click", openModal); });
    closeBtn.addEventListener("click", closeModal);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) closeModal(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && overlay.classList.contains("is-open")) closeModal(); });
  }

  function init() {
    runLogoIntro(revealHero);
    initPopupTilt();
    runServiceReveal();
    initCalculator();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
