import axios from "axios";
import { API_BASE_URL } from "../config";

const api = axios.create({
  baseURL: API_BASE_URL,
});

const PUBLIC_SITE_CACHE_KEY = "dystinta.publicSite.v1";
const HOME_CAROUSEL_CACHE_KEY = "dystinta.homeCarousel.v1";

const PUBLIC_SITE_FALLBACK = {
  general: {
    companyName: "Dystinta",
    slogan: "Impresion y personalizacion",
    whatsappRaw: "",
    instagram: "#",
    facebook: "#",
    address: "Padre Molas c/ 1ro de mayo, Capiata, Paraguay",
    map: "https://www.google.com/maps?q=-25.356464,-57.484890&z=17&output=embed",
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

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function normalizePublicSite(site) {
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

function readCacheEntry(key, fallback) {
  if (!canUseStorage()) return { data: fallback, hasCache: false };
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return { data: fallback, hasCache: false };
    const parsed = JSON.parse(raw);
    return { data: parsed.data || parsed.site || fallback, hasCache: true };
  } catch {
    return { data: fallback, hasCache: false };
  }
}

function writeCache(key, data, field = "data") {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify({ [field]: data, savedAt: Date.now() }));
  } catch {
    // The in-memory response still works even if localStorage is unavailable.
  }
}

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
    }

    return Promise.reject(error);
  }
);

const networkGet = api.get.bind(api);

function refreshCacheInBackground(url, config, cacheKey, normalize = (value) => value) {
  networkGet(url, { ...(config || {}), skipClientCache: true })
    .then((response) => writeCache(cacheKey, normalize(response.data), cacheKey === PUBLIC_SITE_CACHE_KEY ? "site" : "data"))
    .catch(() => {});
}

api.get = (url, config = {}) => {
  if (!config.skipClientCache && url === "/site/public/") {
    const cached = readCacheEntry(PUBLIC_SITE_CACHE_KEY, PUBLIC_SITE_FALLBACK);
    if (cached.hasCache) {
      const data = normalizePublicSite(cached.data);
      refreshCacheInBackground(url, config, PUBLIC_SITE_CACHE_KEY, normalizePublicSite);
      return Promise.resolve({ data, status: 200, statusText: "OK", headers: {}, config });
    }

    return networkGet(url, config)
      .then((response) => {
        const data = normalizePublicSite(response.data);
        writeCache(PUBLIC_SITE_CACHE_KEY, data, "site");
        return { ...response, data };
      })
      .catch(() => ({
        data: normalizePublicSite(PUBLIC_SITE_FALLBACK),
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      }));
  }

  if (!config.skipClientCache && url === "/media/home-carousel/") {
    const cached = readCacheEntry(HOME_CAROUSEL_CACHE_KEY, []);
    if (cached.hasCache) {
      const data = Array.isArray(cached.data) ? cached.data : [];
      refreshCacheInBackground(url, config, HOME_CAROUSEL_CACHE_KEY, (value) => (Array.isArray(value) ? value : []));
      return Promise.resolve({ data, status: 200, statusText: "OK", headers: {}, config });
    }

    return networkGet(url, config)
      .then((response) => {
        const data = Array.isArray(response.data) ? response.data : [];
        writeCache(HOME_CAROUSEL_CACHE_KEY, data);
        return { ...response, data };
      })
      .catch(() => ({ data: [], status: 200, statusText: "OK", headers: {}, config }));
  }

  return networkGet(url, config).then((response) => {
    if (url === "/site/public/") writeCache(PUBLIC_SITE_CACHE_KEY, normalizePublicSite(response.data), "site");
    if (url === "/media/home-carousel/") writeCache(HOME_CAROUSEL_CACHE_KEY, Array.isArray(response.data) ? response.data : []);
    return response;
  });
};

export default api;
