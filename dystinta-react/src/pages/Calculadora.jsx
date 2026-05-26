import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const FILM_SIZES = [
  { id: "20x20", label: "20 x 20 cm", width: 20, previewLength: 20 },
  { id: "30x40", label: "30 x 40 cm", width: 30, previewLength: 40 },
  { id: "58x20", label: "58 x 20 cm", width: 58, previewLength: 20 },
];

const CUSTOM_FILM_ID = "custom";
const DEFAULT_CUSTOM_FILM_WIDTH = 100;
const MIN_SPACING_CM = 0.5;
const REPEAT_COLORS = ["#b88a37", "#4f9f8f", "#d95f59", "#6d7fd5", "#d68adf", "#7fa548", "#d7873f", "#578fd1"];
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

function getUsableFilmWidth(film, margin = 0) {
  return Math.max(0.1, parseNumber(film.width, 0) - parseNumber(margin, 0) * 2);
}

function getSpacingLimit(items, film, margin = 0) {
  const usableWidth = getUsableFilmWidth(film, margin);
  const repeatedWidths = items
    .filter((item) => Math.max(1, Math.round(parseNumber(item.repetitions, 1))) > 1)
    .map((item) => Math.max(0.1, parseNumber(item.width, 0.1)));

  if (!repeatedWidths.length) return Infinity;
  return Math.max(MIN_SPACING_CM, Math.min(...repeatedWidths.map((width) => usableWidth - width * 2)));
}

function normalizeDesigns(items, film, margin = 0) {
  const usableWidth = getUsableFilmWidth(film, margin);
  return items.map((item) => ({
    ...item,
    width: Math.min(usableWidth, Math.max(0.1, parseNumber(item.width, 0.1))),
    height: Math.max(0.1, parseNumber(item.height, 0.1)),
    repetitions: Math.max(1, Math.round(parseNumber(item.repetitions, 1))),
  }));
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

function packFilm(items, film, spacing = MIN_SPACING_CM, margin = 0) {
  const placements = [];
  const safeSpacing = Math.max(MIN_SPACING_CM, parseNumber(spacing, MIN_SPACING_CM));
  const safeMargin = Math.max(0, parseNumber(margin, 0));
  const filmRight = Math.max(safeMargin + 0.1, film.width - safeMargin);
  let x = safeMargin;
  let y = safeMargin;
  let rowHeight = 0;
  let usedLength = 0;

  items.forEach((item) => {
    const width = Math.min(item.width, filmRight - safeMargin);
    const height = item.height;

    if (x > safeMargin && x + width > filmRight) {
      x = safeMargin;
      y += rowHeight + safeSpacing;
      rowHeight = 0;
    }

    placements.push({ ...item, x, y, width, height });
    x += width + safeSpacing;
    rowHeight = Math.max(rowHeight, height);
    usedLength = Math.max(usedLength, y + height + safeMargin);
  });

  return {
    placements,
    usedLength: Math.max(usedLength, film.previewLength),
  };
}

function loadPreviewImage(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function drawFilmLayout(ctx, canvas, film, layout, scale, imagesByPlacement = {}) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255,255,255,.96)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(23,15,36,.28)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

  ctx.fillStyle = "rgba(23,15,36,.86)";
  ctx.font = "700 14px Inter, Arial";
  ctx.fillText(`Film ${film.width} cm ancho · ${formatMetric(layout.usedLength)} cm largo estimado`, 12, 24);

  layout.placements.forEach((item, index) => {
    const x = item.x * scale;
    const y = item.y * scale + 34;
    const width = item.width * scale;
    const height = item.height * scale;
    ctx.fillStyle = "rgba(139,75,255,.12)";
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = "rgba(106,45,184,.85)";
    ctx.strokeRect(x, y, width, height);

    const image = imagesByPlacement[index];
    if (image) {
      ctx.drawImage(image, x + 2, y + 2, Math.max(width - 4, 1), Math.max(height - 4, 1));
      ctx.strokeStyle = "rgba(106,45,184,.85)";
      ctx.strokeRect(x, y, width, height);
    }

    ctx.fillStyle = "rgba(23,15,36,.92)";
    ctx.font = "700 12px Inter, Arial";
    ctx.fillText(`D${item.itemIndex + 1} R${item.repeatIndex + 1}`, x + 6, y + 16);
  });
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png", 0.95));
}

async function buildLayoutFile(film, layout) {
  const previewLength = Math.max(layout.usedLength, film.previewLength);
  const scale = Math.min(900 / film.width, 2400 / previewLength);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(film.width * scale);
  canvas.height = Math.round(previewLength * scale) + 34;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const loadedImages = await Promise.all(layout.placements.map((item) => loadPreviewImage(item.previewUrl)));
  drawFilmLayout(ctx, canvas, film, layout, scale, loadedImages);
  const blob = await canvasToBlob(canvas);
  if (!blob) return null;
  return new File(
    [blob],
    `Armado DTF - ${film.width}cm ancho - ${formatMetric(layout.usedLength)}cm largo.png`,
    { type: "image/png" }
  );
}

function buildOrderDetails(customer, film, items, usedLength, spacing, margin) {
  const itemLines = items.map((item, index) => (
    `Diseño ${index + 1}: ${item.file?.name || "sin archivo"} - ${formatMetric(item.width)} x ${formatMetric(item.height)} cm - ${item.repetitions} repeticiones`
  ));
  return [
    "Pedido generado desde calculadora DTF.",
    `Film seleccionado: ${film.label} (${film.width} cm de ancho).`,
    `Separación entre imágenes: ${formatMetric(spacing)} cm.`,
    `Margen del material: ${formatMetric(margin)} cm.`,
    `Largo estimado: ${formatMetric(usedLength)} cm.`,
    customer.details ? `Notas del cliente: ${customer.details}` : "",
    ...itemLines,
  ].filter(Boolean).join("\n");
}

export default function Calculadora() {
  const [site, setSite] = useState(null);
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);
  const [filmId, setFilmId] = useState(FILM_SIZES[0].id);
  const [customFilmWidth, setCustomFilmWidth] = useState(DEFAULT_CUSTOM_FILM_WIDTH);
  const [spacing, setSpacing] = useState(1);
  const [materialMargin, setMaterialMargin] = useState(0);
  const [items, setItems] = useState([createDesign()]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedFilm = useMemo(() => {
    if (filmId === CUSTOM_FILM_ID) {
      const width = Math.max(1, parseNumber(customFilmWidth, DEFAULT_CUSTOM_FILM_WIDTH));
      return { id: CUSTOM_FILM_ID, label: `${formatMetric(width)} cm`, width, previewLength: 20 };
    }
    return FILM_SIZES.find((film) => film.id === filmId) || FILM_SIZES[0];
  }, [customFilmWidth, filmId]);
  const normalizedItems = useMemo(() => normalizeDesigns(items, selectedFilm, materialMargin), [items, materialMargin, selectedFilm]);
  const expanded = useMemo(() => expandDesigns(normalizedItems), [normalizedItems]);
  const layout = useMemo(() => packFilm(expanded, selectedFilm, spacing, materialMargin), [expanded, materialMargin, selectedFilm, spacing]);
  const spacingLimit = useMemo(() => getSpacingLimit(normalizedItems, selectedFilm, materialMargin), [materialMargin, normalizedItems, selectedFilm]);
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

  const whatsappLink = useMemo(() => {
    const raw = site?.general?.whatsappRaw || "";
    return raw ? `https://wa.me/${raw}` : "#";
  }, [site]);

  function updateCustomer(field, value) {
    setCustomer((current) => ({ ...current, [field]: value }));
  }

  function updateFilmWidth(value) {
    setFilmId(CUSTOM_FILM_ID);
    setCustomFilmWidth(Math.max(1, parseNumber(value, DEFAULT_CUSTOM_FILM_WIDTH)));
  }

  function validateCalculator() {
    const usableWidth = getUsableFilmWidth(selectedFilm, materialMargin);
    const invalidWidth = items.find((item) => parseNumber(item.width, 0) > usableWidth);

    if (parseNumber(selectedFilm.width, 0) <= 0) return "El ancho del film debe ser mayor a 0 cm.";
    if (parseNumber(materialMargin, 0) < 0) return "El margen del material no puede ser negativo.";
    if (parseNumber(materialMargin, 0) * 2 >= parseNumber(selectedFilm.width, 0)) return "El margen ocupa todo el ancho del film.";
    if (parseNumber(spacing, 0) < MIN_SPACING_CM) return `La separación mínima es ${MIN_SPACING_CM} cm.`;
    if (Number.isFinite(spacingLimit) && parseNumber(spacing, 0) > spacingLimit) {
      return `La separación máxima para estas medidas es ${formatMetric(spacingLimit)} cm.`;
    }
    if (invalidWidth) return `Un diseño supera el ancho disponible del film (${formatMetric(usableWidth)} cm).`;
    return "";
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
        const nextValue = Math.max(0.1, parseNumber(value, 0.1));
        if (field === "width") return { ...item, width: Math.min(getUsableFilmWidth(selectedFilm, materialMargin), nextValue) };
        return { ...item, [field]: nextValue };
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

    const validationMessage = validateCalculator();
    if (validationMessage) {
      setError(validationMessage);
      setLoading(false);
      return;
    }

    try {
      const payload = new FormData();
      const details = buildOrderDetails(customer, selectedFilm, normalizedItems, layout.usedLength, spacing, materialMargin);
      const extraData = {
        source: "dtf-calculator",
        film: selectedFilm,
        filmWidthCm: selectedFilm.width,
        spacingCm: parseNumber(spacing, MIN_SPACING_CM),
        materialMarginCm: parseNumber(materialMargin, 0),
        estimatedLengthCm: layout.usedLength,
        totalRepetitions,
        layout: layout.placements.map((placement) => ({
          designIndex: placement.itemIndex + 1,
          repetitionIndex: placement.repeatIndex + 1,
          xCm: placement.x,
          yCm: placement.y,
          widthCm: placement.width,
          heightCm: placement.height,
        })),
        designs: normalizedItems.map((item, index) => ({
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
      payload.append("quantity", `${totalRepetitions} repeticiones / film ${selectedFilm.width} cm ancho / ${formatMetric(layout.usedLength)} cm largo estimado`);
      payload.append("details", details);
      payload.append("extraData", JSON.stringify(extraData));
      payload.append("file", items[0].file);
      const layoutFile = await buildLayoutFile(selectedFilm, layout);
      if (layoutFile) payload.append("attachments", layoutFile);
      items.forEach((item, index) => {
        const repetitions = Math.max(1, Math.round(parseNumber(item.repetitions, 1)));
        const designFile = new File(
          [item.file],
          `Diseno ${index + 1} - ${repetitions} rep - ${item.file.name}`,
          { type: item.file.type || "image/png" }
        );
        payload.append("attachments", designFile);
      });

      await api.post("/orders/", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMessage("Pedido DTF enviado correctamente.");
      setCustomer(EMPTY_CUSTOMER);
      clearItems();
      setFilmId(FILM_SIZES[0].id);
      setCustomFilmWidth(DEFAULT_CUSTOM_FILM_WIDTH);
      setSpacing(1);
      setMaterialMargin(0);
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
                <p className="lead">Cargá tus diseños, elegí el ancho de film, indicá repeticiones y medidas. El largo se calcula automáticamente según el pedido.</p>
              </div>
              <div className="info-card">
                <h3>Film seleccionado</h3>
                <strong className="calc-film-readout">{selectedFilm.label}</strong>
                <p className="hint">{selectedFilm.width} cm de ancho · {formatMetric(layout.usedLength)} cm de largo estimado · {totalRepetitions} repeticiones</p>
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
              <h3>Ancho de film</h3>
              <div className="film-size-grid">
                {FILM_SIZES.map((film) => (
                  <button className={`film-size-option${filmId === film.id ? " active" : ""}`} type="button" key={film.id} onClick={() => setFilmId(film.id)}>
                    <strong>{film.label}</strong>
                    <span>{film.width} cm de ancho · largo continuo</span>
                  </button>
                ))}
              </div>
              <div className="calc-grid-top calc-film-controls">
                <label>Ancho personalizado (cm)<input type="number" min="1" step="0.1" value={customFilmWidth} onFocus={() => setFilmId(CUSTOM_FILM_ID)} onChange={(event) => updateFilmWidth(event.target.value)} /></label>
                <label>Separación entre imágenes (cm)<input type="number" min={MIN_SPACING_CM} max={Number.isFinite(spacingLimit) ? spacingLimit : undefined} step="0.1" value={spacing} onChange={(event) => setSpacing(Math.max(MIN_SPACING_CM, parseNumber(event.target.value, MIN_SPACING_CM)))} /></label>
                <label>Margen del material (cm)<input type="number" min="0" step="0.1" value={materialMargin} onChange={(event) => setMaterialMargin(Math.max(0, parseNumber(event.target.value, 0)))} /></label>
              </div>
              <p className="hint calc-limit-hint">
                Ancho disponible: {formatMetric(getUsableFilmWidth(selectedFilm, materialMargin))} cm
                {Number.isFinite(spacingLimit) ? ` · separación máxima sugerida: ${formatMetric(spacingLimit)} cm` : ""}
              </p>
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
                        <label>Ancho repetición (cm)<input type="number" min="0.1" max={getUsableFilmWidth(selectedFilm, materialMargin)} step="0.1" value={item.width} onChange={(event) => updateItem(index, "width", event.target.value)} /></label>
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
                    <strong>Ancho:</strong> {selectedFilm.width} cm
                    <br />
                    <strong>Largo estimado:</strong> {formatMetric(layout.usedLength)} cm
                    <br />
                    <strong>Diseños:</strong> {items.length}
                    <br />
                    <strong>Repeticiones:</strong> {totalRepetitions}
                  </div>
                </div>
              </div>
            </section>

            <section className="card calc-repetitions-card">
              <div className="calc-panel-header">
                <h3>Repeticiones cargadas</h3>
                <span className="hint">{totalRepetitions} copias en total</span>
              </div>
              <div className="calc-repetitions" style={{ aspectRatio: `${selectedFilm.width} / ${Math.max(layout.usedLength, 1)}` }}>
                {layout.placements.map((item, index) => (
                  <article
                    className="calc-repetition-card"
                    key={`${item.itemIndex}-${item.repeatIndex}-${index}`}
                    title={`Diseño ${item.itemIndex + 1}`}
                    style={{
                      left: `${(item.x / selectedFilm.width) * 100}%`,
                      top: `${(item.y / layout.usedLength) * 100}%`,
                      width: `${(item.width / selectedFilm.width) * 100}%`,
                      height: `${(item.height / layout.usedLength) * 100}%`,
                      background: REPEAT_COLORS[item.itemIndex % REPEAT_COLORS.length],
                    }}
                    aria-label={`Diseño ${item.itemIndex + 1}`}
                  />
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
