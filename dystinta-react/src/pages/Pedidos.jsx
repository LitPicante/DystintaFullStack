import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const EMPTY_FORM = {
  name: "",
  phone: "",
  email: "",
  quantity: "",
  details: "",
  size: "",
  garment: "",
  surface: "",
  material: "",
  colors: "",
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
      payload.append("quantity", current.quantity);
      payload.append("details", current.details);

      let extraData = {};
      if (tab === "dtf-textil") {
        extraData = { size: current.size, garment: current.garment };
      }
      if (tab === "dtf-uv") {
        extraData = { surface: current.surface, size: current.size };
      }
      if (tab === "serigrafia") {
        extraData = { material: current.material, colors: current.colors };
      }

      payload.append("extraData", JSON.stringify(extraData));

      if (current.file) {
        payload.append("file", current.file);
      }

      await api.post("/orders/", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMessage("Pedido guardado correctamente. También podés enviarlo por WhatsApp.");
      resetTab(tab);
      window.open(whatsappLink, "_blank");
    } catch (err) {
      setError("No se pudo guardar el pedido.");
    } finally {
      setLoading(false);
    }
  }

  if (error && !site) return <div className="section"><div className="container"><div className="notice danger">{error}</div></div></div>;
  if (!site) return <div className="section"><div className="container"><div className="notice">Cargando...</div></div></div>;

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
            <button className={`order-tab${activeTab === "dtf-textil" ? " active" : ""}`} data-order-tab="dtf-textil" type="button" onClick={() => setActiveTab("dtf-textil")}>DTF Textil</button>
            <button className={`order-tab${activeTab === "dtf-uv" ? " active" : ""}`} data-order-tab="dtf-uv" type="button" onClick={() => setActiveTab("dtf-uv")}>DTF UV</button>
            <button className={`order-tab${activeTab === "serigrafia" ? " active" : ""}`} data-order-tab="serigrafia" type="button" onClick={() => setActiveTab("serigrafia")}>Serigrafía</button>
          </div>

          <div className="order-panels">
            <section className={`order-panel${activeTab === "dtf-textil" ? " active" : ""}`} id="panel-dtf-textil">
              <div className="panel-header"><span className="badge">Pedido</span><h3>DTF Textil</h3><p>Ideal para remeras, uniformes y prendas personalizadas.</p></div>
              <form className="order-form order-layout" onSubmit={(e) => submitOrder("dtf-textil", "DTF Textil", e)}>
                <div className="form-row"><label>Nombre<input name="name" required value={forms["dtf-textil"].name} onChange={(e) => handleChange("dtf-textil", e)} /></label><label>Teléfono<input name="phone" required value={forms["dtf-textil"].phone} onChange={(e) => handleChange("dtf-textil", e)} /></label></div>
                <div className="form-row"><label>Email<input type="email" name="email" value={forms["dtf-textil"].email} onChange={(e) => handleChange("dtf-textil", e)} /></label><label>Cantidad<input name="quantity" placeholder="Ej: 20 unidades" value={forms["dtf-textil"].quantity} onChange={(e) => handleChange("dtf-textil", e)} /></label></div>
                <div className="form-row"><label>Tamaño o medida<input name="size" placeholder="Ej: 30x20 cm" value={forms["dtf-textil"].size} onChange={(e) => handleChange("dtf-textil", e)} /></label><label>Tipo de prenda<input name="garment" placeholder="Ej: remera algodón" value={forms["dtf-textil"].garment} onChange={(e) => handleChange("dtf-textil", e)} /></label></div>
                <label>Detalles<textarea name="details" placeholder="Indicá colores, ubicación del estampado, fechas y cualquier referencia útil." value={forms["dtf-textil"].details} onChange={(e) => handleChange("dtf-textil", e)} /></label>
                <label>Adjuntar archivo<input type="file" name="file" onChange={(e) => handleChange("dtf-textil", e)} /></label>
                <div className="order-actions"><button className="btn" type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar y enviar por WhatsApp"}</button><a className="btn soft" data-whatsapp-link href={whatsappLink} target="_blank" rel="noreferrer">Abrir WhatsApp</a></div>
              </form>
            </section>

            <section className={`order-panel${activeTab === "dtf-uv" ? " active" : ""}`} id="panel-dtf-uv">
              <div className="panel-header"><span className="badge">Pedido</span><h3>DTF UV</h3><p>Para envases, objetos rígidos, etiquetas y branding de productos.</p></div>
              <form className="order-form order-layout" onSubmit={(e) => submitOrder("dtf-uv", "DTF UV", e)}>
                <div className="form-row"><label>Nombre<input name="name" required value={forms["dtf-uv"].name} onChange={(e) => handleChange("dtf-uv", e)} /></label><label>Teléfono<input name="phone" required value={forms["dtf-uv"].phone} onChange={(e) => handleChange("dtf-uv", e)} /></label></div>
                <div className="form-row"><label>Email<input type="email" name="email" value={forms["dtf-uv"].email} onChange={(e) => handleChange("dtf-uv", e)} /></label><label>Cantidad<input name="quantity" placeholder="Ej: 100 unidades" value={forms["dtf-uv"].quantity} onChange={(e) => handleChange("dtf-uv", e)} /></label></div>
                <div className="form-row"><label>Superficie<input name="surface" placeholder="Ej: vaso, frasco, caja" value={forms["dtf-uv"].surface} onChange={(e) => handleChange("dtf-uv", e)} /></label><label>Medida aproximada<input name="size" placeholder="Ej: 8x8 cm" value={forms["dtf-uv"].size} onChange={(e) => handleChange("dtf-uv", e)} /></label></div>
                <label>Detalles<textarea name="details" placeholder="Contanos sobre el producto, acabado y colores." value={forms["dtf-uv"].details} onChange={(e) => handleChange("dtf-uv", e)} /></label>
                <label>Adjuntar archivo<input type="file" name="file" onChange={(e) => handleChange("dtf-uv", e)} /></label>
                <div className="order-actions"><button className="btn" type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar y enviar por WhatsApp"}</button><a className="btn soft" data-whatsapp-link href={whatsappLink} target="_blank" rel="noreferrer">Abrir WhatsApp</a></div>
              </form>
            </section>

            <section className={`order-panel${activeTab === "serigrafia" ? " active" : ""}`} id="panel-serigrafia">
              <div className="panel-header"><span className="badge">Pedido</span><h3>Serigrafía</h3><p>Recomendada para volumen, campañas, eventos y tiradas grandes.</p></div>
              <form className="order-form order-layout" onSubmit={(e) => submitOrder("serigrafia", "Serigrafía", e)}>
                <div className="form-row"><label>Nombre<input name="name" required value={forms.serigrafia.name} onChange={(e) => handleChange("serigrafia", e)} /></label><label>Teléfono<input name="phone" required value={forms.serigrafia.phone} onChange={(e) => handleChange("serigrafia", e)} /></label></div>
                <div className="form-row"><label>Email<input type="email" name="email" value={forms.serigrafia.email} onChange={(e) => handleChange("serigrafia", e)} /></label><label>Cantidad<input name="quantity" placeholder="Ej: 200 unidades" value={forms.serigrafia.quantity} onChange={(e) => handleChange("serigrafia", e)} /></label></div>
                <div className="form-row"><label>Material<input name="material" placeholder="Ej: algodón, papel, bolsa" value={forms.serigrafia.material} onChange={(e) => handleChange("serigrafia", e)} /></label><label>Cantidad de colores<input name="colors" placeholder="Ej: 2 colores" value={forms.serigrafia.colors} onChange={(e) => handleChange("serigrafia", e)} /></label></div>
                <label>Detalles<textarea name="details" placeholder="Indicá técnica, colores, tamaño y fecha de entrega." value={forms.serigrafia.details} onChange={(e) => handleChange("serigrafia", e)} /></label>
                <label>Adjuntar archivo<input type="file" name="file" onChange={(e) => handleChange("serigrafia", e)} /></label>
                <div className="order-actions"><button className="btn" type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar y enviar por WhatsApp"}</button><a className="btn soft" data-whatsapp-link href={whatsappLink} target="_blank" rel="noreferrer">Abrir WhatsApp</a></div>
              </form>
            </section>
          </div>
        </div>
      </section>

      <Footer companyName={site.general.companyName} whatsappLink={whatsappLink} instagram={site.general.instagram} facebook={site.general.facebook} />
    </>
  );
}
