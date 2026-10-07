/* =========================================================
   RENDU — génère le DOM de la page à partir de data/content.js
   ========================================================= */
(function () {
  "use strict";

  var D = window.SITE_CONTENT;

  if (!D) {
    document.getElementById("footerText").textContent =
      "Erreur : data/content.js introuvable.";
    return;
  }

  var FILTER_LABELS = {
    web: "Web",
    emailing: "Emailing",
    tools: "Outils",
    mobile: "Mobile",
    desktop: "Desktop",
    api: "API"
  };

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function txt(tag, cls, value) {
    var n = el(tag, cls);
    n.textContent = value == null ? "" : value;
    return n;
  }

  // support du gras via **texte**
  function rich(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  }

  function fill(id, nodes) {
    var host = document.getElementById(id);
    if (!host) return;
    host.textContent = "";
    nodes.forEach(function (n) { if (n) host.appendChild(n); });
  }

  function fullName(p) {
    return [p.nom, p.prenom, p.postnom].filter(Boolean).join(" ");
  }

  /* ---------- Références SEO ---------- */
  if (D.meta) {
    if (D.meta.title) document.title = D.meta.title;
    var md = document.querySelector('meta[name="description"]');
    if (md && D.meta.description) md.setAttribute("content", D.meta.description);
  }

  var P = D.profile || {};

  /* ---------- Hero ---------- */
  fill("heroTitle", [
    el("span", null, rich(P.nom || "")),
    el("br"),
    el("span", "grad", rich(P.prenom || "")),
    el("span", null, " " + (P.postnom || ""))
  ]);

  var heroText = document.getElementById("heroText");
  if (heroText) heroText.textContent = P.intro || "";

  var heroPhoto = document.getElementById("heroPhoto");
  if (heroPhoto) {
    heroPhoto.src = P.photo || "assets/profile.jpg";
    heroPhoto.alt = "Portrait de " + fullName(P);
  }

  fill("heroMeta", (P.stats || []).map(function (s) {
    var wrap = el("div");
    wrap.appendChild(txt("strong", null, s.value));
    wrap.appendChild(txt("span", null, s.label));
    return wrap;
  }));

  fill("heroBadges", (P.badges || []).map(function (b, i) {
    return txt("div", "photo-badge badge-" + ((i % 4) + 1), b);
  }));

  /* ---------- À propos ---------- */
  var A = D.about || {};
  var aboutNodes = [];
  (A.paragraphs || []).forEach(function (p) {
    aboutNodes.push(el("p", null, rich(p)));
  });
  if ((A.highlights || []).length) {
    var ul = el("ul", "about-list");
    (A.highlights || []).forEach(function (h) {
      ul.appendChild(txt("li", null, h));
    });
    aboutNodes.push(ul);
  }
  fill("aboutText", aboutNodes);

  var infoData = [
    { label: "Nom", value: fullName(P) },
    { label: "Téléphone", value: P.phone, href: P.phone ? "tel:" + String(P.phone).replace(/\s/g, "") : "" },
    { label: "WhatsApp", value: P.whatsapp, href: P.whatsapp ? "https://wa.me/" + String(P.whatsapp).replace(/[^0-9]/g, "") : "" },
    { label: "Email", value: P.email, href: P.email ? "mailto:" + P.email : "" },
    { label: "Langues", value: (A.languages || []).join(" · ") }
  ];

  fill("aboutInfo", infoData.filter(function (i) { return i.value; }).map(function (i) {
    var card = el("div", "info-card glass");
    card.appendChild(txt("span", "info-label", i.label));
    if (i.href) {
      var a = txt("a", "info-value", i.value);
      a.href = i.href;
      if (i.href.indexOf("http") === 0) { a.target = "_blank"; a.rel = "noopener"; }
      card.appendChild(a);
    } else {
      card.appendChild(txt("span", "info-value", i.value));
    }
    return card;
  }));

  /* ---------- Compétences ---------- */
  var S = D.skills || {};
  fill("skillsCards", (S.cards || []).map(function (c) {
    var card = el("article", "skill-card glass reveal");
    card.appendChild(el("div", "skill-icon", rich(c.icon || "•")));
    card.appendChild(txt("h3", null, c.title));
    var chips = el("div", "chips");
    (c.chips || []).forEach(function (ch) { chips.appendChild(txt("span", null, ch)); });
    card.appendChild(chips);
    return card;
  }));

  fill("skillsBars", (S.bars || []).map(function (b) {
    var row = el("div", "bar");
    row.appendChild(txt("span", "bar-label", b.label));
    var track = el("div", "bar-track");
    var bar = el("i");
    bar.style.setProperty("--w", Math.max(0, Math.min(100, Number(b.value) || 0)) + "%");
    track.appendChild(bar);
    row.appendChild(track);
    return row;
  }));

  /* ---------- Expérience ---------- */
  fill("timeline", (D.experience || []).map(function (x) {
    var item = el("article", "tl-item reveal");
    item.appendChild(el("div", "tl-dot"));
    var body = el("div", "tl-body glass");

    var top = el("div", "tl-top");
    top.appendChild(txt("span", "tl-date", x.date));
    top.appendChild(txt("span", "tl-tag" + (x.current ? " current" : ""), x.tag || (x.current ? "Poste actuel" : "")));
    body.appendChild(top);

    body.appendChild(txt("h3", null, x.title));
    if (x.company) body.appendChild(txt("p", "tl-company", x.company));
    if (x.stack) body.appendChild(txt("p", "tl-stack", x.stack));

    if ((x.bullets || []).length) {
      var ul = el("ul");
      x.bullets.forEach(function (b) { ul.appendChild(txt("li", null, b)); });
      body.appendChild(ul);
    }
    item.appendChild(body);
    return item;
  }));

  /* ---------- Projets ---------- */
  var projects = D.projects || [];

  var filters = ["all"];
  projects.forEach(function (p) {
    if (p.filter && filters.indexOf(p.filter) === -1) filters.push(p.filter);
  });

  fill("filters", filters.map(function (f, i) {
    var label = f === "all" ? "Tous" : (FILTER_LABELS[f] || f.charAt(0).toUpperCase() + f.slice(1));
    var b = txt("button", "filter" + (i === 0 ? " active" : ""), label);
    b.type = "button";
    b.dataset.filter = f;
    return b;
  }));

  fill("projectsGrid", projects.map(function (p) {
    var hasUrl = !!p.url;
    var card = el(hasUrl ? "a" : "article", "project glass reveal");
    card.dataset.cat = p.filter || "web";
    if (hasUrl) {
      card.href = p.url;
      card.target = "_blank";
      card.rel = "noopener";
    }

    var top = el("div", "project-top");
    top.appendChild(txt("span", "project-cat", p.tag || ""));
    top.appendChild(txt("span", "arrow", hasUrl ? "↗" : "·"));
    card.appendChild(top);

    card.appendChild(txt("h3", null, p.name));
    card.appendChild(txt("p", null, p.description));

    if ((p.stack || []).length) {
      var chips = el("div", "chips sm");
      p.stack.forEach(function (s) { chips.appendChild(txt("span", null, s)); });
      card.appendChild(chips);
    }
    return card;
  }));

  /* ---------- Formation ---------- */
  fill("eduGrid", (D.education || []).map(function (e) {
    var card = el("article", "edu-card glass reveal");
    card.appendChild(txt("span", "edu-year", e.year));
    card.appendChild(txt("h3", null, e.title));
    if (e.school) card.appendChild(txt("p", "edu-school", e.school));
    if (e.field) card.appendChild(txt("p", "edu-field", e.field));
    return card;
  }));

  /* ---------- Pied de page ---------- */
  var foot = document.getElementById("footerText");
  if (foot) {
    foot.appendChild(document.createTextNode("© "));
    var year = el("span");
    year.id = "year";
    foot.appendChild(year);
    foot.appendChild(document.createTextNode(
      " " + fullName(P) + (P.jobTitle ? " — " + P.jobTitle : "") + "."
    ));
  }
})();
