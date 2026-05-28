import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo-dystinta.jpg";
import WhatsAppAdminPanel from "../components/WhatsAppAdminPanel";
import { adminToolsService, authService, mediaService, orderService, siteService, userService } from "../services/backend";

const STATUS_OPTIONS = ["Nuevo", "En revisión", "Archivo recibido", "En diseño", "Aprobación cliente", "Producción", "En cola", "Imprimiendo", "Listo para retirar", "Entregado", "En pausa", "Finalizado"];
const SERVICE_OPTIONS = ["DTF Textil", "DTF UV", "Serigrafía", "Catálogo"];
const COMPLETED_STATUSES = ["Entregado", "Finalizado"];
const ORDER_UPDATE_TIMEOUT_MS = 20000;
const EMPTY_USER_FORM = { username: "", password: "", role: "designer", name: "", is_active: true };
const EMPTY_BACKOFFICE_ORDER_FORM = { name: "", phone: "", email: "", details: "", file: null };
const BACKOFFICE_ORDER_TABS = [
  { key: "dtf-textil", label: "DTF Textil", service: "DTF Textil", description: "Ideal para remeras, uniformes y prendas personalizadas." },
  { key: "dtf-uv", label: "DTF UV", service: "DTF UV", description: "Para envases, objetos rigidos, etiquetas y branding de productos." },
  { key: "serigrafia", label: "Serigrafia", service: "Serigrafía", description: "Recomendada para volumen, campanas, eventos y tiradas grandes." },
];
const SITE_SECTIONS = [
  { key: "general", title: "General", endpoint: "general", fields: [
    { key: "companyName", label: "Empresa" }, { key: "slogan", label: "Slogan" },
    { key: "whatsapp", label: "WhatsApp visible" }, { key: "whatsappRaw", label: "WhatsApp raw" },
    { key: "instagram", label: "Instagram", type: "url" }, { key: "facebook", label: "Facebook", type: "url" },
    { key: "tiktok", label: "TikTok", type: "url" }, { key: "email", label: "Email", type: "email" },
    { key: "address", label: "Dirección" }, { key: "map", label: "Mapa embed", type: "url" },
    { key: "themePrimary", label: "Color primario", type: "color" },
    { key: "themeSecondary", label: "Color secundario", type: "color" },
    { key: "themeAccent", label: "Color acento", type: "color" },
    { key: "themeBackground", label: "Fondo original", type: "color" },
    { key: "themeSurface", label: "Superficies", type: "color" },
    { key: "themeText", label: "Texto", type: "color" },
  ]},
  { key: "home", title: "Inicio", endpoint: "home", fields: [
    { key: "title", label: "Título" }, { key: "subtitle", label: "Subtítulo", multiline: true },
    { key: "heroNote", label: "Nota hero", multiline: true }, { key: "video1", label: "Texto video 1" },
    { key: "video2", label: "Texto video 2" }, { key: "video3", label: "Texto video 3" },
  ]},
  { key: "about", title: "Asesoría", endpoint: "about", fields: [{ key: "title", label: "Título" }, { key: "text", label: "Texto", multiline: true }]},
  { key: "services", title: "Servicios", endpoint: "services", fields: [
    { key: "title", label: "Título" }, { key: "textil", label: "DTF Textil", multiline: true },
    { key: "uv", label: "DTF UV", multiline: true }, { key: "serigrafia", label: "Serigrafía", multiline: true },
  ]},
  { key: "designs", title: "Diseños", endpoint: "designs", fields: [{ key: "title", label: "Título" }, { key: "text", label: "Texto", multiline: true }]},
  { key: "calc", title: "Calculadora", endpoint: "calc", fields: [
    { key: "title", label: "Título" }, { key: "pricePerCm2", label: "Precio por cm2", type: "number", step: "0.01" },
    { key: "minCharge", label: "Cargo mínimo", type: "number", step: "0.01" }, { key: "extraRush", label: "Extra urgente", type: "number", step: "0.01" },
  ]},
  { key: "contact", title: "Contacto", endpoint: "contact", fields: [{ key: "title", label: "Título" }, { key: "text", label: "Texto", multiline: true }]},
];

function statusClass(status) {
  return {
    Nuevo: "s-nuevo",
    "En revisión": "s-revision",
    "Archivo recibido": "s-archivo",
    "En diseño": "s-diseno",
    "Aprobación cliente": "s-aprobacion",
    Producción: "s-produccion",
    "En cola": "s-cola",
    Imprimiendo: "s-imprimiendo",
    "Listo para retirar": "s-listo",
    Entregado: "s-entregado",
    "En pausa": "s-pausa",
    Finalizado: "s-finalizado",
  }[status] || "s-archivo";
}

function isWaitingForCustomerApproval(status) {
  return status === "Aprobación cliente";
}

function withTimeout(promise, timeoutMs, timeoutMessage) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildTrackingUrl(order) {
  if (!order.trackingToken) return "";
  return `${window.location.origin}/seguimiento/${order.trackingToken}`;
}

function DtfOrderBreakdown({ order }) {
  const designs = order.extraData?.source === "dtf-calculator" && Array.isArray(order.extraData?.designs)
    ? order.extraData.designs
    : [];
  if (!designs.length) return null;

  return (
    <div className="dtf-order-breakdown">
      <strong>Desglose DTF</strong>
      {designs.map((design) => (
        <span key={design.index || design.fileName}>
          Diseño {design.index}: {design.repetitions} rep · {design.widthCm} x {design.heightCm} cm
          {design.fileName ? ` · ${design.fileName}` : ""}
        </span>
      ))}
    </div>
  );
}

function CatalogOrderBreakdown({ order }) {
  const cart = order.extraData?.source === "catalog-cart" && Array.isArray(order.extraData?.cart)
    ? order.extraData.cart
    : [];
  if (!cart.length) return null;

  return (
    <div className="dtf-order-breakdown catalog-order-breakdown">
      <strong>Productos del carrito</strong>
      {cart.map((item, index) => (
        <span key={item.id || `${item.name}-${index}`}>
          {index + 1}. {item.name} x {item.quantity}
          {item.subtotal ? ` · ${Number(item.subtotal).toLocaleString("es-PY")} Gs.` : ""}
        </span>
      ))}
      {order.extraData?.total ? <strong>Total: {Number(order.extraData.total).toLocaleString("es-PY")} Gs.</strong> : null}
    </div>
  );
}

function startOfWeek(date) {
  const copy = new Date(date);
  const day = copy.getDay() || 7;
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - day + 1);
  return copy;
}

function padNumber(value) {
  return String(value).padStart(2, "0");
}

function formatKey(date, mode) {
  if (mode === "month") return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}`;
  if (mode === "week") {
    const start = startOfWeek(date);
    return `${start.getFullYear()}-${padNumber(start.getMonth() + 1)}-${padNumber(start.getDate())}`;
  }
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;
}

function addPeriod(date, mode, amount) {
  const copy = new Date(date);
  if (mode === "month") copy.setMonth(copy.getMonth() + amount);
  else if (mode === "week") copy.setDate(copy.getDate() + amount * 7);
  else copy.setDate(copy.getDate() + amount);
  return copy;
}

function formatPeriodLabel(key, mode) {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, month - 1, day || 1);
  if (mode === "month") {
    return date.toLocaleDateString("es-PY", { month: "short", year: "2-digit" });
  }
  if (mode === "week") {
    const end = addPeriod(date, "day", 6);
    return `${date.toLocaleDateString("es-PY", { day: "2-digit", month: "short" })} - ${end.toLocaleDateString("es-PY", { day: "2-digit", month: "short" })}`;
  }
  return date.toLocaleDateString("es-PY", { day: "2-digit", month: "short" });
}

function getCompletionDate(order) {
  const value = order.statusUpdatedAt || order.updatedAt || order.createdAt;
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function buildCompletionSeries(orders, mode) {
  const buckets = new Map();
  const count = mode === "month" ? 6 : mode === "week" ? 8 : 14;
  const now = new Date();
  const anchor = mode === "week" ? startOfWeek(now) : new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (mode === "month") anchor.setDate(1);

  for (let index = count - 1; index >= 0; index -= 1) {
    const date = addPeriod(anchor, mode, -index);
    buckets.set(formatKey(date, mode), 0);
  }

  orders.forEach((order) => {
    if (!COMPLETED_STATUSES.includes(order.status)) return;
    const completedAt = getCompletionDate(order);
    if (!completedAt) return;
    const key = formatKey(completedAt, mode);
    if (buckets.has(key)) buckets.set(key, buckets.get(key) + 1);
  });

  return Array.from(buckets.entries()).map(([key, value]) => ({
    key,
    label: formatPeriodLabel(key, mode),
    value,
  }));
}

function buildServiceTotals(orders) {
  return SERVICE_OPTIONS.map((service) => ({
    service,
    value: orders.filter((order) => COMPLETED_STATUSES.includes(order.status) && order.service === service).length,
  }));
}

function DashboardBars({ title, subtitle, data, variant }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <section className={`dashboard-chart chart-${variant}`}>
      <div className="dashboard-chart-head">
        <div>
          <span className="badge">{subtitle}</span>
          <h3>{title}</h3>
        </div>
        <strong>{data.reduce((total, item) => total + item.value, 0)}</strong>
      </div>
      <div className="dashboard-bars">
        {data.map((item) => (
          <div className="dashboard-bar-item" key={item.key}>
            <span className="dashboard-bar-value">{item.value}</span>
            <div className="dashboard-bar-track">
              <span style={{ height: `${Math.max((item.value / max) * 100, item.value ? 12 : 2)}%` }} />
            </div>
            <small>{item.label}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function DashboardLine({ data }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  const width = 640;
  const height = 180;
  const points = data.map((item, index) => {
    const x = data.length === 1 ? width / 2 : (index / (data.length - 1)) * width;
    const y = height - (item.value / max) * (height - 22) - 10;
    return { ...item, x, y };
  });
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

  return (
    <section className="dashboard-chart dashboard-line-card">
      <div className="dashboard-chart-head">
        <div>
          <span className="badge">Tendencia</span>
          <h3>Ritmo diario</h3>
        </div>
        <strong>{max}</strong>
      </div>
      <svg className="dashboard-line" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Tendencia diaria de pedidos finalizados">
        <path className="dashboard-line-area" d={`${path} L ${width} ${height} L 0 ${height} Z`} />
        <path className="dashboard-line-path" d={path} />
        {points.map((point) => (
          <g key={point.key}>
            <circle cx={point.x} cy={point.y} r="5" />
            <text x={point.x} y={Math.max(point.y - 10, 14)} textAnchor="middle">{point.value}</text>
          </g>
        ))}
      </svg>
    </section>
  );
}

function BackofficeDashboard({ orders, loading }) {
  const completedOrders = useMemo(
    () => orders.filter((order) => COMPLETED_STATUSES.includes(order.status)),
    [orders]
  );
  const daySeries = useMemo(() => buildCompletionSeries(orders, "day"), [orders]);
  const weekSeries = useMemo(() => buildCompletionSeries(orders, "week"), [orders]);
  const monthSeries = useMemo(() => buildCompletionSeries(orders, "month"), [orders]);
  const serviceTotals = useMemo(() => buildServiceTotals(orders), [orders]);
  const todayKey = formatKey(new Date(), "day");
  const thisWeekKey = formatKey(new Date(), "week");
  const thisMonthKey = formatKey(new Date(), "month");
  const todayDone = daySeries.find((item) => item.key === todayKey)?.value || 0;
  const weekDone = weekSeries.find((item) => item.key === thisWeekKey)?.value || 0;
  const monthDone = monthSeries.find((item) => item.key === thisMonthKey)?.value || 0;
  const peakDay = daySeries.reduce((best, item) => (item.value > best.value ? item : best), daySeries[0] || { label: "-", value: 0 });
  const latestCompleted = completedOrders
    .slice()
    .sort((a, b) => (getCompletionDate(b)?.getTime() || 0) - (getCompletionDate(a)?.getTime() || 0))
    .slice(0, 5);

  return (
    <div className="dashboard-shell">
      <section className="dashboard-hero">
        <div>
          <span className="badge">Back office</span>
          <h2>Dashboard de pedidos finalizados</h2>
          <p className="lead">Vista operativa de cierres por día, semana y mes usando los pedidos actuales del backend.</p>
        </div>
        <div className="dashboard-orbit">
          <strong>{completedOrders.length}</strong>
          <span>finalizados</span>
        </div>
      </section>

      {loading ? <div className="notice">Actualizando métricas...</div> : null}

      <div className="dashboard-kpis">
        <article><span>Hoy</span><strong>{todayDone}</strong><small>pedidos cerrados</small></article>
        <article><span>Esta semana</span><strong>{weekDone}</strong><small>desde el lunes</small></article>
        <article><span>Este mes</span><strong>{monthDone}</strong><small>acumulado mensual</small></article>
        <article><span>Mejor día</span><strong>{peakDay.value}</strong><small>{peakDay.label}</small></article>
      </div>

      <div className="dashboard-grid-main">
        <DashboardBars title="Finalizados por día" subtitle="Últimos 14 días" data={daySeries} variant="day" />
        <DashboardLine data={daySeries} />
      </div>

      <div className="dashboard-grid-secondary">
        <DashboardBars title="Finalizados por semana" subtitle="Últimas 8 semanas" data={weekSeries} variant="week" />
        <DashboardBars title="Finalizados por mes" subtitle="Últimos 6 meses" data={monthSeries} variant="month" />
      </div>

      <div className="dashboard-bottom-grid">
        <section className="dashboard-chart">
          <div className="dashboard-chart-head">
            <div>
              <span className="badge">Servicios</span>
              <h3>Cierres por servicio</h3>
            </div>
          </div>
          <div className="service-meter-list">
            {serviceTotals.map((item) => {
              const max = Math.max(...serviceTotals.map((service) => service.value), 1);
              return (
                <div className="service-meter" key={item.service}>
                  <div><strong>{item.service}</strong><span>{item.value}</span></div>
                  <div className="service-meter-track"><span style={{ width: `${(item.value / max) * 100}%` }} /></div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="dashboard-chart">
          <div className="dashboard-chart-head">
            <div>
              <span className="badge">Actividad</span>
              <h3>Últimos finalizados</h3>
            </div>
          </div>
          <div className="dashboard-latest">
            {latestCompleted.length ? latestCompleted.map((order) => (
              <article key={order.id}>
                <div><strong>{order.name}</strong><span>{order.service}</span></div>
                <time>{getCompletionDate(order)?.toLocaleString("es-PY")}</time>
              </article>
            )) : <div className="notice">Todavía no hay pedidos finalizados.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function Panel({ initialTab = "dashboard" }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [me, setMe] = useState(null);
  const [siteData, setSiteData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [dashboardOrders, setDashboardOrders] = useState([]);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [designers, setDesigners] = useState([]);
  const [mediaItems, setMediaItems] = useState([]);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [stats, setStats] = useState({ total: 0, new: 0, design: 0, done: 0 });
  const [filters, setFilters] = useState({ status: "", service: "", search: "" });
  const [userForm, setUserForm] = useState(EMPTY_USER_FORM);
  const [createOrderTab, setCreateOrderTab] = useState("dtf-textil");
  const [createOrderForms, setCreateOrderForms] = useState({
    "dtf-textil": { ...EMPTY_BACKOFFICE_ORDER_FORM },
    "dtf-uv": { ...EMPTY_BACKOFFICE_ORDER_FORM },
    serigrafia: { ...EMPTY_BACKOFFICE_ORDER_FORM },
  });
  const [adminPassword, setAdminPassword] = useState("");
  const [importFile, setImportFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [savingOrderId, setSavingOrderId] = useState(null);
  const [savingSection, setSavingSection] = useState("");
  const [userActionId, setUserActionId] = useState(null);
  const [backupBusy, setBackupBusy] = useState("");
  const [mediaBusySlot, setMediaBusySlot] = useState(null);
  const [creatingOrder, setCreatingOrder] = useState(false);

  const isAdmin = me?.role === "admin";
  const adminUser = users.find((user) => user.username === "admin");
  const companyName = siteData?.general?.companyName || "";
  const queryParams = useMemo(() => {
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.service) params.service = filters.service;
    if (filters.search) params.search = filters.search;
    if (me?.role === "designer") params.mine = "true";
    return params;
  }, [filters, me]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [ordersData, statsData] = await Promise.all([orderService.list(queryParams), orderService.stats(queryParams)]);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setStats(statsData || { total: 0, new: 0, design: 0, done: 0 });
    } catch {
      setError("No se pudieron cargar los pedidos.");
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  const loadHistoryOrders = useCallback(async () => {
    if (!isAdmin) return;
    setHistoryLoading(true);
    setError("");
    try {
      const historyData = await orderService.history();
      setHistoryOrders(Array.isArray(historyData) ? historyData : []);
    } catch {
      setError("No se pudo cargar el historial de pedidos.");
    } finally {
      setHistoryLoading(false);
    }
  }, [isAdmin]);

  const loadDashboardOrders = useCallback(async () => {
    setDashboardLoading(true);
    try {
      const params = me?.role === "designer" ? { mine: "true" } : {};
      const ordersData = await orderService.list(params);
      setDashboardOrders(Array.isArray(ordersData) ? ordersData : []);
    } catch {
      setError("No se pudieron cargar las métricas del dashboard.");
    } finally {
      setDashboardLoading(false);
    }
  }, [me]);

  const refreshAdminData = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const [usersData, designersData, mediaData] = await Promise.all([userService.list(), userService.listDesigners(), mediaService.listHomeCarousel()]);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setDesigners(Array.isArray(designersData) ? designersData : []);
      setMediaItems(Array.isArray(mediaData) ? mediaData : []);
    } catch {
      setError("No se pudieron cargar los datos administrativos.");
    }
  }, [isAdmin]);

  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      try {
        const [meData, site] = await Promise.all([authService.me(), siteService.getPublic()]);
        if (!mounted) return;
        setMe(meData);
        setSiteData(site);
        if (meData.role === "admin") {
          const [usersData, designersData, mediaData] = await Promise.all([userService.list(), userService.listDesigners(), mediaService.listHomeCarousel()]);
          if (!mounted) return;
          setUsers(Array.isArray(usersData) ? usersData : []);
          setDesigners(Array.isArray(designersData) ? designersData : []);
          setMediaItems(Array.isArray(mediaData) ? mediaData : []);
        }
        setCatalogProducts(Array.isArray(site.catalog) ? site.catalog : []);
      } catch {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        if (mounted) navigate("/admin");
      }
    }
    bootstrap();
    return () => { mounted = false; };
  }, [navigate]);

  useEffect(() => { if (me) loadOrders(); }, [me, loadOrders]);
  useEffect(() => { if (me) loadDashboardOrders(); }, [me, loadDashboardOrders]);
  useEffect(() => { if (me && isAdmin && activeTab === "history") loadHistoryOrders(); }, [me, isAdmin, activeTab, loadHistoryOrders]);

  function handleLogout() {
    const refresh = localStorage.getItem("refresh");
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    if (refresh) authService.logout(refresh).catch(() => null);
    navigate("/admin");
  }

  async function handleCopyTrackingLink(order) {
    const url = buildTrackingUrl(order);
    if (!url) {
      setError("El link se genera cuando se cambia el estado del pedido por primera vez.");
      setSuccess("");
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setSuccess("Link de seguimiento copiado.");
      setError("");
    } catch {
      setError("No se pudo copiar el link de seguimiento.");
      setSuccess("");
    }
  }

  function handleOrderFieldChange(orderId, field, value) {
    setOrders((current) =>
      current.map((item) => (item.id === orderId ? { ...item, [field]: value } : item))
    );
  }

  function handleCreateOrderFieldChange(tab, event) {
    const { name, value, type, files } = event.target;
    setCreateOrderForms((current) => ({
      ...current,
      [tab]: {
        ...current[tab],
        [name]: type === "file" ? files?.[0] || null : value,
      },
    }));
  }

  function resetCreateOrderForm(tab) {
    setCreateOrderForms((current) => ({
      ...current,
      [tab]: { ...EMPTY_BACKOFFICE_ORDER_FORM },
    }));
  }

  async function submitBackofficeOrder(tab, serviceName, event) {
    event.preventDefault();
    setCreatingOrder(true);
    setError("");
    setSuccess("");

    try {
      const current = createOrderForms[tab];
      const payload = new FormData();
      payload.append("service", serviceName);
      payload.append("name", current.name);
      payload.append("phone", current.phone);
      payload.append("email", current.email);
      payload.append("details", current.details);
      payload.append("extraData", JSON.stringify({ source: "backoffice-create-order" }));

      if (current.file) {
        payload.append("file", current.file);
      }

      await orderService.create(payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      resetCreateOrderForm(tab);
      await loadOrders();
      await loadDashboardOrders();
      setSuccess("Pedido creado y asignado correctamente.");
      setActiveTab("orders");
    } catch {
      setError("No se pudo crear el pedido.");
    } finally {
      setCreatingOrder(false);
    }
  }

  function updateSiteField(sectionKey, fieldKey, value) {
    setSiteData((current) => ({ ...current, [sectionKey]: { ...current?.[sectionKey], [fieldKey]: value } }));
  }

  function addAboutCard() {
    setSiteData((current) => ({
      ...current,
      about: {
        ...current.about,
        cards: [
          ...(current.about?.cards || []),
          { title: "Nuevo cuadro", text: "", image: null, imageFile: null, previewUrl: "" },
        ],
      },
    }));
  }

  function updateAboutCard(index, field, value) {
    setSiteData((current) => ({
      ...current,
      about: {
        ...current.about,
        cards: (current.about?.cards || []).map((card, cardIndex) => {
          if (cardIndex !== index) return card;
          if (field === "imageFile") {
            if (card.previewUrl) URL.revokeObjectURL(card.previewUrl);
            return {
              ...card,
              imageFile: value,
              previewUrl: value ? URL.createObjectURL(value) : "",
            };
          }
          return { ...card, [field]: value };
        }),
      },
    }));
  }

  function removeAboutCard(index) {
    setSiteData((current) => {
      const removed = current.about?.cards?.[index];
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return {
        ...current,
        about: {
          ...current.about,
          cards: (current.about?.cards || []).filter((_, cardIndex) => cardIndex !== index),
        },
      };
    });
  }

  function addCatalogProduct() {
    setCatalogProducts((current) => [
      ...current,
      { name: "Nuevo producto", description: "", price: "0", image: null, imageFile: null, previewUrl: "", active: true },
    ]);
  }

  function updateCatalogProduct(index, field, value) {
    setCatalogProducts((current) =>
      current.map((product, productIndex) => {
        if (productIndex !== index) return product;
        if (field === "imageFile") {
          if (product.previewUrl) URL.revokeObjectURL(product.previewUrl);
          return { ...product, imageFile: value, previewUrl: value ? URL.createObjectURL(value) : "" };
        }
        return { ...product, [field]: value };
      })
    );
  }

  function removeCatalogProduct(index) {
    setCatalogProducts((current) => {
      const removed = current[index];
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((_, productIndex) => productIndex !== index);
    });
  }

  async function saveCatalogProducts() {
    setSavingSection("catalog");
    try {
      const payload = new FormData();
      const products = catalogProducts.map((product, index) => {
        if (product.imageFile) payload.append(`image_${index}`, product.imageFile);
        return {
          id: product.id,
          name: product.name || "",
          description: product.description || "",
          price: product.price || 0,
          active: product.active !== false,
        };
      });
      payload.append("products", JSON.stringify(products));
      const updated = await siteService.updateCatalog(payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setCatalogProducts(Array.isArray(updated) ? updated : []);
      setSiteData((current) => ({ ...current, catalog: Array.isArray(updated) ? updated : [] }));
      setSuccess("Catálogo guardado.");
      setError("");
    } catch {
      setError("No se pudo guardar el catálogo.");
      setSuccess("");
    } finally {
      setSavingSection("");
    }
  }

  async function updateOrder(id, payload) {
    setSavingOrderId(id);
    setError("");
    setSuccess("");
    try {
      // El backend envia la notificacion de WhatsApp automaticamente al cambiar el estado.
      const updatedOrder = await withTimeout(
        orderService.update(id, payload, { timeout: ORDER_UPDATE_TIMEOUT_MS }),
        ORDER_UPDATE_TIMEOUT_MS + 1000,
        "La actualización tardó demasiado. Verificá la conexión con el backend."
      );
      setOrders((current) => current.map((order) => (order.id === id ? { ...order, ...updatedOrder } : order)));
      await loadOrders();
      await loadDashboardOrders();
      setSuccess("Estado actualizado y notificación enviada automáticamente.");
    } catch (err) {
      setError(err?.message || "No se pudo actualizar el pedido.");
      setSuccess("");
    } finally {
      setSavingOrderId(null);
    }
  }

  async function archiveOrder(order) {
    const reason = window.prompt(
      `Motivo para enviar el pedido #${order.id} al historial`,
      order.status === "Finalizado" || order.status === "Entregado" ? "Pedido terminado" : ""
    );

    if (reason === null) return;

    setSavingOrderId(order.id);
    setError("");
    setSuccess("");

    try {
      const archived = await orderService.archive(order.id, reason);
      setOrders((current) => current.filter((item) => item.id !== order.id));
      setHistoryOrders((current) => [archived, ...current.filter((item) => item.id !== order.id)]);
      await loadOrders();
      await loadDashboardOrders();
      if (activeTab === "history") await loadHistoryOrders();
      setSuccess("Pedido movido al historial.");
    } catch {
      setError("No se pudo mover el pedido al historial.");
      setSuccess("");
    } finally {
      setSavingOrderId(null);
    }
  }

  async function saveSiteSection(section) {
    setSavingSection(section.key);
    try {
      let updated;
      if (section.key === "about") {
        const payload = new FormData();
        const aboutData = siteData.about || {};
        const cards = (aboutData.cards || []).map((card, index) => {
          if (card.imageFile) payload.append(`image_${index}`, card.imageFile);
          return {
            id: card.id,
            title: card.title || "",
            text: card.text || "",
          };
        });
        payload.append("title", aboutData.title || "");
        payload.append("text", aboutData.text || "");
        payload.append("cards", JSON.stringify(cards));
        updated = await siteService.updateSection(section.endpoint, payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        updated = await siteService.updateSection(section.endpoint, siteData[section.key]);
      }
      setSiteData((current) => ({ ...current, [section.key]: updated }));
      setSuccess(`Sección ${section.title} guardada.`);
      setError("");
    } catch {
      setError(`No se pudo guardar ${section.title}.`);
      setSuccess("");
    } finally {
      setSavingSection("");
    }
  }

  async function handleCreateUser(event) {
    event.preventDefault();
    setUserActionId("create");
    try {
      await userService.create(userForm);
      setUserForm(EMPTY_USER_FORM);
      await refreshAdminData();
      setSuccess("Usuario creado.");
      setError("");
    } catch {
      setError("No se pudo crear el usuario.");
      setSuccess("");
    } finally {
      setUserActionId(null);
    }
  }

  async function handleUpdateUser(userId, payload, message) {
    setUserActionId(String(userId));
    try {
      await userService.update(userId, payload);
      await refreshAdminData();
      setSuccess(message);
      setError("");
    } catch {
      setError("No se pudo actualizar el usuario.");
      setSuccess("");
    } finally {
      setUserActionId(null);
    }
  }

  async function handleDeleteUser(userId) {
    if (!window.confirm("Se eliminará el usuario seleccionado.")) return;
    setUserActionId(`delete-${userId}`);
    try {
      await userService.remove(userId);
      await refreshAdminData();
      setSuccess("Usuario eliminado.");
      setError("");
    } catch {
      setError("No se pudo eliminar el usuario.");
      setSuccess("");
    } finally {
      setUserActionId(null);
    }
  }

  async function handleAdminPasswordUpdate(event) {
    event.preventDefault();
    if (!adminUser) {
      setError("No se encontró el usuario admin.");
      setSuccess("");
      return;
    }
    if (!adminPassword.trim()) {
      setError("Ingresá una nueva contraseña para admin.");
      setSuccess("");
      return;
    }

    setUserActionId("admin-password");
    try {
      await userService.update(adminUser.id, { password: adminPassword });
      setAdminPassword("");
      await refreshAdminData();
      setSuccess("Contraseña del admin actualizada.");
      setError("");
    } catch {
      setError("No se pudo actualizar la contraseña del admin.");
      setSuccess("");
    } finally {
      setUserActionId(null);
    }
  }

  async function handleExport() {
    setBackupBusy("export");
    try {
      const data = await adminToolsService.exportData();
      downloadJson("dystinta-backup.json", data);
      setSuccess("Respaldo exportado.");
      setError("");
    } catch {
      setError("No se pudo exportar el respaldo.");
      setSuccess("");
    } finally {
      setBackupBusy("");
    }
  }

  async function handleReset() {
    if (!window.confirm("Se restablecerán contenido, usuarios, pedidos y medios.")) return;
    setBackupBusy("reset");
    try {
      const data = await adminToolsService.reset();
      setSiteData(data.site);
      setUsers(Array.isArray(data.users) ? data.users : []);
      setOrders(Array.isArray(data.orders) ? data.orders : []);
      setCatalogProducts(Array.isArray(data.site?.catalog) ? data.site.catalog : []);
      setDashboardOrders(Array.isArray(data.orders) ? data.orders : []);
      setStats({ total: 0, new: 0, design: 0, done: 0 });
      await refreshAdminData();
      setSuccess("Sistema restablecido.");
      setError("");
    } catch {
      setError("No se pudo restablecer el sistema.");
      setSuccess("");
    } finally {
      setBackupBusy("");
    }
  }

  async function handleImport() {
    if (!importFile) {
      setError("Seleccioná un archivo JSON.");
      setSuccess("");
      return;
    }
    setBackupBusy("import");
    try {
      const data = await adminToolsService.importData(importFile);
      setSiteData(data.site);
      setUsers(Array.isArray(data.users) ? data.users : []);
      setOrders(Array.isArray(data.orders) ? data.orders : []);
      setCatalogProducts(Array.isArray(data.site?.catalog) ? data.site.catalog : []);
      setImportFile(null);
      await refreshAdminData();
      await loadOrders();
      await loadDashboardOrders();
      setSuccess("Respaldo importado.");
      setError("");
    } catch {
      setError("No se pudo importar el respaldo.");
      setSuccess("");
    } finally {
      setBackupBusy("");
    }
  }

  async function handleMediaUpload(slot, event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setMediaBusySlot(slot);
    try {
      await mediaService.uploadHomeCarousel(slot, file);
      await refreshAdminData();
      setSuccess(`Media del slot ${slot} actualizada.`);
      setError("");
    } catch {
      setError("No se pudo subir el archivo.");
      setSuccess("");
    } finally {
      setMediaBusySlot(null);
      event.target.value = "";
    }
  }

  async function handleMediaDelete(slot) {
    setMediaBusySlot(slot);
    try {
      await mediaService.removeHomeCarousel(slot);
      await refreshAdminData();
      setSuccess(`Media del slot ${slot} eliminada.`);
      setError("");
    } catch {
      setError("No se pudo eliminar el archivo.");
      setSuccess("");
    } finally {
      setMediaBusySlot(null);
    }
  }

  if (!me || !siteData) {
    return <div className="section"><div className="container"><div className="notice">Cargando...</div></div></div>;
  }

  return (
    <div id="panelView">
      <header className="topbar">
        <div className="container nav">
          <Link className="brand" to="/">
            <img src={logo} alt="logo" />
            <div>
              <span data-company>{companyName}</span>
              <small>Panel interno</small>
            </div>
          </Link>
          <nav className="nav-links">
            <Link to="/">Sitio</Link>
            <Link to="/pedidos">Nuevo pedido</Link>
            <Link to="/admin">Back office</Link>
            <button id="logoutPanel" type="button" onClick={handleLogout}>Salir</button>
          </nav>
        </div>
      </header>

      <section className="section">
        <div className="container">
          <div className="panel-heading">
            <div>
              <span className="badge">{isAdmin ? "Administrador" : "Diseñador"}</span>
              <h2>Operación conectada al backend</h2>
              <p className="lead">Este panel usa la API Django para pedidos y, en admin, también para contenido, usuarios, carrusel y respaldos.</p>
            </div>
          </div>

          {success ? <div className="notice">{success}</div> : null}
          {error ? <div className="notice danger">{error}</div> : null}

          <div className="tabs">
            <button className={`tab-btn${activeTab === "dashboard" ? " active" : ""}`} type="button" onClick={() => setActiveTab("dashboard")}>Dashboard</button>
            <button className={`tab-btn${activeTab === "orders" ? " active" : ""}`} type="button" onClick={() => setActiveTab("orders")}>Pedidos</button>
            <button className={`tab-btn${activeTab === "create-order" ? " active" : ""}`} type="button" onClick={() => setActiveTab("create-order")}>Crear pedido</button>
            {isAdmin ? <button className={`tab-btn${activeTab === "history" ? " active" : ""}`} type="button" onClick={() => setActiveTab("history")}>Historial</button> : null}
            {isAdmin ? <button className={`tab-btn${activeTab === "content" ? " active" : ""}`} type="button" onClick={() => setActiveTab("content")}>Contenido</button> : null}
            {isAdmin ? <button className={`tab-btn${activeTab === "catalog" ? " active" : ""}`} type="button" onClick={() => setActiveTab("catalog")}>Catálogo</button> : null}
            {isAdmin ? <button className={`tab-btn${activeTab === "whatsapp" ? " active" : ""}`} type="button" onClick={() => setActiveTab("whatsapp")}>WhatsApp</button> : null}
            {isAdmin ? <button className={`tab-btn${activeTab === "users" ? " active" : ""}`} type="button" onClick={() => setActiveTab("users")}>Usuarios</button> : null}
            {isAdmin ? <button className={`tab-btn${activeTab === "backup" ? " active" : ""}`} type="button" onClick={() => setActiveTab("backup")}>Respaldo</button> : null}
          </div>

          {activeTab === "dashboard" ? <BackofficeDashboard orders={dashboardOrders} loading={dashboardLoading} /> : null}

          {activeTab === "create-order" ? (
            <div className="panel-stack">
              <section className="card panel-block">
                <div className="panel-section-header">
                  <div>
                    <span className="badge">Backoffice</span>
                    <h3>Crear pedido</h3>
                  </div>
                </div>
                <div className="order-menu-bar" role="tablist" aria-label="Tipos de pedidos">
                  {BACKOFFICE_ORDER_TABS.map((tab) => (
                    <button
                      className={`order-tab${createOrderTab === tab.key ? " active" : ""}`}
                      type="button"
                      key={tab.key}
                      onClick={() => setCreateOrderTab(tab.key)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </section>

              <div className="order-panels">
                {BACKOFFICE_ORDER_TABS.map((tab) => {
                  const form = createOrderForms[tab.key];
                  return (
                    <section className={`order-panel${createOrderTab === tab.key ? " active" : ""}`} key={tab.key}>
                      <div className="panel-header">
                        <span className="badge">Pedido</span>
                        <h3>{tab.label}</h3>
                        <p>{tab.description}</p>
                      </div>
                      <form className="order-form order-layout" onSubmit={(event) => submitBackofficeOrder(tab.key, tab.service, event)}>
                        <div className="form-row">
                          <label>Nombre<input name="name" required value={form.name} onChange={(event) => handleCreateOrderFieldChange(tab.key, event)} /></label>
                          <label>Teléfono<input name="phone" required value={form.phone} onChange={(event) => handleCreateOrderFieldChange(tab.key, event)} /></label>
                        </div>
                        <label>Email <span className="hint">(opcional)</span><input type="email" name="email" value={form.email} onChange={(event) => handleCreateOrderFieldChange(tab.key, event)} /></label>
                        <label>Detalles<textarea name="details" placeholder="Indicá colores, ubicación, fechas, medidas y cualquier referencia útil." value={form.details} onChange={(event) => handleCreateOrderFieldChange(tab.key, event)} /></label>
                        <label>Adjuntar archivo<input type="file" name="file" onChange={(event) => handleCreateOrderFieldChange(tab.key, event)} /></label>
                        <div className="order-actions">
                          <button className="btn soft" type="button" onClick={() => resetCreateOrderForm(tab.key)} disabled={creatingOrder}>Limpiar</button>
                          <button className="btn" type="submit" disabled={creatingOrder}>{creatingOrder ? "Guardando..." : "Crear pedido"}</button>
                        </div>
                      </form>
                    </section>
                  );
                })}
              </div>
            </div>
          ) : null}

          {activeTab === "orders" ? (
            <>
              <div className="kpis">
                <div className="kpi"><span>Total pedidos</span><strong id="kpiTotal">{stats.total}</strong></div>
                <div className="kpi"><span>Recibidos</span><strong id="kpiNew">{stats.new}</strong></div>
                <div className="kpi"><span>En diseño</span><strong id="kpiDesign">{stats.design}</strong></div>
                <div className="kpi"><span>Finalizados</span><strong id="kpiDone">{stats.done}</strong></div>
              </div>

              <div className="card panel-block">
                <div className="form-row">
                  <label>
                    Estado
                    <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
                      <option value="">Todos</option>
                      {STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}
                    </select>
                  </label>
                  <label>
                    Servicio
                    <select value={filters.service} onChange={(event) => setFilters((current) => ({ ...current, service: event.target.value }))}>
                      <option value="">Todos</option>
                      {SERVICE_OPTIONS.map((service) => <option key={service} value={service}>{service}</option>)}
                    </select>
                  </label>
                  <label>
                    Buscar
                    <input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Cliente, teléfono, detalle..." />
                  </label>
                </div>
              </div>

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Fecha</th><th>N° pedido</th><th>Cliente</th><th>Servicio</th><th>Archivo</th><th>Estado</th><th>Progreso</th><th>Diseñador</th><th>Notas</th><th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody id="ordersBody">
                    {loading ? (
                      <tr><td colSpan="10">Cargando pedidos...</td></tr>
                    ) : orders.length ? (
                      orders.map((order) => (
                        <tr key={order.id}>
                          <td>{order.createdAt ? new Date(order.createdAt).toLocaleString() : ""}</td>
                          <td>
                            <input
                              value={order.orderNumber || ""}
                              onChange={(event) => handleOrderFieldChange(order.id, "orderNumber", event.target.value)}
                              placeholder="Ej: 12"
                              disabled={savingOrderId === order.id}
                            />
                          </td>
                          <td><strong>{order.name}</strong><br /><span className="hint">{order.phone}</span></td>
                          <td>
                            {order.service}<br />
                            <span className="hint">{order.quantity || ""}</span>
                            <DtfOrderBreakdown order={order} />
                            <CatalogOrderBreakdown order={order} />
                          </td>
                          <td>
                            <div className="order-file-list">
                              {order.file ? <a href={order.file} target="_blank" rel="noreferrer">{order.fileName || "Archivo principal"}</a> : order.fileName || "Sin archivo"}
                              {Array.isArray(order.attachments) && order.attachments.length ? (
                                <div className="order-attachment-list">
                                  {order.attachments.map((attachment, attachmentIndex) => (
                                    <a href={attachment.file} target="_blank" rel="noreferrer" key={attachment.id || attachment.file}>
                                      {(attachment.originalName || "").startsWith("Armado DTF") ? "Armado" : `Adjunto ${attachmentIndex + 1}`}: {attachment.originalName || "Ver imagen"}
                                    </a>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </td>
                          <td>
                            <span className={`status ${statusClass(order.status)}`}>{order.status}</span><br />
                            {isWaitingForCustomerApproval(order.status) ? (
                              <span className="status s-aprobacion order-auto-notice">Esperando respuesta del cliente</span>
                            ) : null}
                            <select value={order.status} onChange={(event) => handleOrderFieldChange(order.id, "status", event.target.value)} disabled={savingOrderId === order.id}>
                              {STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}
                            </select>
                          </td>
                          <td>
                            <div className="panel-progress-cell">
                              <div className="tracking-progress-bar mini" aria-label={`Progreso ${order.currentProgress || 0}%`}>
                                <span style={{ width: `${order.currentProgress || 0}%` }} />
                              </div>
                              <strong>{order.currentProgress || 0}%</strong>
                              <span className="hint">{order.statusMessage || ""}</span>
                            </div>
                          </td>
                          <td>
                            {isAdmin ? (
                              <select value={order.assignedTo?.id || ""} onChange={(event) => handleOrderFieldChange(order.id, "assignedTo", event.target.value ? designers.find((designer) => designer.id === Number(event.target.value)) || null : null)} disabled={savingOrderId === order.id}>
                                <option value="">Sin asignar</option>
                                {designers.map((designer) => <option key={designer.id} value={designer.id}>{designer.name}</option>)}
                              </select>
                            ) : order.assignedTo?.name || "Sin asignar"}
                          </td>
                          <td>
                            <textarea
                              value={order.notes || ""}
                              onChange={(event) => handleOrderFieldChange(order.id, "notes", event.target.value)}
                            />
                          </td>
                          <td>
                            <div className="panel-action-row">
                              <button
                                className="btn small"
                                type="button"
                                onClick={() =>
                                  updateOrder(order.id, {
                                    status: order.status,
                                    assignedTo: order.assignedTo?.id || null,
                                    notes: order.notes || "",
                                    orderNumber: order.orderNumber || "",
                                  })
                                }
                                disabled={savingOrderId === order.id}
                              >
                                {savingOrderId === order.id ? "Guardando..." : "Guardar pedido"}
                              </button>
                              <button className="btn soft small" type="button" onClick={() => handleCopyTrackingLink(order)}>
                                Copiar seguimiento
                              </button>
                              {isAdmin ? (
                                <button
                                  className="btn soft small"
                                  type="button"
                                  onClick={() => archiveOrder(order)}
                                  disabled={savingOrderId === order.id}
                                >
                                  Enviar a historial
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="10">No hay pedidos aún.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}

          {isAdmin && activeTab === "history" ? (
            <div className="panel-stack">
              <section className="card panel-block">
                <div className="panel-section-header">
                  <div>
                    <span className="badge">Historial</span>
                    <h3>Pedidos archivados</h3>
                  </div>
                  <button className="btn soft small" type="button" onClick={loadHistoryOrders} disabled={historyLoading}>
                    {historyLoading ? "Actualizando..." : "Actualizar historial"}
                  </button>
                </div>
                <p className="hint">Los pedidos enviados al historial dejan de aparecer en Pedidos, pero se conservan con sus archivos, diseñador y estado.</p>
              </section>

              <section className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Archivado</th><th>N° pedido</th><th>Cliente</th><th>Servicio</th><th>Archivo</th><th>Estado</th><th>Diseñador</th><th>Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyLoading ? (
                      <tr><td colSpan="8">Cargando historial...</td></tr>
                    ) : historyOrders.length ? (
                      historyOrders.map((order) => (
                        <tr key={order.id}>
                          <td>
                            {order.archivedAt ? new Date(order.archivedAt).toLocaleString() : "-"}
                            <br />
                            <span className="hint">{order.archivedBy?.name || order.archivedBy?.username || ""}</span>
                          </td>
                          <td>{order.orderNumber || "-"}</td>
                          <td><strong>{order.name}</strong><br /><span className="hint">{order.phone}</span></td>
                          <td>{order.service}<br /><span className="hint">{order.quantity || ""}</span><CatalogOrderBreakdown order={order} /></td>
                          <td>
                            <div className="order-file-list">
                              {order.file ? <a href={order.file} target="_blank" rel="noreferrer">{order.fileName || "Archivo principal"}</a> : order.fileName || "Sin archivo"}
                              {Array.isArray(order.attachments) && order.attachments.length ? (
                                <div className="order-attachment-list">
                                  {order.attachments.map((attachment, attachmentIndex) => (
                                    <a href={attachment.file} target="_blank" rel="noreferrer" key={attachment.id || attachment.file}>
                                      {(attachment.originalName || "").startsWith("Armado DTF") ? "Armado" : `Adjunto ${attachmentIndex + 1}`}: {attachment.originalName || "Ver imagen"}
                                    </a>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </td>
                          <td><span className={`status ${statusClass(order.status)}`}>{order.status}</span></td>
                          <td>{order.assignedTo?.name || "Sin asignar"}</td>
                          <td>{order.archivedReason || "-"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="8">Todavía no hay pedidos en historial.</td></tr>
                    )}
                  </tbody>
                </table>
              </section>
            </div>
          ) : null}

          {isAdmin && activeTab === "content" ? (
            <div className="panel-stack">
              {SITE_SECTIONS.map((section) => (
                <section className="card panel-block" key={section.key}>
                  <div className="panel-section-header">
                    <div><span className="badge">{section.title}</span><h3>{section.title}</h3></div>
                    <button className="btn small" type="button" onClick={() => saveSiteSection(section)} disabled={savingSection === section.key}>
                      {savingSection === section.key ? "Guardando..." : "Guardar"}
                    </button>
                  </div>
                  <div className="panel-form-grid">
                    {section.fields.map((field) => (
                      <label key={field.key} className={field.multiline ? "panel-field-full" : ""}>
                        {field.label}
                        {field.multiline ? (
                          <textarea value={siteData?.[section.key]?.[field.key] ?? ""} onChange={(event) => updateSiteField(section.key, field.key, event.target.value)} />
                        ) : (
                          <input type={field.type || "text"} step={field.step} value={siteData?.[section.key]?.[field.key] ?? ""} onChange={(event) => updateSiteField(section.key, field.key, event.target.value)} />
                        )}
                      </label>
                    ))}
                  </div>
                  {section.key === "about" ? (
                    <div className="about-card-editor">
                      <div className="panel-section-header">
                        <div><span className="badge">Cuadros</span><h3>Texto e imágenes de asesoría</h3></div>
                        <button className="btn small" type="button" onClick={addAboutCard}>Agregar cuadro</button>
                      </div>
                      <div className="about-card-editor-grid">
                        {(siteData.about?.cards || []).map((card, index) => (
                          <article className="about-card-editor-item" key={card.id || `new-${index}`}>
                            <div className="about-card-preview">
                              {card.previewUrl || card.image ? <img src={card.previewUrl || card.image} alt={card.title || `Cuadro ${index + 1}`} /> : <span>Imagen</span>}
                            </div>
                            <label>Título<input value={card.title || ""} onChange={(event) => updateAboutCard(index, "title", event.target.value)} /></label>
                            <label>Texto<textarea value={card.text || ""} onChange={(event) => updateAboutCard(index, "text", event.target.value)} /></label>
                            <label>Imagen<input type="file" accept="image/*" onChange={(event) => updateAboutCard(index, "imageFile", event.target.files?.[0] || null)} /></label>
                            <button className="btn soft small" type="button" onClick={() => removeAboutCard(index)}>Eliminar cuadro</button>
                          </article>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </section>
              ))}

              <section className="card panel-block">
                <div className="panel-section-header">
                  <div><span className="badge">Carrusel</span><h3>Media home carousel</h3></div>
                </div>
                <div className="admin-media-grid">
                  {[1, 2, 3].map((slot) => {
                    const item = mediaItems.find((media) => media.slot === slot);
                    return (
                      <article className="media-box" key={slot}>
                        <strong>Slot {slot}</strong>
                        {item?.file ? <video className="video-media" src={item.file} controls preload="metadata" /> : <div className="notice">Sin archivo cargado.</div>}
                        <span className="hint">{item?.original_name || "Usando fallback local"}</span>
                        <input type="file" accept="video/*" onChange={(event) => handleMediaUpload(slot, event)} disabled={mediaBusySlot === slot} />
                        <button className="btn soft small" type="button" onClick={() => handleMediaDelete(slot)} disabled={mediaBusySlot === slot}>
                          {mediaBusySlot === slot ? "Procesando..." : "Eliminar"}
                        </button>
                      </article>
                    );
                  })}
                </div>
              </section>
            </div>
          ) : null}

          {isAdmin && activeTab === "catalog" ? (
            <section className="card panel-block">
              <div className="panel-section-header">
                <div><span className="badge">Catálogo</span><h3>Productos del front</h3></div>
                <div className="panel-action-row">
                  <button className="btn soft small" type="button" onClick={addCatalogProduct}>Agregar producto</button>
                  <button className="btn small" type="button" onClick={saveCatalogProducts} disabled={savingSection === "catalog"}>
                    {savingSection === "catalog" ? "Guardando..." : "Guardar catálogo"}
                  </button>
                </div>
              </div>
              <div className="catalog-editor-grid">
                {catalogProducts.map((product, index) => (
                  <article className="catalog-editor-item" key={product.id || `product-${index}`}>
                    <div className="catalog-editor-preview">
                      {product.previewUrl || product.image ? <img src={product.previewUrl || product.image} alt={product.name || `Producto ${index + 1}`} /> : <span>Imagen</span>}
                    </div>
                    <label>Nombre<input value={product.name || ""} onChange={(event) => updateCatalogProduct(index, "name", event.target.value)} /></label>
                    <label>Descripción<textarea value={product.description || ""} onChange={(event) => updateCatalogProduct(index, "description", event.target.value)} /></label>
                    <label>Precio<input type="number" min="0" step="1" value={product.price || ""} onChange={(event) => updateCatalogProduct(index, "price", event.target.value)} /></label>
                    <label>Imagen<input type="file" accept="image/*" onChange={(event) => updateCatalogProduct(index, "imageFile", event.target.files?.[0] || null)} /></label>
                    <label className="panel-inline-toggle"><input type="checkbox" checked={product.active !== false} onChange={(event) => updateCatalogProduct(index, "active", event.target.checked)} />Visible</label>
                    <button className="btn soft small" type="button" onClick={() => removeCatalogProduct(index)}>Eliminar producto</button>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {isAdmin && activeTab === "whatsapp" ? <WhatsAppAdminPanel /> : null}

          {isAdmin && activeTab === "users" ? (
            <div className="panel-stack">
              <section className="card panel-block">
                <div className="panel-section-header">
                  <div><span className="badge">Usuarios</span><h3>Crear usuario</h3></div>
                </div>
                <form className="panel-form-grid" onSubmit={handleCreateUser}>
                  <label>Usuario<input value={userForm.username} onChange={(event) => setUserForm((current) => ({ ...current, username: event.target.value }))} required /></label>
                  <label>Contraseña<input type="password" value={userForm.password} onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))} required /></label>
                  <label>Rol<select value={userForm.role} onChange={(event) => setUserForm((current) => ({ ...current, role: event.target.value }))}><option value="admin">admin</option><option value="designer">designer</option></select></label>
                  <label>Nombre<input value={userForm.name} onChange={(event) => setUserForm((current) => ({ ...current, name: event.target.value }))} /></label>
                  <label className="panel-inline-toggle"><input type="checkbox" checked={userForm.is_active} onChange={(event) => setUserForm((current) => ({ ...current, is_active: event.target.checked }))} />Activo</label>
                  <div><button className="btn" type="submit" disabled={userActionId === "create"}>{userActionId === "create" ? "Guardando..." : "Crear usuario"}</button></div>
                </form>
              </section>

              <section className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th>Usuario</th><th>Rol</th><th>Nombre</th><th>Activo</th><th>Acciones</th></tr>
                  </thead>
                  <tbody id="usersBody">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>{user.username}</td><td>{user.role}</td><td>{user.name || "-"}</td><td>{user.is_active ? "Sí" : "No"}</td>
                        <td>
                          <div className="panel-action-row">
                            <button className="btn soft small" type="button" onClick={() => handleUpdateUser(user.id, { is_active: !user.is_active }, "Estado de usuario actualizado.")} disabled={Boolean(userActionId)}>{user.is_active ? "Desactivar" : "Activar"}</button>
                            <button className="btn soft small" type="button" onClick={() => { const name = window.prompt("Nuevo nombre", user.name || ""); if (name === null) return; handleUpdateUser(user.id, { name }, "Nombre actualizado."); }} disabled={Boolean(userActionId)}>Renombrar</button>
                            <button className="btn soft small" type="button" onClick={() => { const password = window.prompt("Nueva contraseña"); if (!password) return; handleUpdateUser(user.id, { password }, "Contraseña actualizada."); }} disabled={Boolean(userActionId)}>Reset pass</button>
                            <button className="btn soft small" type="button" onClick={() => handleDeleteUser(user.id)} disabled={Boolean(userActionId)}>Eliminar</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </div>
          ) : null}

          {isAdmin && activeTab === "backup" ? (
            <div className="panel-stack">
              <section className="card panel-block">
                <div className="panel-section-header">
                  <div><span className="badge">Admin</span><h3>Nueva contraseña para admin</h3></div>
                </div>
                <form className="panel-password-row" onSubmit={handleAdminPasswordUpdate}>
                  <label>
                    Usuario
                    <input value={adminUser?.username || "admin"} disabled />
                  </label>
                  <label>
                    Nueva contraseña
                    <input type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} placeholder="Nueva contraseña para admin" />
                  </label>
                  <div className="panel-password-submit">
                    <button className="btn" type="submit" disabled={userActionId === "admin-password"}>
                      {userActionId === "admin-password" ? "Guardando..." : "Actualizar contraseña"}
                    </button>
                  </div>
                </form>
              </section>

              <section className="card panel-block">
                <div className="panel-section-header">
                  <div><span className="badge">Respaldo</span><h3>Exportar, importar y resetear</h3></div>
                </div>
                <div className="panel-action-row">
                  <button className="btn" type="button" onClick={handleExport} disabled={backupBusy === "export"}>{backupBusy === "export" ? "Exportando..." : "Exportar JSON"}</button>
                  <button className="btn soft" type="button" onClick={handleReset} disabled={backupBusy === "reset"}>{backupBusy === "reset" ? "Restableciendo..." : "Reset completo"}</button>
                </div>
                <div className="panel-import-row">
                  <input type="file" accept=".json,application/json" onChange={(event) => setImportFile(event.target.files?.[0] || null)} />
                  <button className="btn" type="button" onClick={handleImport} disabled={backupBusy === "import"}>{backupBusy === "import" ? "Importando..." : "Importar JSON"}</button>
                </div>
              </section>

              <section className="card panel-block">
                <span className="badge">Cobertura API</span>
                <h3>Endpoints administrativos ya conectados</h3>
                <div className="panel-endpoint-grid">
                  <code>GET /api/auth/me/</code><code>GET /api/orders/</code><code>GET /api/orders/stats/</code><code>PATCH /api/orders/:id/</code>
                  <code>GET /api/users/</code><code>POST /api/users/</code><code>PATCH /api/users/:id/</code><code>DELETE /api/users/:id/</code>
                  <code>GET/PATCH /api/site/*</code><code>GET/POST/DELETE /api/media/home-carousel/*</code><code>GET /api/admin/export/</code><code>POST /api/admin/import/</code><code>POST /api/admin/reset/</code>
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
