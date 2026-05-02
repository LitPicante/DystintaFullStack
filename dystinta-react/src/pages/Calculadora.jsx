import { useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const FILM_SIZES = [
  { id: "20x20", label: "20 x 20 cm", width: 20, height: 20 },
  { id: "30x40", label: "30 x 40 cm", width: 30, height: 40 },
  { id: "58x20", label: "58 x 20 cm", width: 58, height: 20 },
];

const EMPTY_CUSTOMER = { name: "", phone: "", email: "", details: "" };

function parseNumber(value, fallback = 0) {
  const normalized = String(value ?? "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatMetric(value) {
  return Number(value || 0).toLocaleString("es-PY", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function createDesign(index = 0) {
  return {
    id: window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${index}`,
    width: 8,
    height: 8,
    repetitions: 1,
    file: null,
    previewUrl: "",
  };
}

function expandDesigns(items) {
  return items.flatMap((item, itemIndex) => {
    const repetitions = Math.max(1, Math.round(parseNumber(item.repetitions, 1)));
    return Array.from({ length: repetitions }, (_, repeatIndex) => ({
      itemIndex,
      repeatIndex,
      width: Math.max(0.1, parseNumber(item.width, 0.1)),
      height: Math.max(0.1, parseNumber(item.height, 0.1)),
      previewUrl: item.previewUrl,
      fileName: item.file?.name || "",
    }));
  });
}

function packFilm(items, film) {
  const placements = [];
  let sheet = 1;
  let x = 0;
  let y = 0;
  let rowHeight = 0;

  items.forEach((item) => {
    const width = Math.min(item.width, film.width);
    const height = Math.min(item.height, film.height);

    if (x + width > film.width) {
      x = 0;
      y += rowHeight;
      rowHeight = 0;
    }

    if (y + height > film.height) {
      sheet += 1;
      x = 0;
      y = 0;
      rowHeight = 0;
    }

    placements.push({ ...item, x, y, width, height, sheet });
    x += width;
    rowHeight = Math.max(rowHeight, height);
  });

  return { placements, sheetCount: Math.max(sheet, 1) };
}

function buildOrderDetails(customer, film, items, sheetCount) {
  const itemLines = items.map((item, index) => (
    `Diseño ${index + 1}: ${item.file?.name || "sin archivo"} - ${formatMetric(item.width)} x ${formatMetric(item.height)} cm - ${item.repetitions} repeticiones`
  ));
  return [
    "Pedido generado desde calculadora DTF.",
    `Film seleccionado: ${film.label}.`,
    `Hojas estimadas: ${sheetCount}.`,
    customer.details ? `Notas del cliente: ${customer.details}` : "",
    ...itemLines,
  ].filter(Boolean).join("\n");
}

export default function Calculadora() {
  const [site, setSite] = useState(null);
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);
  const [filmId, setFilmId] = useState(FILM_SIZES[0].id);
  const [items, setItems] = useState([createDesign()]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const canvasRef = useRef(null);

  const selectedFilm = useMemo(() => FILM_SIZES.find((film) => film.id === filmId) || FILM_SIZES[0], [filmId]);
  const expanded = useMemo(() => expandDesigns(items), [items]);
  const layout = useMemo(() => packFilm(expanded, selectedFilm), [expanded, selectedFilm]);
  const firstSheet = useMemo(() => layout.placements.filter((item) => item.sheet === 1), [layout]);
  const totalRepetitions = expanded.length;

  useEffect(() => {
    let mounted = true;

    async function loadSite() {
      try {
        const { data } = await api.get("/site/public/");
        if (mounted) setSite(data);
      } catch {
        if (mounted) setError("No se pudo cargar la página.");
      }
    }

    loadSite();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = Math.min(680 / selectedFilm.width, 420 / selectedFilm.height);
    canvas.width = Math.round(selectedFilm.width * scale);
    canvas.height = Math.round(selectedFilm.height * scale);
    canvas.style.width = "100%";
    canvas.style.maxWidth = `${canvas.width}px`;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255,255,255,.06)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(255,255,255,.28)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

    firstSheet.forEach((item) => {
      const x = item.x * scale;
      const y = item.y * scale;
      const width = item.width * scale;
      const height = item.height * scale;
      ctx.fillStyle = "rgba(139,75,255,.2)";
      ctx.fillRect(x, y, width, height);
      ctx.strokeStyle = "rgba(0,234,255,.75)";
      ctx.strokeRect(x, y, width, height);

      if (item.previewUrl) {
        const image = new Image();
        image.onload = () => {
          ctx.drawImage(image, x + 2, y + 2, Math.max(width - 4, 1), Math.max(height - 4, 1));
          ctx.strokeStyle = "rgba(0,234,255,.75)";
          ctx.strokeRect(x, y, width, height);
        };
        image.src = item.previewUrl;
      }

      ctx.fillStyle = "rgba(255,255,255,.92)";
      ctx.font = "700 12px Inter, Arial";
      ctx.fillText(`${item.itemIndex + 1}.${item.repeatIndex + 1}`, x + 6, y + 16);
    });
  }, [firstSheet, selectedFilm]);

  const whatsappLink = useMemo(() => {
    const raw = site?.general?.whatsappRaw || "";
    return raw ? `https://wa.me/${raw}` : "#";
  }, [site]);

  function updateCustomer(field, value) {
    setCustomer((current) => ({ ...current, [field]: value }));
  }

  function updateItem(index, field, value) {
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        if (field === "file") {
          if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
          const file = value || null;
          return { ...item, file, previewUrl: file ? URL.createObjectURL(file) : "" };
        }
        if (field === "repetitions") {
          return { ...item, repetitions: Math.max(1, Math.round(parseNumber(value, 1))) };
        }
        return { ...item, [field]: Math.max(0.1, parseNumber(value, 0.1)) };
      })
    );
  }

  function addItem() {
    setItems((current) => [...current, createDesign(current.length)]);
  }

  function removeItem(index) {
    setItems((current) => {
      const removed = current[index];
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      const next = current.filter((_, itemIndex) => itemIndex !== index);
      return next.length ? next : [createDesign()];
    });
  }

  function clearItems() {
    items.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setItems([createDesign()]);
  }

  async function submitOrder(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const missingImage = items.some((item) => !item.file);
    if (missingImage) {
      setError("Cargá una imagen PNG en cada diseño antes de enviar.");
      setLoading(false);
      return;
    }

    try {
      const payload = new FormData();
      const details = buildOrderDetails(customer, selectedFilm, items, layout.sheetCount);
      const extraData = {
        source: "dtf-calculator",
        film: selectedFilm,
        sheetCount: layout.sheetCount,
        totalRepetitions,
        designs: items.map((item, index) => ({
          index: index + 1,
          fileName: item.file?.name || "",
          widthCm: parseNumber(item.width, 0),
          heightCm: parseNumber(item.height, 0),
          repetitions: Math.max(1, Math.round(parseNumber(item.repetitions, 1))),
        })),
      };

      payload.append("service", "DTF Textil");
      payload.append("name", customer.name);
      payload.append("phone", customer.phone);
      payload.append("email", customer.email);
      payload.append("quantity", `${totalRepetitions} repeticiones / ${layout.sheetCount} film${layout.sheetCount === 1 ? "" : "s"} ${selectedFilm.label}`);
      payload.append("details", details);
      payload.append("extraData", JSON.stringify(extraData));
      payload.append("file", items[0].file);
      items.forEach((item) => payload.append("attachments", item.file));

      await api.post("/orders/", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMessage("Pedido DTF enviado correctamente.");
      setCustomer(EMPTY_CUSTOMER);
      clearItems();
      setFilmId(FILM_SIZES[0].id);
    } catch {
      setError("No se pudo enviar el pedido DTF.");
    } finally {
      setLoading(false);
    }
  }

  if (error && !site) return <div className="section"><div className="container"><div className="notice danger">{error}</div></div></div>;
  if (!site) return <div className="section"><div className="container"><div className="notice">Cargando...</div></div></div>;

  return (
    <>
      <Navbar companyName={site.general.companyName} slogan={site.general.slogan} theme={site.general} />

      <section className="section">
        <div className="container">
          <form className="dtf-calculator" onSubmit={submitOrder}>
            <div className="calc-hero">
              <div>
                <span className="badge">Pedido DTF</span>
                <h2>Armá tu pedido con imagen PNG</h2>
                <p className="lead">Cargá tus diseños, elegí el tamaño de film, indicá repeticiones y medidas. El pedido llega directo al panel interno.</p>
              </div>
              <div className="info-card">
                <h3>Film seleccionado</h3>
                <strong className="calc-film-readout">{selectedFilm.label}</strong>
                <p className="hint">{totalRepetitions} repeticiones · {layout.sheetCount} film{layout.sheetCount === 1 ? "" : "s"} estimado{layout.sheetCount === 1 ? "" : "s"}</p>
              </div>
            </div>

            {message ? <div className="notice">{message}</div> : null}
            {error && site ? <div className="notice danger">{error}</div> : null}

            <section className="card calc-config">
              <h3>Datos del cliente</h3>
              <div className="calc-grid-top">
                <label>Nombre<input required value={customer.name} onChange={(event) => updateCustomer("name", event.target.value)} /></label>
                <label>Teléfono<input required value={customer.phone} onChange={(event) => updateCustomer("phone", event.target.value)} /></label>
                <label>Email <span className="hint">(opcional)</span><input type="email" value={customer.email} onChange={(event) => updateCustomer("email", event.target.value)} /></label>
              </div>
              <label>Notas del pedido<textarea value={customer.details} onChange={(event) => updateCustomer("details", event.target.value)} placeholder="Color de prenda, fecha deseada, ubicación del estampado u otra indicación." /></label>
            </section>

            <section className="card calc-config">
              <h3>Tamaño de film</h3>
              <div className="film-size-grid">
                {FILM_SIZES.map((film) => (
                  <button className={`film-size-option${filmId === film.id ? " active" : ""}`} type="button" key={film.id} onClick={() => setFilmId(film.id)}>
                    <strong>{film.label}</strong>
                    <span>{film.width} cm ancho · {film.height} cm alto</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="calc-layout">
              <div className="calc-left">
                <div className="calc-panel-header">
                  <h3>Diseños</h3>
                  <button className="btn small" type="button" onClick={addItem}>Agregar otro</button>
                </div>
                <div className="calc-items">
                  {items.map((item, index) => (
                    <article className="calc-item card" key={item.id}>
                      <div className="calc-item-header">
                        <strong>Diseño {index + 1}</strong>
                        <button className="btn soft small" type="button" onClick={() => removeItem(index)}>Eliminar</button>
                      </div>
                      <label>Imagen PNG<input type="file" accept="image/png" required={!item.file} onChange={(event) => updateItem(index, "file", event.target.files?.[0] || null)} /></label>
                      <div className="calc-item-fields">
                        <label>Ancho repetición (cm)<input type="number" min="0.1" step="0.1" value={item.width} onChange={(event) => updateItem(index, "width", event.target.value)} /></label>
                        <label>Alto repetición (cm)<input type="number" min="0.1" step="0.1" value={item.height} onChange={(event) => updateItem(index, "height", event.target.value)} /></label>
                        <label>Repeticiones<input type="number" min="1" step="1" value={item.repetitions} onChange={(event) => updateItem(index, "repetitions", event.target.value)} /></label>
                      </div>
                      <div className="calc-item-preview">
                        {item.previewUrl ? <img className="calc-image-preview" src={item.previewUrl} alt={`Diseño ${index + 1}`} /> : <div className="calc-upload-placeholder">PNG</div>}
                        <span className="hint">{formatMetric(item.width)} x {formatMetric(item.height)} cm · {item.repetitions} repeticiones</span>
                      </div>
                    </article>
                  ))}
                </div>
                <div className="order-actions">
                  <button className="btn soft" type="button" onClick={clearItems}>Eliminar todo</button>
                  <button className="btn" type="submit" disabled={loading}>{loading ? "Enviando..." : "Enviar pedido"}</button>
                </div>
              </div>

              <div className="calc-right">
                <div className="calc-summary">
                  <h3>Resumen</h3>
                  <div className="notice">
                    <strong>Film:</strong> {selectedFilm.label}
                    <br />
                    <strong>Diseños:</strong> {items.length}
                    <br />
                    <strong>Repeticiones:</strong> {totalRepetitions}
                    <br />
                    <strong>Films estimados:</strong> {layout.sheetCount}
                  </div>
                </div>
                <div className="calc-canvas-card">
                  <canvas ref={canvasRef}></canvas>
                </div>
                <div className="notice">
                  <strong>Vista previa:</strong> muestra el primer film. Si las repeticiones superan el espacio, el pedido indica cuántos films se estiman.
                </div>
              </div>
            </section>

            <section className="card calc-repetitions-card">
              <div className="calc-panel-header">
                <h3>Repeticiones cargadas</h3>
                <span className="hint">{totalRepetitions} copias en total</span>
              </div>
              <div className="calc-repetitions">
                {expanded.map((item, index) => (
                  <article className="calc-repetition-card" key={`${item.itemIndex}-${item.repeatIndex}-${index}`}>
                    {item.previewUrl ? <img className="calc-repetition-image" src={item.previewUrl} alt={`Repetición ${index + 1}`} /> : <div className="calc-repetition-box" />}
                    <strong>Diseño {item.itemIndex + 1}</strong>
                    <span>{formatMetric(item.width)} x {formatMetric(item.height)} cm</span>
                    <small>Repetición {item.repeatIndex + 1}</small>
                  </article>
                ))}
              </div>
            </section>
          </form>
        </div>
      </section>

      <Footer companyName={site.general.companyName} whatsappLink={whatsappLink} instagram={site.general.instagram} facebook={site.general.facebook} />
    </>
  );
}
