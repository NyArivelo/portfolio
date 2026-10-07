/* =========================================================
   ADMIN — CRUD du contenu du portfolio (data/content.js)
   ========================================================= */
(function () {
  "use strict";

  var ORIGINAL = window.SITE_CONTENT;
  var state = null;
  var current = "profile";
  var editing = null; // index en édition pour les listes
  var draft = null;   // copie en cours d'édition
  var dirty = false;
  var fileHandle = null;
  var uid = 0;

  var FILTERS = [
    ["web", "Web"], ["emailing", "Emailing"], ["tools", "Outils"],
    ["mobile", "Mobile"], ["desktop", "Desktop"]
  ];

  /* ---------- Schéma ---------- */
  var SECTIONS = {
    profile: {
      label: "Infos personnelles", type: "object", path: "profile",
      fields: [
        { k: "nom", l: "Nom", t: "text", req: 1 },
        { k: "prenom", l: "Prénom", t: "text" },
        { k: "postnom", l: "Post-nom", t: "text" },
        { k: "jobTitle", l: "Titre / poste", t: "text" },
        { k: "photo", l: "Photo (chemin, ex. assets/profile.jpg)", t: "text" },
        { k: "roles", l: "Rôles (machine à écrire — 1 par ligne)", t: "lines" },
        { k: "intro", l: "Texte de présentation", t: "area" },
        { k: "badges", l: "Badges autour de la photo (1 par ligne)", t: "lines" },
        { k: "stats", l: "Statistiques", t: "repeat", add: "Ajouter une statistique",
          fields: [{ k: "value", l: "Valeur", t: "text" }, { k: "label", l: "Libellé", t: "text" }] },
        { k: "phone", l: "Téléphone", t: "text" },
        { k: "whatsapp", l: "WhatsApp", t: "text" },
        { k: "email", l: "Email", t: "text", req: 1 }
      ]
    },
    about: {
      label: "À propos", type: "object", path: "about",
      fields: [
        { k: "paragraphs", l: "Paragraphes (1 par ligne vide = nouveau paragraphe)", t: "paras" },
        { k: "highlights", l: "Points forts (1 par ligne)", t: "lines" },
        { k: "languages", l: "Langues (1 par ligne)", t: "lines" }
      ]
    },
    skills: {
      label: "Compétences", type: "object", path: "skills",
      fields: [
        { k: "cards", l: "Cartes de compétences", t: "repeat", add: "Ajouter une carte",
          fields: [
            { k: "icon", l: "Icône (texte court, ex. </>)", t: "text" },
            { k: "title", l: "Titre", t: "text", req: 1 },
            { k: "chips", l: "Technologies (1 par ligne)", t: "lines" }
          ] },
        { k: "bars", l: "Barres de niveau", t: "repeat", add: "Ajouter une barre",
          fields: [
            { k: "label", l: "Libellé", t: "text", req: 1 },
            { k: "value", l: "Niveau (0–100)", t: "number", min: 0, max: 100 }
          ] }
      ]
    },
    experience: {
      label: "Expériences", type: "list", path: "experience",
      add: "Ajouter une expérience",
      title: function (i) { return (i.title || "Expérience") + (i.company ? " — " + i.company : ""); },
      sub: function (i) { return i.date || ""; },
      blank: function () { return { date: "", tag: "", current: false, title: "", company: "", stack: "", bullets: [] }; },
      fields: [
        { k: "date", l: "Période (ex. 07/2023 — 31/08/2025)", t: "text" },
        { k: "tag", l: "Étiquette (ex. 2 ans, Poste actuel)", t: "text" },
        { k: "current", l: "Poste actuel", t: "check" },
        { k: "title", l: "Poste", t: "text", req: 1 },
        { k: "company", l: "Entreprise", t: "text" },
        { k: "stack", l: "Technologies (séparées par ·)", t: "text" },
        { k: "bullets", l: "Missions (1 par ligne)", t: "lines" }
      ]
    },
    projects: {
      label: "Projets", type: "list", path: "projects",
      add: "Ajouter un projet",
      title: function (i) { return i.name || "Projet"; },
      sub: function (i) { return i.url || i.tag || ""; },
      blank: function () { return { name: "", tag: "Web", filter: "web", url: "", description: "", stack: [] }; },
      fields: [
        { k: "name", l: "Nom du projet", t: "text", req: 1 },
        { k: "tag", l: "Étiquette affichée (ex. Web · SEO)", t: "text" },
        { k: "filter", l: "Catégorie de filtre", t: "select", options: FILTERS },
        { k: "url", l: "Lien (laisser vide = carte sans lien)", t: "text" },
        { k: "description", l: "Description", t: "area" },
        { k: "stack", l: "Technologies (1 par ligne)", t: "lines" }
      ]
    },
    education: {
      label: "Formation", type: "list", path: "education",
      add: "Ajouter une formation",
      title: function (i) { return (i.year || "") + (i.title ? " · " + i.title : ""); },
      sub: function (i) { return i.school || ""; },
      blank: function () { return { year: "", title: "", school: "", field: "" }; },
      fields: [
        { k: "year", l: "Année / niveau", t: "text" },
        { k: "title", l: "Diplôme", t: "text", req: 1 },
        { k: "school", l: "Établissement", t: "text" },
        { k: "field", l: "Domaine / précision", t: "text" }
      ]
    },
    meta: {
      label: "Références SEO", type: "object", path: "meta",
      fields: [
        { k: "title", l: "Titre de la page (onglet)", t: "text" },
        { k: "description", l: "Méta description", t: "area" }
      ]
    }
  };

  /* ---------- Utilitaires ---------- */
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function txt(tag, cls, s) {
    var n = el(tag, cls);
    n.textContent = s == null ? "" : s;
    return n;
  }
  function get(root, k) {
    if (k.indexOf(".") === -1) return root[k];
    return k.split(".").reduce(function (o, p) { return o == null ? o : o[p]; }, root);
  }
  function set(root, k, v) {
    if (k.indexOf(".") === -1) { root[k] = v; return; }
    var parts = k.split("."), last = parts.pop();
    var o = parts.reduce(function (a, p) { if (!a[p]) a[p] = {}; return a[p]; }, root);
    o[last] = v;
  }
  function arr(root, k) { if (!get(root, k)) set(root, k, []); return get(root, k); }

  function status(msg, isErr) {
    var s = document.getElementById("status");
    s.textContent = msg;
    s.className = "a-status show" + (isErr ? " err" : "");
    clearTimeout(status._t);
    status._t = setTimeout(function () { s.className = "a-status"; }, 4000);
  }

  function markDirty() {
    if (!dirty) { dirty = true; document.getElementById("dirtyFlag").textContent = "• modifications non enregistrées"; }
  }

  /* ---------- Champs de formulaire ---------- */
  function buildField(f, root) {
    var wrap = el("div", "f");
    var id = "f" + (++uid);
    var label = txt("label", null, f.l);
    label.htmlFor = id;
    wrap.appendChild(label);

    var value = get(root, f.k);
    var input;

    if (f.t === "area") {
      input = document.createElement("textarea");
      input.rows = 4;
      input.value = value || "";
      input.addEventListener("input", function () { set(root, f.k, input.value); markDirty(); });
    } else if (f.t === "lines") {
      input = document.createElement("textarea");
      input.rows = Math.min(8, (value || []).length + 2);
      input.value = (value || []).join("\n");
      input.addEventListener("input", function () {
        set(root, f.k, input.value.split("\n").map(function (x) { return x.trim(); }).filter(Boolean));
        markDirty();
      });
      wrap.appendChild(txt("p", "hint", "1 ligne = 1 élément"));
    } else if (f.t === "paras") {
      input = document.createElement("textarea");
      input.rows = 6;
      input.value = (value || []).join("\n\n");
      input.addEventListener("input", function () {
        set(root, f.k, input.value.split(/\n\s*\n/).map(function (x) { return x.replace(/\s*\n\s*/g, " ").trim(); }).filter(Boolean));
        markDirty();
      });
      wrap.appendChild(txt("p", "hint", "Séparez les paragraphes par une ligne vide"));
    } else if (f.t === "select") {
      input = document.createElement("select");
      (f.options || []).forEach(function (o) {
        var opt = document.createElement("option");
        opt.value = o[0]; opt.textContent = o[1];
        input.appendChild(opt);
      });
      input.value = value || "";
      input.addEventListener("change", function () { set(root, f.k, input.value); markDirty(); });
    } else if (f.t === "check") {
      input = document.createElement("input");
      input.type = "checkbox";
      input.className = "chk";
      input.checked = !!value;
      input.addEventListener("change", function () { set(root, f.k, input.checked); markDirty(); });
      wrap.classList.add("f-inline");
      wrap.appendChild(input);
      wrap.appendChild(txt("span", "chk-label", f.l));
      return wrap;
    } else if (f.t === "number") {
      input = document.createElement("input");
      input.type = "number";
      if (f.min != null) input.min = f.min;
      if (f.max != null) input.max = f.max;
      input.value = value == null ? "" : value;
      input.addEventListener("input", function () {
        set(root, f.k, input.value === "" ? 0 : Number(input.value));
        markDirty();
      });
    } else {
      input = document.createElement("input");
      input.type = "text";
      input.value = value == null ? "" : value;
      input.addEventListener("input", function () { set(root, f.k, input.value); markDirty(); });
    }

    input.id = id;
    if (f.req) input.required = true;
    wrap.appendChild(input);
    return wrap;
  }

  /* ---------- Champ répétable (tableau d'objets) ---------- */
  function buildRepeat(f, root) {
    var wrap = el("div", "rep");
    var head = el("div", "rep-head");
    head.appendChild(txt("span", "rep-title", f.l));
    var addBtn = txt("button", "mini", "+ " + (f.add || "Ajouter"));
    addBtn.type = "button";
    addBtn.addEventListener("click", function () {
      var item = {};
      f.fields.forEach(function (sf) {
        item[sf.k] = sf.t === "lines" || sf.t === "paras" ? [] : (sf.t === "number" ? 0 : "");
      });
      arr(root, f.k).push(item);
      markDirty(); render();
    });
    head.appendChild(addBtn);
    wrap.appendChild(head);

    var list = arr(root, f.k);
    if (!list.length) wrap.appendChild(txt("p", "hint", "Aucun élément."));
    list.forEach(function (item, i) {
      var box = el("div", "rep-item");
      var bh = el("div", "rep-item-head");
      bh.appendChild(txt("span", "rep-index", (i + 1) + "."));
      bh.appendChild(miniBtn("↑", function () { move(list, i, -1); }));
      bh.appendChild(miniBtn("↓", function () { move(list, i, 1); }));
      bh.appendChild(miniBtn("✕", function () {
        if (confirm("Supprimer cet élément ?")) { list.splice(i, 1); markDirty(); render(); }
      }));
      box.appendChild(bh);
      f.fields.forEach(function (sf) { box.appendChild(buildField(sf, item)); });
      wrap.appendChild(box);
    });
    return wrap;
  }

  function miniBtn(label, fn) {
    var b = txt("button", "mini ghost", label);
    b.type = "button";
    b.addEventListener("click", fn);
    return b;
  }

  function move(list, i, dir) {
    var j = i + dir;
    if (j < 0 || j >= list.length) return;
    var tmp = list[i]; list[i] = list[j]; list[j] = tmp;
    markDirty(); render();
  }

  /* ---------- Rendu de la vue courante ---------- */
  function render() {
    var main = document.getElementById("main");
    main.textContent = "";
    var sec = SECTIONS[current];
    main.appendChild(txt("h1", "a-h1", sec.label));

    if (sec.type === "object") {
      var box = el("div", "panel");
      var root = get(state, sec.path);
      if (!root) { root = {}; set(state, sec.path, root); }
      sec.fields.forEach(function (f) {
        box.appendChild(f.t === "repeat" ? buildRepeat(f, root) : buildField(f, root));
      });
      main.appendChild(box);
    } else {
      renderList(main, sec);
    }
    renderSide();
  }

  function renderList(main, sec) {
    var list = arr(state, sec.path);

    if (editing !== null) {
      var panel = el("div", "panel");
      var head = el("div", "edit-head");
      head.appendChild(txt("h2", null, (editing === -1 ? "Nouveau" : "Modification") + " — " + sec.label.replace(/s$/, "")));
      panel.appendChild(head);
      sec.fields.forEach(function (f) {
        panel.appendChild(f.t === "repeat" ? buildRepeat(f, draft) : buildField(f, draft));
      });
      var actions = el("div", "actions");
      var ok = txt("button", "btn-save", "Valider");
      ok.type = "button";
      ok.addEventListener("click", function () {
        var missing = sec.fields.filter(function (f) { return f.req && !String(draft[f.k] || "").trim(); });
        if (missing.length) { status("Champ obligatoire vide : " + missing[0].l, true); return; }
        if (editing === -1) list.push(draft); else list[editing] = draft;
        editing = null; draft = null; markDirty(); render();
        status("Modification appliquée — pensez à enregistrer.");
      });
      var cancel = txt("button", "btn-ghost", "Annuler");
      cancel.type = "button";
      cancel.addEventListener("click", function () { editing = null; draft = null; render(); });
      actions.appendChild(ok);
      actions.appendChild(cancel);
      panel.appendChild(actions);
      main.appendChild(panel);
      return;
    }

    var add = txt("button", "btn-primary a-add", "+ " + sec.add);
    add.type = "button";
    add.addEventListener("click", function () { editing = -1; draft = sec.blank(); render(); });
    main.appendChild(add);

    if (!list.length) {
      main.appendChild(txt("p", "hint", "Aucun élément pour l'instant."));
      return;
    }

    var wrap = el("div", "items");
    list.forEach(function (item, i) {
      var row = el("div", "item glass");
      var body = el("div", "item-body");
      body.appendChild(txt("strong", null, sec.title(item)));
      var sub = sec.sub(item);
      if (sub) body.appendChild(txt("span", "hint", sub));
      row.appendChild(body);

      var acts = el("div", "item-acts");
      acts.appendChild(miniBtn("↑", function () { move(list, i, -1); }));
      acts.appendChild(miniBtn("↓", function () { move(list, i, 1); }));
      var edit = txt("button", "mini", "Modifier");
      edit.type = "button";
      edit.addEventListener("click", function () {
        editing = i; draft = clone(item); render();
      });
      acts.appendChild(edit);
      acts.appendChild(miniBtn("✕", function () {
        if (confirm("Supprimer « " + sec.title(item) + " » ?")) {
          list.splice(i, 1); markDirty(); render();
        }
      }));
      row.appendChild(acts);
      wrap.appendChild(row);
    });
    main.appendChild(wrap);
  }

  function renderSide() {
    var side = document.getElementById("side");
    side.textContent = "";
    Object.keys(SECTIONS).forEach(function (key) {
      var b = txt("button", "side-btn" + (key === current ? " active" : ""), SECTIONS[key].label);
      b.type = "button";
      b.addEventListener("click", function () {
        if (dirty && !confirm("Vous avez des modifications non enregistrées. Changer de section ?")) return;
        current = key; editing = null; draft = null; render();
      });
      side.appendChild(b);
    });
  }

  /* ---------- Enregistrement ---------- */
  function serialize() {
    return "window.SITE_CONTENT = " + JSON.stringify(state, null, 2) + ";\n";
  }

  function parse(text) {
    var i = text.indexOf("{"), j = text.lastIndexOf("}");
    if (i === -1 || j === -1) throw new Error("format incorrect");
    return JSON.parse(text.slice(i, j + 1));
  }

  function download() {
    var blob = new Blob([serialize()], { type: "text/javascript;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "content.js";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    dirty = false;
    document.getElementById("dirtyFlag").textContent = "";
    status("Fichier content.js téléchargé — remplacez data/content.js par ce fichier.");
  }

  async function save() {
    if (!window.showSaveFilePicker) { download(); return; }
    try {
      if (!fileHandle) {
        fileHandle = await window.showSaveFilePicker({
          suggestedName: "content.js",
          types: [{ description: "Données du portfolio", accept: { "text/javascript": [".js"] } }]
        });
      }
      var w = await fileHandle.createWritable();
      await w.write(serialize());
      await w.close();
      dirty = false;
      document.getElementById("dirtyFlag").textContent = "";
      status("Enregistré dans " + fileHandle.name);
    } catch (e) {
      if (e.name === "AbortError") return;
      status("Échec : " + e.message, true);
    }
  }

  async function openFile() {
    if (!window.showOpenFilePicker) { document.getElementById("fileInput").click(); return; }
    try {
      var handles = await window.showOpenFilePicker({
        types: [{ description: "Données du portfolio", accept: { "text/javascript": [".js"] } }]
      });
      fileHandle = handles[0];
      var text = await (await fileHandle.getFile()).text();
      state = parse(text);
      dirty = false; editing = null; draft = null;
      document.getElementById("dirtyFlag").textContent = "";
      render();
      status("Chargé depuis " + fileHandle.name);
    } catch (e) {
      if (e.name === "AbortError") return;
      status("Échec : " + e.message, true);
    }
  }

  /* ---------- Initialisation ---------- */
  function init() {
    if (!ORIGINAL) {
      document.getElementById("main").appendChild(
        txt("p", "err", "Impossible de charger data/content.js (chemin ou syntaxe incorrect)."));
      return;
    }
    state = clone(ORIGINAL);

    document.getElementById("btnSave").addEventListener("click", save);
    document.getElementById("btnOpen").addEventListener("click", openFile);
    document.getElementById("btnDownload").addEventListener("click", download);
    document.getElementById("btnReset").addEventListener("click", function () {
      if (!confirm("Réinitialiser toutes les données depuis le dernier fichier chargé ?")) return;
      state = clone(ORIGINAL);
      dirty = false; editing = null; draft = null;
      document.getElementById("dirtyFlag").textContent = "";
      render();
      status("Données réinitialisées.");
    });

    document.getElementById("fileInput").addEventListener("change", function (e) {
      var f = e.target.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          state = parse(r.result);
          dirty = false; editing = null; draft = null;
          document.getElementById("dirtyFlag").textContent = "";
          render();
          status("Chargé depuis " + f.name);
        } catch (err) { status("Fichier invalide : " + err.message, true); }
      };
      r.readAsText(f);
      e.target.value = "";
    });

    window.addEventListener("beforeunload", function (e) {
      if (dirty) { e.preventDefault(); e.returnValue = ""; }
    });

    render();
  }

  window.__admin = {
    get state() { return state; },
    serialize: serialize,
    select: function (key) { if (SECTIONS[key]) { current = key; editing = null; draft = null; render(); } },
    isDirty: function () { return dirty; },
    toJSON: function () { return parse(serialize()); }
  };

  init();
})();
