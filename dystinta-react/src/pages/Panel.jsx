import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo-dystinta.jpg";
import { adminToolsService, authService, mediaService, orderService, siteService, userService } from "../services/backend";

const STATUS_OPTIONS = ["Nuevo", "En revisión", "En diseño", "Aprobación cliente", "Producción", "Finalizado"];
const SERVICE_OPTIONS = ["DTF Textil", "DTF UV", "Serigrafía"];
const EMPTY_USER_FORM = { username: "", password: "", role: "designer", name: "", is_active: true };
const SITE_SECTIONS = [
  { key: "general", title: "General", endpoint: "general", fields: [
    { key: "companyName", label: "Empresa" }, { key: "slogan", label: "Slogan" },
    { key: "whatsapp", label: "WhatsApp visible" }, { key: "whatsappRaw", label: "WhatsApp raw" },
    { key: "instagram", label: "Instagram", type: "url" }, { key: "facebook", label: "Facebook", type: "url" },
    { key: "tiktok", label: "TikTok", type: "url" }, { key: "email", label: "Email", type: "email" },
    { key: "address", label: "Dirección" }, { key: "map", label: "Mapa embed", type: "url" },
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
  return { Nuevo: "s-nuevo", "En revisión": "s-revision", "En diseño": "s-diseno", "Aprobación cliente": "s-aprobacion", Producción: "s-produccion", Finalizado: "s-finalizado" }[status] || "s-nuevo";
}

// eslint-disable-next-line no-unused-vars
function buildWhatsAppMessage(order) {
  return `Pedido ${order.service}
Cliente: ${order.name}
Teléfono: ${order.phone}
Cantidad: ${order.quantity || ""}
Archivo: ${order.fileName || "Sin archivo"}
Estado: ${order.status}
Notas: ${order.notes || ""}`;
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

export default function Panel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("orders");
  const [me, setMe] = useState(null);
  const [siteData, setSiteData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [designers, setDesigners] = useState([]);
  const [mediaItems, setMediaItems] = useState([]);
  const [stats, setStats] = useState({ total: 0, new: 0, design: 0, done: 0 });
  const [filters, setFilters] = useState({ status: "", service: "", search: "" });
  const [userForm, setUserForm] = useState(EMPTY_USER_FORM);
  const [adminPassword, setAdminPassword] = useState("");
  const [importFile, setImportFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [savingOrderId, setSavingOrderId] = useState(null);
  const [savingSection, setSavingSection] = useState("");
  const [userActionId, setUserActionId] = useState(null);
  const [backupBusy, setBackupBusy] = useState("");
  const [mediaBusySlot, setMediaBusySlot] = useState(null);

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

  function handleLogout() {
    const refresh = localStorage.getItem("refresh");
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    if (refresh) authService.logout(refresh).catch(() => null);
    navigate("/admin");
  }

  function handleWhatsApp(order) {
    if (!order.whatsappUrl) {
      setError("El pedido no tiene un teléfono válido para WhatsApp.");
      setSuccess("");
      return;
    }

    window.open(order.whatsappUrl, "_blank");
  }

  function handleOrderFieldChange(orderId, field, value) {
    setOrders((current) =>
      current.map((item) => (item.id === orderId ? { ...item, [field]: value } : item))
    );
  }

  function updateSiteField(sectionKey, fieldKey, value) {
    setSiteData((current) => ({ ...current, [sectionKey]: { ...current?.[sectionKey], [fieldKey]: value } }));
  }

  async function updateOrder(id, payload) {
    setSavingOrderId(id);
    setError("");
    try {
      await orderService.update(id, payload);
      await loadOrders();
      setSuccess("Pedido actualizado.");
    } catch {
      setError("No se pudo actualizar el pedido.");
    } finally {
      setSavingOrderId(null);
    }
  }

  async function saveSiteSection(section) {
    setSavingSection(section.key);
    try {
      const updated = await siteService.updateSection(section.endpoint, siteData[section.key]);
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
      setImportFile(null);
      await refreshAdminData();
      await loadOrders();
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
            <button className={`tab-btn${activeTab === "orders" ? " active" : ""}`} type="button" onClick={() => setActiveTab("orders")}>Pedidos</button>
            {isAdmin ? <button className={`tab-btn${activeTab === "content" ? " active" : ""}`} type="button" onClick={() => setActiveTab("content")}>Contenido</button> : null}
            {isAdmin ? <button className={`tab-btn${activeTab === "users" ? " active" : ""}`} type="button" onClick={() => setActiveTab("users")}>Usuarios</button> : null}
            {isAdmin ? <button className={`tab-btn${activeTab === "backup" ? " active" : ""}`} type="button" onClick={() => setActiveTab("backup")}>Respaldo</button> : null}
          </div>

          {activeTab === "orders" ? (
            <>
              <div className="kpis">
                <div className="kpi"><span>Total pedidos</span><strong id="kpiTotal">{stats.total}</strong></div>
                <div className="kpi"><span>Nuevos</span><strong id="kpiNew">{stats.new}</strong></div>
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
                      <th>Fecha</th><th>Cliente</th><th>Servicio</th><th>Archivo</th><th>Estado</th><th>Diseñador</th><th>Notas</th><th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody id="ordersBody">
                    {loading ? (
                      <tr><td colSpan="8">Cargando pedidos...</td></tr>
                    ) : orders.length ? (
                      orders.map((order) => (
                        <tr key={order.id}>
                          <td>{order.createdAt ? new Date(order.createdAt).toLocaleString() : ""}</td>
                          <td><strong>{order.name}</strong><br /><span className="hint">{order.phone}</span></td>
                          <td>{order.service}<br /><span className="hint">{order.quantity || ""}</span></td>
                          <td>{order.file ? <a href={order.file} target="_blank" rel="noreferrer">{order.fileName || "Ver archivo"}</a> : order.fileName || "Sin archivo"}</td>
                          <td>
                            <span className={`status ${statusClass(order.status)}`}>{order.status}</span><br />
                            <select value={order.status} onChange={(event) => handleOrderFieldChange(order.id, "status", event.target.value)} disabled={savingOrderId === order.id}>
                              {STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}
                            </select>
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
                                  })
                                }
                                disabled={savingOrderId === order.id}
                              >
                                {savingOrderId === order.id ? "Guardando..." : "Actualizar estado"}
                              </button>
                              <button className="btn small green" type="button" onClick={() => handleWhatsApp(order)}>
                                Enviar WhatsApp
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="8">No hay pedidos aún.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
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
