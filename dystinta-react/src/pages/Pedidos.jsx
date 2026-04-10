import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const EMPTY_FORM = {
  name: "",
  phone: "",
  email: "",
  details: "",
  file: null,
};

export default function Pedidos() {
  const [site, setSite] = useState(null);
  const [activeTab, setActiveTab] = useState("dtf-textil");
  const [forms, setForms] = useState({
    "dtf-textil": { ...EMPTY_FORM },
    "dtf-uv": { ...EMPTY_FORM },
    serigrafia: { ...EMPTY_FORM },
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadSite() {
      try {
        const { data } = await api.get("/site/public/");
        if (mounted) setSite(data);
      } catch (err) {
        if (mounted) setError("No se pudo cargar la página.");
      }
    }

    loadSite();

    const hash = window.location.hash.replace("#", "");
    if (["dtf-textil", "dtf-uv", "serigrafia"].includes(hash)) {
      setActiveTab(hash);
    }

    return () => {
      mounted = false;
    };
  }, []);

  const whatsappLink = useMemo(() => {
    const raw = site?.general?.whatsappRaw || "";
    return raw ? `https://wa.me/${raw}` : "#";
  }, [site]);

  function handleChange(tab, event) {
    const { name, value, type, files } = event.target;
    setForms((prev) => ({
      ...prev,
      [tab]: {
        ...prev[tab],
        [name]: type === "file" ? files?.[0] || null : value,
      },
    }));
  }

  function resetTab(tab) {
    setForms((prev) => ({
      ...prev,
      [tab]: { ...EMPTY_FORM },
    }));
  }

  async function submitOrder(tab, serviceName, event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const current = forms[tab];
      const payload = new FormData();
      payload.append("service", serviceName);
      payload.append("name", current.name);
      payload.append("phone", current.phone);
      payload.append("email", current.email);
      payload.append("details", current.details);

      let extraData = {};
      payload.append("extraData", JSON.stringify(extraData));

      if (current.file) {
        payload.append("file", current.file);
      }

      await api.post("/orders/", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMessage("Pedido enviado correctamente.");
      resetTab(tab);
    } catch (err) {
      setError("No se pudo guardar el pedido.");
    } finally {
      setLoading(false);
    }
  }

  if (error && !site) {
    return <div className="section"><div className="container"><div className="notice danger">{error}</div></div></div>;
  }
  if (!site) {
    return <div className="section"><div className="container"><div className="notice">Cargando...</div></div></div>;
  }

  return (
    <>
      <Navbar companyName={site.general.companyName} slogan={site.general.slogan} />

      <section className="section">
        <div className="container">
          <h2>Pedidos online</h2>
          <p className="lead">Elegí el tipo de pedido en la barra de arriba. Al enviar, el pedido se guarda en el panel interno y también se abre WhatsApp con el detalle listo para mandar.</p>

          {message ? <div className="notice">{message}</div> : null}
          {error && site ? <div className="notice danger">{error}</div> : null}

          <div className="order-menu-bar" role="tablist" aria-label="Tipos de pedidos">
            <button className={`order-tab${activeTab === "dtf-textil" ? " active" : ""}`} type="button" onClick={() => setActiveTab("dtf-textil")}>DTF Textil</button>
            <button className={`order-tab${activeTab === "dtf-uv" ? " active" : ""}`} type="button" onClick={() => setActiveTab("dtf-uv")}>DTF UV</button>
            <button className={`order-tab${activeTab === "serigrafia" ? " active" : ""}`} type="button" onClick={() => setActiveTab("serigrafia")}>Serigrafía</button>
          </div>

          <div className="order-panels">
            <section className={`order-panel${activeTab === "dtf-textil" ? " active" : ""}`} id="panel-dtf-textil">
              <div className="panel-header"><span className="badge">Pedido</span><h3>DTF Textil</h3><p>Ideal para remeras, uniformes y prendas personalizadas.</p></div>
              <form className="order-form order-layout" onSubmit={(event) => submitOrder("dtf-textil", "DTF Textil", event)}>
                <div className="form-row">
                  <label>Nombre<input name="name" required value={forms["dtf-textil"].name} onChange={(event) => handleChange("dtf-textil", event)} /></label>
                  <label>Teléfono<input name="phone" required value={forms["dtf-textil"].phone} onChange={(event) => handleChange("dtf-textil", event)} /></label>
                </div>
                <label>Email <span className="hint">(opcional)</span><input type="email" name="email" value={forms["dtf-textil"].email} onChange={(event) => handleChange("dtf-textil", event)} /></label>
                <label>Detalles<textarea name="details" placeholder="Indicá colores, ubicación del estampado, fechas y cualquier referencia útil." value={forms["dtf-textil"].details} onChange={(event) => handleChange("dtf-textil", event)} /></label>
                <label>Adjuntar archivo<input type="file" name="file" onChange={(event) => handleChange("dtf-textil", event)} /></label>
                <div className="order-actions"><button className="btn" type="submit" disabled={loading}>{loading ? "Enviando..." : "Enviar pedido"}</button></div>
              </form>
            </section>

            <section className={`order-panel${activeTab === "dtf-uv" ? " active" : ""}`} id="panel-dtf-uv">
              <div className="panel-header"><span className="badge">Pedido</span><h3>DTF UV</h3><p>Para envases, objetos rígidos, etiquetas y branding de productos.</p></div>
              <form className="order-form order-layout" onSubmit={(event) => submitOrder("dtf-uv", "DTF UV", event)}>
                <div className="form-row">
                  <label>Nombre<input name="name" required value={forms["dtf-uv"].name} onChange={(event) => handleChange("dtf-uv", event)} /></label>
                  <label>Teléfono<input name="phone" required value={forms["dtf-uv"].phone} onChange={(event) => handleChange("dtf-uv", event)} /></label>
                </div>
                <label>Email <span className="hint">(opcional)</span><input type="email" name="email" value={forms["dtf-uv"].email} onChange={(event) => handleChange("dtf-uv", event)} /></label>
                <label>Detalles<textarea name="details" placeholder="Contanos sobre el producto, acabado y colores." value={forms["dtf-uv"].details} onChange={(event) => handleChange("dtf-uv", event)} /></label>
                <label>Adjuntar archivo<input type="file" name="file" onChange={(event) => handleChange("dtf-uv", event)} /></label>
                <div className="order-actions"><button className="btn" type="submit" disabled={loading}>{loading ? "Enviando..." : "Enviar pedido"}</button></div>
              </form>
            </section>

            <section className={`order-panel${activeTab === "serigrafia" ? " active" : ""}`} id="panel-serigrafia">
              <div className="panel-header"><span className="badge">Pedido</span><h3>Serigrafía</h3><p>Recomendada para volumen, campañas, eventos y tiradas grandes.</p></div>
              <form className="order-form order-layout" onSubmit={(event) => submitOrder("serigrafia", "Serigrafía", event)}>
                <div className="form-row">
                  <label>Nombre<input name="name" required value={forms.serigrafia.name} onChange={(event) => handleChange("serigrafia", event)} /></label>
                  <label>Teléfono<input name="phone" required value={forms.serigrafia.phone} onChange={(event) => handleChange("serigrafia", event)} /></label>
                </div>
                <label>Email <span className="hint">(opcional)</span><input type="email" name="email" value={forms.serigrafia.email} onChange={(event) => handleChange("serigrafia", event)} /></label>
                <label>Detalles<textarea name="details" placeholder="Indicá técnica, colores y fecha de entrega." value={forms.serigrafia.details} onChange={(event) => handleChange("serigrafia", event)} /></label>
                <label>Adjuntar archivo<input type="file" name="file" onChange={(event) => handleChange("serigrafia", event)} /></label>
                <div className="order-actions"><button className="btn" type="submit" disabled={loading}>{loading ? "Enviando..." : "Enviar pedido"}</button></div>
              </form>
            </section>
          </div>
        </div>
      </section>

      <Footer companyName={site.general.companyName} whatsappLink={whatsappLink} instagram={site.general.instagram} facebook={site.general.facebook} />
    </>
  );
}
