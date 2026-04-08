import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import logo from "../assets/logo-dystinta.jpg";

const STATUS_OPTIONS = [
  "Nuevo",
  "En revisión",
  "En diseño",
  "Aprobación cliente",
  "Producción",
  "Finalizado",
];

function statusClass(status) {
  return {
    Nuevo: "s-nuevo",
    "En revisión": "s-revision",
    "En diseño": "s-diseno",
    "Aprobación cliente": "s-aprobacion",
    Producción: "s-produccion",
    Finalizado: "s-finalizado",
  }[status] || "s-nuevo";
}

function buildWhatsAppMessage(order) {
  return `Pedido ${order.service}
Cliente: ${order.name}
Teléfono: ${order.phone}
Cantidad: ${order.quantity || ""}
Archivo: ${order.fileName || "Sin archivo"}
Estado: ${order.status}
Notas: ${order.notes || ""}`;
}

export default function Panel() {
  const navigate = useNavigate();

  const [me, setMe] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [whatsappRaw, setWhatsappRaw] = useState("");
  const [orders, setOrders] = useState([]);
  const [designers, setDesigners] = useState([]);
  const [stats, setStats] = useState({ total: 0, new: 0, design: 0, done: 0 });
  const [filters, setFilters] = useState({ status: "", service: "", search: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingOrderId, setSavingOrderId] = useState(null);

  const queryParams = useMemo(() => {
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.service) params.service = filters.service;
    if (filters.search) params.search = filters.search;
    return params;
  }, [filters]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [ordersRes, statsRes] = await Promise.all([
        api.get("/orders/", { params: queryParams }),
        api.get("/orders/stats/", { params: queryParams }),
      ]);

      setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
      setStats(statsRes.data || { total: 0, new: 0, design: 0, done: 0 });
    } catch (err) {
      setError("No se pudieron cargar los pedidos.");
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const [meRes, siteRes, designersRes] = await Promise.all([
          api.get("/auth/me/"),
          api.get("/site/public/"),
          api.get("/users/designers/"),
        ]);

        if (!mounted) return;

        setMe(meRes.data);
        setCompanyName(siteRes.data?.general?.companyName || "");
        setWhatsappRaw(siteRes.data?.general?.whatsappRaw || "");
        setDesigners(Array.isArray(designersRes.data) ? designersRes.data : []);
      } catch (err) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/admin");
      }
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (!me) return;
    loadOrders();
  }, [me, loadOrders]);

  async function updateOrder(id, payload) {
    setSavingOrderId(id);
    setError("");

    try {
      await api.patch(`/orders/${id}/`, payload);
      await loadOrders();
    } catch (err) {
      setError("No se pudo actualizar el pedido.");
    } finally {
      setSavingOrderId(null);
    }
  }

  function handleLogout() {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    navigate("/admin");
  }

  function handleWhatsApp(order) {
    const message = encodeURIComponent(buildWhatsAppMessage(order));
    const target = whatsappRaw ? `https://wa.me/${whatsappRaw}?text=${message}` : `https://wa.me/?text=${message}`;
    window.open(target, "_blank");
  }

  if (!me) {
    return (
      <div className="section">
        <div className="container">
          <div className="notice">Cargando...</div>
        </div>
      </div>
    );
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
            <button id="logoutPanel" type="button" onClick={handleLogout}>
              Salir
            </button>
          </nav>
        </div>
      </header>

      <section className="section">
        <div className="container">
          {error ? <div className="notice danger">{error}</div> : null}

          <div className="kpis">
            <div className="kpi">
              <span>Total pedidos</span>
              <strong id="kpiTotal">{stats.total}</strong>
            </div>
            <div className="kpi">
              <span>Nuevos</span>
              <strong id="kpiNew">{stats.new}</strong>
            </div>
            <div className="kpi">
              <span>En diseño</span>
              <strong id="kpiDesign">{stats.design}</strong>
            </div>
            <div className="kpi">
              <span>Finalizados</span>
              <strong id="kpiDone">{stats.done}</strong>
            </div>
          </div>

          <div className="card" style={{ marginBottom: "1rem" }}>
            <div className="form-row">
              <label>
                Estado
                <select
                  value={filters.status}
                  onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                >
                  <option value="">Todos</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>

              <label>
                Servicio
                <select
                  value={filters.service}
                  onChange={(e) => setFilters((prev) => ({ ...prev, service: e.target.value }))}
                >
                  <option value="">Todos</option>
                  <option value="DTF Textil">DTF Textil</option>
                  <option value="DTF UV">DTF UV</option>
                  <option value="Serigrafía">Serigrafía</option>
                </select>
              </label>

              <label>
                Buscar
                <input
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                  placeholder="Cliente, teléfono, detalle..."
                />
              </label>
            </div>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Servicio</th>
                  <th>Archivo</th>
                  <th>Estado</th>
                  <th>Diseñador</th>
                  <th>Notas</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody id="ordersBody">
                {loading ? (
                  <tr>
                    <td colSpan="8">Cargando pedidos...</td>
                  </tr>
                ) : orders.length ? (
                  orders.map((order) => (
                    <tr key={order.id}>
                      <td>{order.createdAt ? new Date(order.createdAt).toLocaleString() : ""}</td>
                      <td>
                        <strong>{order.name}</strong>
                        <br />
                        <span className="hint">{order.phone}</span>
                      </td>
                      <td>
                        {order.service}
                        <br />
                        <span className="hint">{order.quantity || ""}</span>
                      </td>
                      <td>{order.fileName || "Sin archivo"}</td>
                      <td>
                        <span className={`status ${statusClass(order.status)}`}>{order.status}</span>
                        <br />
                        <select
                          value={order.status}
                          onChange={(e) => updateOrder(order.id, { status: e.target.value })}
                          disabled={savingOrderId === order.id}
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status}>{status}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          value={order.assignedTo?.id || ""}
                          onChange={(e) =>
                            updateOrder(order.id, {
                              assignedTo: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                          disabled={savingOrderId === order.id}
                        >
                          <option value="">Sin asignar</option>
                          {designers.map((designer) => (
                            <option key={designer.id} value={designer.id}>
                              {designer.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <textarea
                          value={order.notes || ""}
                          onChange={(e) => {
                            const nextValue = e.target.value;
                            setOrders((prev) =>
                              prev.map((item) =>
                                item.id === order.id ? { ...item, notes: nextValue } : item
                              )
                            );
                          }}
                          onBlur={(e) => updateOrder(order.id, { notes: e.target.value })}
                        />
                      </td>
                      <td>
                        <button
                          className="btn small green"
                          type="button"
                          onClick={() => handleWhatsApp(order)}
                        >
                          WhatsApp
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8">No hay pedidos aún.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {me.role === "admin" ? (
            <div className="section">
              <h3>Diseñadores disponibles</h3>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Rol</th>
                      <th>Nombre</th>
                    </tr>
                  </thead>
                  <tbody id="usersBody">
                    {designers.map((designer) => (
                      <tr key={designer.id}>
                        <td>{designer.username}</td>
                        <td>{designer.role}</td>
                        <td>{designer.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
