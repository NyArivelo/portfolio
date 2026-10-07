/* =========================================================
   PORTFOLIO — interactions
   ========================================================= */

/* ---------- Année ---------- */
document.getElementById("year").textContent = new Date().getFullYear();

/* ---------- Nav au scroll ---------- */
const nav = document.getElementById("nav");
const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 40);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* ---------- Menu mobile ---------- */
const toggle = document.getElementById("navToggle");
const links = document.getElementById("navLinks");

toggle.addEventListener("click", () => {
  const open = links.classList.toggle("open");
  toggle.classList.toggle("open", open);
  toggle.setAttribute("aria-expanded", String(open));
});

links.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    links.classList.remove("open");
    toggle.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  })
);

/* ---------- Typewriter ---------- */
const roles = [
  "Développeur Fullstack",
  "React · VueJS · Laravel",
  "Intégration & SEO",
  "Créateur d'APIs",
  "HTML-emailing & automatisation",
];

const typeEl = document.getElementById("typewriter");
let roleIndex = 0;
let charIndex = 0;
let deleting = false;

function type() {
  const current = roles[roleIndex];
  charIndex += deleting ? -1 : 1;
  typeEl.textContent = current.slice(0, charIndex);

  let delay = deleting ? 45 : 95;

  if (!deleting && charIndex === current.length) {
    delay = 1900;
    deleting = true;
  } else if (deleting && charIndex === 0) {
    deleting = false;
    roleIndex = (roleIndex + 1) % roles.length;
    delay = 350;
  }
  setTimeout(type, delay);
}
type();

/* ---------- Reveal au scroll ---------- */
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
);

document.querySelectorAll(".reveal, .bars").forEach((el, i) => {
  el.style.transitionDelay = `${Math.min(i % 6, 5) * 70}ms`;
  revealObserver.observe(el);
});

/* ---------- Barres de compétences ---------- */
const barsEl = document.querySelector(".bars");
if (barsEl) {
  new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in-view");
          obs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.3 }
  ).observe(barsEl);
}

/* ---------- Filtres projets ---------- */
const filters = document.querySelectorAll(".filter");
const projects = document.querySelectorAll(".project");

filters.forEach((btn) => {
  btn.addEventListener("click", () => {
    filters.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const cat = btn.dataset.filter;

    projects.forEach((p) => {
      const show = cat === "all" || p.dataset.cat === cat;
      p.classList.toggle("hide", !show);
      if (show) {
        p.style.opacity = 0;
        p.style.transform = "translateY(18px)";
        requestAnimationFrame(() => {
          p.style.opacity = 1;
          p.style.transform = "none";
        });
      }
    });
  });
});

/* ---------- Lien actif selon la section visible ---------- */
const sections = document.querySelectorAll("section[id]");
const navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navAnchors.forEach((a) =>
        a.classList.toggle("active", a.getAttribute("href") === `#${entry.target.id}`)
      );
    });
  },
  { rootMargin: "-45% 0px -50% 0px" }
);
sections.forEach((s) => sectionObserver.observe(s));

/* ---------- Effet spotlight sur les cartes compétences ---------- */
document.querySelectorAll(".skill-card").forEach((card) => {
  card.addEventListener("mousemove", (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - r.left}px`);
    card.style.setProperty("--my", `${e.clientY - r.top}px`);
  });
});

/* ---------- Curseur personnalisé ---------- */
const dot = document.querySelector(".cursor-dot");
const ring = document.querySelector(".cursor-ring");
const fine = window.matchMedia("(pointer: fine)").matches;

if (fine && dot && ring) {
  let mx = 0, my = 0, rx = 0, ry = 0;

  window.addEventListener("mousemove", (e) => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
  });

  const loop = () => {
    rx += (mx - rx) * 0.16;
    ry += (my - ry) * 0.16;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    requestAnimationFrame(loop);
  };
  loop();

  document.querySelectorAll("a, button, .skill-card, .project").forEach((el) => {
    el.addEventListener("mouseenter", () => document.body.classList.add("hovering"));
    el.addEventListener("mouseleave", () => document.body.classList.remove("hovering"));
  });
}
