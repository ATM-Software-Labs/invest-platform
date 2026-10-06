(function () {
  var forms = Array.prototype.slice.call(document.querySelectorAll("form.sub-form"));
  if (!forms.length) return;
  var M = {
    es: { soon: "Suscripci\u00f3n disponible pronto. Todav\u00eda no se recoge ning\u00fan correo.", pick: "Marca al menos una lista (Markets o INVEST).", consent: "Necesitamos tu aceptaci\u00f3n de la pol\u00edtica de privacidad.", email: "Revisa la direcci\u00f3n de correo.", captcha: "Completa la verificaci\u00f3n anti-bots.", sending: "Enviando\u2026", ok: "Listo. Te hemos enviado un correo para confirmar (rev\u00edsalo tambi\u00e9n en spam). Sin confirmaci\u00f3n no te a\u00f1adimos a ninguna lista.", rate: "Demasiados intentos desde esta conexi\u00f3n. Prueba dentro de una hora.", ts: "La verificaci\u00f3n anti-bots no se ha validado. Int\u00e9ntalo de nuevo.", provider: "El proveedor de correo no responde ahora mismo. Int\u00e9ntalo m\u00e1s tarde.", generic: "No se ha podido completar. Int\u00e9ntalo de nuevo." },
    en: { soon: "Subscription available soon. No email addresses are collected yet.", pick: "Select at least one list (Markets or INVEST).", consent: "Please accept the privacy policy.", email: "Please check the email address.", captcha: "Please complete the anti-bot check.", sending: "Sending\u2026", ok: "Done. We sent you an email to confirm (check spam too). Without confirmation you are not added to any list.", rate: "Too many attempts from this connection. Try again in an hour.", ts: "The anti-bot check failed. Please try again.", provider: "The email provider is not responding right now. Please try later.", generic: "Something went wrong. Please try again." }
  };
  function lang() { return document.documentElement.getAttribute("lang") === "en" ? "en" : "es"; }
  function m(k) { return M[lang()][k]; }
  function show(form, key, kind) {
    var box = form.querySelector(".sub-msg");
    if (!box) return;
    form._msg = key ? { key: key, kind: kind } : null;
    if (!key) { box.hidden = true; box.textContent = ""; return; }
    box.hidden = false;
    box.className = "sub-msg mt-3" + (kind === "ok" ? " is-ok" : kind === "err" ? " is-err" : "");
    box.textContent = m(key);
  }
  function setSoon() {
    forms.forEach(function (f) {
      f.setAttribute("data-state", "soon");
      Array.prototype.forEach.call(f.querySelectorAll("input,button"), function (n) { n.disabled = true; });
      show(f, "soon", "");
    });
  }
  var sitekey = null, tsReady = false;
  function renderWidgets() {
    if (!window.turnstile || !sitekey) return;
    tsReady = true;
    forms.forEach(function (f) {
      var slot = f.querySelector(".ts-slot");
      if (!slot || f._wid != null) return;
      try {
        f._wid = window.turnstile.render(slot, {
          sitekey: sitekey, action: "subscribe", size: "flexible",
          theme: document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark",
          language: lang(),
          callback: function (tok) { f._token = tok; },
          "expired-callback": function () { f._token = null; },
          "error-callback": function () { f._token = null; }
        });
      } catch (e) {}
    });
  }
  window.__investTsLoad = renderWidgets;
  function enable(key) {
    sitekey = key;
    forms.forEach(function (f) { f.setAttribute("data-state", "live"); });
    var s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__investTsLoad";
    s.async = true; s.defer = true;
    document.head.appendChild(s);
  }
  forms.forEach(function (f) {
    f.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (f.getAttribute("data-state") !== "live") { show(f, "soon", ""); return; }
      var email = (f.querySelector('input[name="email"]') || {}).value || "";
      var mk = f.querySelector('input[name="markets"]'), iv = f.querySelector('input[name="invest"]');
      var consent = f.querySelector('input[name="consent"]');
      var hp = f.querySelector('input[name="website"]');
      if (!(mk && mk.checked) && !(iv && iv.checked)) { show(f, "pick", "err"); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) { show(f, "email", "err"); return; }
      if (!consent || !consent.checked) { show(f, "consent", "err"); return; }
      if (!f._token) { show(f, "captcha", "err"); return; }
      var btn = f.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      show(f, "sending", "");
      fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: email.trim(), streams: { markets: !!(mk && mk.checked), invest: !!(iv && iv.checked) }, consent: true, lang: lang(), website: hp ? hp.value : "", token: f._token })
      }).then(function (r) { return r.json().catch(function () { return { ok: false, error: "error" }; }); })
        .catch(function () { return { ok: false, error: "error" }; })
        .then(function (d) {
          if (btn) btn.disabled = false;
          f._token = null;
          try { if (window.turnstile && f._wid != null) window.turnstile.reset(f._wid); } catch (e) {}
          if (d && d.ok) { show(f, "ok", "ok"); var em = f.querySelector('input[name="email"]'); if (em) em.value = ""; return; }
          var e = d && d.error;
          if (e === "not_configured") { setSoon(); return; }
          show(f, e === "rate_limited" ? "rate" : e === "turnstile_failed" ? "ts" : e === "invalid_email" ? "email" : e === "stream_required" ? "pick" : e === "consent_required" ? "consent" : (e === "mail_failed" || e === "provider_unavailable") ? "provider" : "generic", "err");
        });
    });
  });
  document.addEventListener("invest:lang", function () { forms.forEach(function (f) { if (f._msg) show(f, f._msg.key, f._msg.kind); }); });
  setSoon();
  fetch("/api/subscribe/status", { headers: { Accept: "application/json" } })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d && d.enabled && d.sitekey) {
        forms.forEach(function (f) { Array.prototype.forEach.call(f.querySelectorAll("input,button"), function (n) { n.disabled = false; }); show(f, null); });
        enable(d.sitekey);
      }
    })
    .catch(function () {});
})();
