import api from "./api";

const CACHE_KEY = "dystinta.publicSite.v1";
const CACHE_TTL_MS = 1000 * 60 * 10;

export const PUBLIC_SITE_FALLBACK = {
  general: {
    companyName: "Dystinta",
    slogan: "Impresion y personalizacion",
    whatsappRaw: "",
    instagram: "#",
    facebook: "#",
    address: "Asuncion, Paraguay",
    map: "",
    themePrimary: "#8b4bff",
    themeSecondary: "#6a2db8",
    themeAccent: "#d7b8ff",
    themeBackground: "#0b0613",
    themeSurface: "#ffffff",
    themeText: "#ffffff",
  },
  home: {
    title: "Dystinta",
    subtitle: "Centro grafico para DTF textil, DTF UV, serigrafia y produccion visual.",
    video1: "DTF Textil",
    video2: "DTF UV",
    video3: "Serigrafia",
  },
  services: {
    title: "Servicios",
    textil: "Produccion DTF para prendas, uniformes, marcas y pedidos personalizados.",
    uv: "Adhesivos UV para objetos rigidos, packaging, frascos y piezas de branding.",
    serigrafia: "Serigrafia para volumen, campanas, eventos y produccion repetitiva.",
  },
  contact: {
    title: "Contacto",
    text: "Dejanos tu consulta y el equipo te ayuda a preparar el pedido.",
  },
  about: {
    title: "Asesoria de produccion",
    text: "Referencia rapida para elegir tecnica, preparar archivos y validar muestras.",
    cards: [],
  },
  catalog: [],
};

let memorySite = null;
let inFlightSite = null;

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function normalizeSite(site) {
  return {
    ...PUBLIC_SITE_FALLBACK,
    ...(site || {}),
    general: { ...PUBLIC_SITE_FALLBACK.general, ...(site?.general || {}) },
    home: { ...PUBLIC_SITE_FALLBACK.home, ...(site?.home || {}) },
    services: { ...PUBLIC_SITE_FALLBACK.services, ...(site?.services || {}) },
    contact: { ...PUBLIC_SITE_FALLBACK.contact, ...(site?.contact || {}) },
    about: { ...PUBLIC_SITE_FALLBACK.about, ...(site?.about || {}) },
    catalog: Array.isArray(site?.catalog) ? site.catalog : PUBLIC_SITE_FALLBACK.catalog,
  };
}

export function getCachedPublicSite() {
  if (memorySite) return { site: memorySite, source: "memory", stale: false };
  if (!canUseStorage()) return { site: normalizeSite(), source: "fallback", stale: true };

  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return { site: normalizeSite(), source: "fallback", stale: true };

    const cached = JSON.parse(raw);
    const site = normalizeSite(cached.site || cached.data);
    memorySite = site;

    return {
      site,
      source: "cache",
      stale: Date.now() - Number(cached.savedAt || 0) > CACHE_TTL_MS,
    };
  } catch {
    return { site: normalizeSite(), source: "fallback", stale: true };
  }
}

function savePublicSite(site) {
  const normalized = normalizeSite(site);
  memorySite = normalized;

  if (canUseStorage()) {
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify({ site: normalized, savedAt: Date.now() }));
    } catch {
      // Storage can fail in private mode or when quota is full; memory cache still helps this session.
    }
  }

  return normalized;
}

export async function fetchPublicSite() {
  if (inFlightSite) return inFlightSite;

  inFlightSite = api
    .get("/site/public/", { skipClientCache: true })
    .then((response) => savePublicSite(response.data))
    .finally(() => {
      inFlightSite = null;
    });

  return inFlightSite;
}
