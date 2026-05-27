import { useCallback, useEffect, useMemo, useState } from "react";
import { whatsappAdminService } from "../services/backend";

const EMPTY_QR = { name: "", status: "", qrBase64: "" };

function normalizeQrSource(qrBase64) {
  if (!qrBase64) return "";
  if (qrBase64.startsWith("data:image")) return qrBase64;
  return `data:image/png;base64,${qrBase64}`;
}

function statusClass(status) {
  const value = String(status || "").toLowerCase();
  if (value === "connected") return "s-produccion";
  if (value === "connecting") return "s-aprobacion";
  if (value === "disconnected") return "s-pausa";
  return "s-archivo";
}

export default function WhatsAppAdminPanel() {
  const [instances, setInstances] = useState([]);
  const [newInstanceName, setNewInstanceName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [qrModal, setQrModal] = useState(EMPTY_QR);

  const qrSource = useMemo(() => normalizeQrSource(qrModal.qrBase64), [qrModal.qrBase64]);

  const loadInstances = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await whatsappAdminService.listInstances();
      setInstances(Array.isArray(data.instances) ? data.instances : []);
    } catch {
      setError("No se pudieron cargar las instancias de WhatsApp.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  async function runAction(actionKey, callback, okMessage) {
    setBusyAction(actionKey);
    setError("");
    setSuccess("");
    try {
      const result = await callback();
      if (okMessage) setSuccess(okMessage);
      await loadInstances();
      return result;
    } catch {
      setError("La accion no pudo completarse contra Evolution API.");
      return null;
    } finally {
      setBusyAction("");
    }
  }

  async function handleCreate(event) {
    event.preventDefault();
    const name = newInstanceName.trim();
    if (!name) return;

    const result = await runAction(
      "create",
      () => whatsappAdminService.createInstance(name),
      "Instancia creada."
    );

    if (result) {
      setNewInstanceName("");
      setQrModal({
        name: result.name || name,
        status: result.status || "connecting",
        qrBase64: result.qr_base64 || "",
      });
    }
  }

  async function handleQr(name) {
    const result = await runAction(
      `qr:${name}`,
      () => whatsappAdminService.fetchQr(name),
      "QR actualizado."
    );

    if (result) {
      setQrModal({
        name: result.name || name,
        status: result.status || "connecting",
        qrBase64: result.qr_base64 || "",
      });
    }
  }

  async function handleStatus(name) {
    await runAction(
      `status:${name}`,
      () => whatsappAdminService.getStatus(name),
      "Estado actualizado."
    );
  }

  async function handleRestart(name) {
    await runAction(
      `restart:${name}`,
      () => whatsappAdminService.restart(name),
      "Instancia reconectada."
    );
  }

  async function handleLogout(name) {
    await runAction(
      `logout:${name}`,
      () => whatsappAdminService.logout(name),
      "Instancia desconectada."
    );
  }

  async function handleDelete(name) {
    const confirmed = window.confirm(`Eliminar la instancia ${name}?`);
    if (!confirmed) return;

    await runAction(
      `delete:${name}`,
      () => whatsappAdminService.remove(name),
      "Instancia eliminada."
    );
  }

  return (
    <div className="panel-stack whatsapp-admin-panel">
      <section className="card panel-block">
        <div className="panel-section-header">
          <div>
            <span className="badge">Evolution API</span>
            <h3>WhatsApp</h3>
          </div>
          <button className="btn soft small" type="button" onClick={loadInstances} disabled={loading || Boolean(busyAction)}>
            {loading ? "Actualizando..." : "Actualizar"}
          </button>
        </div>

        <form className="whatsapp-create-row" onSubmit={handleCreate}>
          <label>
            Nueva instancia
            <input
              value={newInstanceName}
              onChange={(event) => setNewInstanceName(event.target.value)}
              placeholder="dystinta-main"
              pattern="[A-Za-z0-9_-]+"
            />
          </label>
          <button className="btn" type="submit" disabled={busyAction === "create" || !newInstanceName.trim()}>
            {busyAction === "create" ? "Creando..." : "Crear instancia"}
          </button>
        </form>
      </section>

      {error ? <div className="notice danger">{error}</div> : null}
      {success ? <div className="notice">{success}</div> : null}

      <section className="whatsapp-instance-grid">
        {loading ? <div className="notice">Cargando instancias...</div> : null}

        {!loading && !instances.length ? (
          <div className="notice">No hay instancias creadas en Evolution API.</div>
        ) : null}

        {instances.map((instance) => {
          const name = instance.name;
          return (
            <article className="whatsapp-instance-card" key={name}>
              <div className="whatsapp-instance-head">
                <div>
                  <span className="badge">Instancia</span>
                  <h3>{name}</h3>
                </div>
                <span className={`status ${statusClass(instance.status)}`}>
                  {instance.status || "unknown"}
                </span>
              </div>

              <div className="whatsapp-instance-meta">
                <span>Ultimo estado</span>
                <strong>{instance.status || "unknown"}</strong>
              </div>

              <div className="panel-action-row">
                <button className="btn small" type="button" onClick={() => handleQr(name)} disabled={Boolean(busyAction)}>
                  {busyAction === `qr:${name}` ? "Generando..." : "Generar QR"}
                </button>
                <button className="btn soft small" type="button" onClick={() => handleStatus(name)} disabled={Boolean(busyAction)}>
                  Estado
                </button>
                <button className="btn soft small" type="button" onClick={() => handleRestart(name)} disabled={Boolean(busyAction)}>
                  Reconnect
                </button>
                <button className="btn soft small" type="button" onClick={() => handleLogout(name)} disabled={Boolean(busyAction)}>
                  Logout
                </button>
                <button className="btn soft small" type="button" onClick={() => handleDelete(name)} disabled={Boolean(busyAction)}>
                  Delete
                </button>
              </div>
            </article>
          );
        })}
      </section>

      {qrModal.name ? (
        <div className="qr-modal-backdrop" role="dialog" aria-modal="true">
          <section className="qr-modal card">
            <div className="panel-section-header">
              <div>
                <span className="badge">{qrModal.status || "connecting"}</span>
                <h3>{qrModal.name}</h3>
              </div>
              <button className="btn soft small" type="button" onClick={() => setQrModal(EMPTY_QR)}>
                Cerrar
              </button>
            </div>

            {qrSource ? (
              <img className="qr-image" src={qrSource} alt={`QR WhatsApp ${qrModal.name}`} />
            ) : (
              <div className="notice">Evolution API no devolvio un QR para esta instancia.</div>
            )}

            <div className="panel-action-row">
              <button className="btn small" type="button" onClick={() => handleQr(qrModal.name)} disabled={Boolean(busyAction)}>
                Regenerar QR
              </button>
              <button className="btn soft small" type="button" onClick={() => handleStatus(qrModal.name)} disabled={Boolean(busyAction)}>
                Ver estado
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
