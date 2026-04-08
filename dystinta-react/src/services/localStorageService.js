export const DEFAULT_DATA = {
  general: {
    companyName: "Dystinta",
    slogan: "Serigrafía, DTF Textil y DTF UV",
    whatsapp: "+595982317317",
    whatsappRaw: "595982317317",
    instagram: "https://www.instagram.com/dystintapy/",
    facebook: "https://www.facebook.com/sshirleybittar",
    tiktok: "",
    email: "",
    address: "Asunción, Paraguay",
    map: "https://www.google.com/maps?q=Asuncion+Paraguay&output=embed",
  },
  home: {
    title: "Impresión profesional para marcas, emprendimientos y eventos",
    subtitle:
      "Creamos soluciones en serigrafía y DTF con atención personalizada, asesoramiento de diseño y producción a medida.",
    heroNote: "Atendemos pedidos por WhatsApp, formulario web y panel interno.",
    video1: "DTF Textil",
    video2: "DTF UV",
    video3: "Serigrafía",
  },
  about: {
    title: "Asesoría",
    text: "Guía práctica para trabajar con serigrafía, sublimación y DTF: temperaturas, tiempos, materiales recomendados, color y preparación de archivos.",
  },
  services: {
    title: "Servicios",
    textil:
      "Impresión DTF Textil ideal para remeras, uniformes, promociones y producciones personalizadas.",
    uv: "DTF UV para etiquetas, packaging, objetos rígidos y branding de productos.",
    serigrafia:
      "Serigrafía para volumen, eventos, campañas y prendas con excelente durabilidad.",
  },
  designs: {
    title: "Diseños",
    text: "Mostrá ideas, catálogos, mockups, plantillas y propuestas visuales para tus clientes.",
  },
  calc: {
    title: "Calculadora DTF",
    pricePerCm2: 150,
    minCharge: 25000,
    extraRush: 15000,
  },
  contact: {
    title: "Contacto",
    text: "Escribinos para cotizaciones, pedidos o consultas de diseño.",
  },
};

export const DEFAULT_USERS = [
  { username: "admin", password: "admin123", role: "admin", name: "Administrador" },
  { username: "designer1", password: "disenador123", role: "designer", name: "Diseñador 1" },
  { username: "designer2", password: "disenador123", role: "designer", name: "Diseñador 2" },
];

const MEDIA_DB_NAME = "dystinta_media_db";
const MEDIA_STORE = "files";

export function openMediaDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(MEDIA_DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(MEDIA_STORE)) {
        req.result.createObjectStore(MEDIA_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveMediaFile(key, file) {
  const db = await openMediaDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MEDIA_STORE, "readwrite");
    tx.objectStore(MEDIA_STORE).put(file, key);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getMediaFile(key) {
  const db = await openMediaDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MEDIA_STORE, "readonly");
    const req = tx.objectStore(MEDIA_STORE).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteMediaFile(key) {
  const db = await openMediaDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MEDIA_STORE, "readwrite");
    tx.objectStore(MEDIA_STORE).delete(key);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export function getData() {
  return JSON.parse(localStorage.getItem("dystinta_site_data") || "null") || structuredClone(DEFAULT_DATA);
}

export function saveData(data) {
  localStorage.setItem("dystinta_site_data", JSON.stringify(data));
}

export function getPedidos() {
  return JSON.parse(localStorage.getItem("dystinta_orders") || "[]");
}

export function savePedidos(data) {
  localStorage.setItem("dystinta_orders", JSON.stringify(data));
}

export function getOrders() {
  return getPedidos();
}

export function saveOrders(data) {
  savePedidos(data);
}

export function getUsers() {
  return JSON.parse(localStorage.getItem("dystinta_users") || "null") || structuredClone(DEFAULT_USERS);
}

export function saveUsers(data) {
  localStorage.setItem("dystinta_users", JSON.stringify(data));
}

export function initStorage() {
  if (!localStorage.getItem("dystinta_site_data")) saveData(structuredClone(DEFAULT_DATA));
  if (!localStorage.getItem("dystinta_users")) saveUsers(structuredClone(DEFAULT_USERS));
  if (!localStorage.getItem("dystinta_orders")) savePedidos([]);
}

export function loginAdmin(username, password) {
  const users = getUsers();
  const user = users.find(
    (item) => item.username === username && item.password === password && item.role === "admin"
  );
  if (!user) return null;
  localStorage.setItem("dystinta_session", "admin");
  return user;
}

export function loginPanel(username, password) {
  const found = getUsers().find(
    (u) =>
      u.username === username &&
      u.password === password &&
      (u.role === "admin" || u.role === "designer")
  );
  if (!found) return null;
  localStorage.setItem("dystinta_panel_user", JSON.stringify(found));
  return found;
}

export function getPanelSession() {
  return JSON.parse(localStorage.getItem("dystinta_panel_user") || "null");
}

export function clearPanelSession() {
  localStorage.removeItem("dystinta_panel_user");
}

export function clearAdminSession() {
  localStorage.removeItem("dystinta_session");
}

export function sendOrderToWhatsApp(order) {
  const data = getData();
  const txt = `Nuevo pedido Dystinta%0AServicio: ${encodeURIComponent(order.service)}%0ANombre: ${encodeURIComponent(order.name)}%0ATeléfono: ${encodeURIComponent(order.phone)}%0ACantidad: ${encodeURIComponent(order.quantity || "")}%0ADetalles: ${encodeURIComponent(order.details || "")}%0AArchivo: ${encodeURIComponent(order.fileName || "Sin archivo")}`;
  window.open(`https://wa.me/${data.general.whatsappRaw}?text=${txt}`, "_blank");
}

export function exportJSON() {
  const blob = new Blob(
    [JSON.stringify({ site: getData(), users: getUsers(), orders: getOrders() }, null, 2)],
    { type: "application/json" }
  );
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "dystinta-backup.json";
  a.click();
}

export function importJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (parsed.site) saveData(parsed.site);
        if (parsed.users) saveUsers(parsed.users);
        if (parsed.orders) saveOrders(parsed.orders);
        resolve(parsed);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
