import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import logo from "../assets/logo-dystinta.jpg";
import { orderService } from "../services/backend";

function formatDate(value) {
  if (!value) return "Sin actualizaciones registradas";
  return new Date(value).toLocaleString();
}

export default function Seguimiento() {
  const { token } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadTracking() {
      setLoading(true);
      setError("");
      try {
        const data = await orderService.getTracking(token);
        if (mounted) setOrder(data);
      } catch {
        if (mounted) setError("No encontramos un seguimiento activo para este pedido.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadTracking();
    return () => { mounted = false; };
  }, [token]);

  const progress = Math.min(Math.max(order?.currentProgress || 0, 0), 100);
  const isFinished = order?.status === "Finalizado";

  return (
    <div className="tracking-page">
      <header className="topbar">
        <div className="container nav">
          <Link className="brand" to="/">
            <img src={logo} alt="logo" />
            <div>
              <span>Dystinta</span>
              <small>Seguimiento de pedido</small>
            </div>
          </Link>
          <nav className="nav-links">
            <Link to="/">Inicio</Link>
            <Link to="/pedidos">Nuevo pedido</Link>
          </nav>
        </div>
      </header>

      <main className="section">
        <div className="container tracking-container">
          {loading ? <div className="notice">Cargando seguimiento...</div> : null}
          {!loading && error ? <div className="notice danger">{error}</div> : null}

          {!loading && order ? (
            <section className="tracking-card">
              <span className="badge">{order.service}</span>
              <h1>{isFinished ? "Pedido finalizado" : "Seguimiento de pedido"}</h1>
              <div className="tracking-status-row">
                <span className="tracking-status">{order.status}</span>
                <strong>{progress}%</strong>
              </div>
              <div className="tracking-progress-bar" aria-label={`Progreso ${progress}%`}>
                <span style={{ width: `${progress}%` }} />
              </div>
              <p className="tracking-message">{order.statusMessage}</p>
              <div className="tracking-meta">
                <span>Última actualización</span>
                <strong>{formatDate(order.statusUpdatedAt)}</strong>
              </div>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
