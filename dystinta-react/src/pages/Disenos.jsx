import { useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const FONT_SIZE_MAP = {
  Pequeño: "1rem",
  Mediano: "1.4rem",
  Grande: "2rem",
};

const EMPTY_ORDER_FORM = {
  name: "",
  phone: "",
  email: "",
  notes: "",
};

function useDraggable(ref, canvasRef, initial = { x: 0, y: 0 }) {
  useEffect(() => {
    const element = ref.current;
    const canvas = canvasRef.current;
    if (!element || !canvas) return;

    let dragState = null;

    const setDragPosition = (x, y) => {
      element.dataset.x = String(Math.round(x));
      element.dataset.y = String(Math.round(y));
      element.style.left = `calc(50% + ${Math.round(x)}px)`;
      element.style.top = `calc(50% + ${Math.round(y)}px)`;
    };

    const clampDragPosition = (x, y) => {
      const canvasRect = canvas.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const halfW = elementRect.width / 2;
      const halfH = elementRect.height / 2;
      const maxX = canvasRect.width / 2 - halfW;
      const maxY = canvasRect.height / 2 - halfH;
      return {
        x: Math.max(-maxX, Math.min(maxX, x)),
        y: Math.max(-maxY, Math.min(maxY, y)),
      };
    };

    setDragPosition(initial.x, initial.y);

    const onPointerDown = (event) => {
      if (element.classList.contains("hidden")) return;
      event.preventDefault();
      dragState = {
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startX: Number(element.dataset.x || 0),
        startY: Number(element.dataset.y || 0),
      };
      element.setPointerCapture(event.pointerId);
      element.classList.add("canvas-dragging");
    };

    const onPointerMove = (event) => {
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      const nextX = dragState.startX + (event.clientX - dragState.startClientX);
      const nextY = dragState.startY + (event.clientY - dragState.startClientY);
      const clamped = clampDragPosition(nextX, nextY);
      setDragPosition(clamped.x, clamped.y);
    };

    const stopDragging = (event) => {
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      dragState = null;
      element.classList.remove("canvas-dragging");
      if (element.hasPointerCapture?.(event.pointerId)) {
        element.releasePointerCapture(event.pointerId);
      }
    };

    element.addEventListener("pointerdown", onPointerDown);
    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerup", stopDragging);
    element.addEventListener("pointercancel", stopDragging);

    return () => {
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", stopDragging);
      element.removeEventListener("pointercancel", stopDragging);
    };
  }, [ref, canvasRef, initial.x, initial.y]);
}

export default function Disenos() {
  const [site, setSite] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sendingOrder, setSendingOrder] = useState(false);
  const [activeTool, setActiveTool] = useState("texto");
  const [designText, setDesignText] = useState("DYSTINTA");
  const [textSize, setTextSize] = useState("Mediano");
  const [selectedColor, setSelectedColor] = useState("#8b4bff");
  const [shapeType, setShapeType] = useState("circle");
  const [uploadedImageFile, setUploadedImageFile] = useState(null);
  const [originalImageSrc, setOriginalImageSrc] = useState("");
  const [previewImageSrc, setPreviewImageSrc] = useState("");
  const [imageScale, setImageScale] = useState(1);
  const [showText, setShowText] = useState(true);
  const [showShape, setShowShape] = useState(true);
  const [showShirt, setShowShirt] = useState(true);
  const [orderForm, setOrderForm] = useState(EMPTY_ORDER_FORM);

  const canvasRef = useRef(null);
  const previewTextRef = useRef(null);
  const previewShapeRef = useRef(null);
  const previewImageRef = useRef(null);

  useDraggable(previewTextRef, canvasRef, { x: 0, y: -8 });
  useDraggable(previewShapeRef, canvasRef, { x: 0, y: 38 });
  useDraggable(previewImageRef, canvasRef, { x: 0, y: 0 });

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
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const image = previewImageRef.current;
    if (!image) return;
    const baseSize = 160;
    image.style.width = `${Math.round(baseSize * imageScale)}px`;
  }, [imageScale, previewImageSrc]);

  const whatsappLink = useMemo(() => {
    const raw = site?.general?.whatsappRaw || "";
    return raw ? `https://wa.me/${raw}` : "#";
  }, [site]);

  async function removeBackgroundFromImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas no disponible"));
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const { data } = imageData;
        const points = [
          [0, 0],
          [canvas.width - 1, 0],
          [0, canvas.height - 1],
          [canvas.width - 1, canvas.height - 1],
          [Math.floor(canvas.width / 2), 0],
          [Math.floor(canvas.width / 2), canvas.height - 1],
        ];
        const samples = points.map(([x, y]) => {
          const idx = (y * canvas.width + x) * 4;
          return [data[idx], data[idx + 1], data[idx + 2]];
        });
        const base = samples.reduce((acc, [r, g, b]) => [acc[0] + r, acc[1] + g, acc[2] + b], [0, 0, 0]).map((v) => v / samples.length);
        const threshold = 55;
        for (let i = 0; i < data.length; i += 4) {
          const dr = data[i] - base[0];
          const dg = data[i + 1] - base[1];
          const db = data[i + 2] - base[2];
          const distance = Math.sqrt(dr * dr + dg * dg + db * db);
          if (distance < threshold) data[i + 3] = 0;
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => reject(new Error("No se pudo procesar la imagen"));
      img.src = src;
    });
  }

  function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const isPng = file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
    if (!isPng) {
      event.target.value = "";
      alert("Solo se permiten imágenes PNG para el mockup.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      setUploadedImageFile(file);
      setOriginalImageSrc(result);
      setPreviewImageSrc(result);
      setImageScale(1);
    };
    reader.readAsDataURL(file);
  }

  async function handleRemoveBackground() {
    if (!originalImageSrc) {
      alert("Primero cargá una imagen PNG.");
      return;
    }
    try {
      const processed = await removeBackgroundFromImage(previewImageSrc || originalImageSrc);
      setPreviewImageSrc(processed);
      setImageScale(1);
    } catch {
      alert("No se pudo quitar el fondo automáticamente.");
    }
  }

  function shapeClassName() {
    let className = "canvas-shape";
    if (shapeType === "square") className += " square";
    if (shapeType === "pill") className += " pill";
    if (!showShape) className += " hidden";
    return className;
  }

  function updateOrderForm(field, value) {
    setOrderForm((current) => ({ ...current, [field]: value }));
  }

  function dataUrlToFile(dataUrl, filename) {
    const [header, base64] = dataUrl.split(",");
    const mime = header.match(/data:(.*?);/)?.[1] || "image/png";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new File([bytes], filename, { type: mime });
  }

  async function submitMockupOrder(event) {
    event.preventDefault();
    setSendingOrder(true);
    setError("");
    setSuccess("");

    try {
      const payload = new FormData();
      const details = [
        "Pedido generado desde el mockup de diseño.",
        `Texto: ${showText ? designText || "Sin texto" : "oculto"}.`,
        `Tamaño de texto: ${textSize}.`,
        `Color seleccionado: ${selectedColor}.`,
        `Figura: ${showShape ? shapeType : "oculta"}.`,
        `Imagen PNG: ${previewImageSrc ? "cargada" : "sin imagen"}.`,
        `Remera de fondo: ${showShirt ? "visible" : "eliminada/oculta"}.`,
        `Escala de imagen: ${imageScale}.`,
        orderForm.notes ? `Notas del cliente: ${orderForm.notes}` : "",
      ].filter(Boolean).join("\n");
      const extraData = {
        source: "mockup-designer",
        text: { value: designText, size: textSize, visible: showText },
        color: selectedColor,
        shape: { type: shapeType, visible: showShape },
        image: { hasImage: Boolean(previewImageSrc), scale: imageScale },
        mockup: { shirtVisible: showShirt },
      };

      payload.append("service", "DTF Textil");
      payload.append("name", orderForm.name);
      payload.append("phone", orderForm.phone);
      payload.append("email", orderForm.email);
      payload.append("quantity", "Mockup de diseño");
      payload.append("details", details);
      payload.append("extraData", JSON.stringify(extraData));

      if (previewImageSrc) {
        const file = previewImageSrc.startsWith("data:")
          ? dataUrlToFile(previewImageSrc, uploadedImageFile?.name || "mockup-diseno.png")
          : uploadedImageFile;
        if (file) {
          payload.append("file", file);
          payload.append("attachments", file);
        }
      }

      await api.post("/orders/", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccess("Pedido de mockup enviado correctamente.");
      setOrderForm(EMPTY_ORDER_FORM);
    } catch {
      setError("No se pudo enviar el pedido de mockup.");
    } finally {
      setSendingOrder(false);
    }
  }

  if (error) return <div className="section"><div className="container"><div className="notice danger">{error}</div></div></div>;
  if (!site) return <div className="section"><div className="container"><div className="notice">Cargando...</div></div></div>;

  return (
    <>
      <Navbar companyName={site.general.companyName} slogan={site.general.slogan} theme={site.general} />

      <section className="section">
        <div className="container">
          <h2>Área de diseño</h2>
          <p className="lead">Espacio visual para mostrar herramientas de diseño, edición de texto, colores, figuras y preparación de piezas antes de producción.</p>
          {success ? <div className="notice">{success}</div> : null}
          {error ? <div className="notice danger">{error}</div> : null}

          <div className="design-workspace">
            <aside className="tool-sidebar">
              <h3>Herramientas</h3>
              <button className={`tool-btn${activeTool === "texto" ? " active" : ""}`} type="button" onClick={() => setActiveTool("texto")}>Texto</button>
              <button className={`tool-btn${activeTool === "colores" ? " active" : ""}`} type="button" onClick={() => setActiveTool("colores")}>Colores</button>
              <button className={`tool-btn${activeTool === "figuras" ? " active" : ""}`} type="button" onClick={() => setActiveTool("figuras")}>Figuras</button>
              <button className={`tool-btn${activeTool === "fondo" ? " active" : ""}`} type="button" onClick={() => setActiveTool("fondo")}>Quitar fondos</button>
              <button className={`tool-btn${activeTool === "capas" ? " active" : ""}`} type="button" onClick={() => setActiveTool("capas")}>Capas y mockup</button>
            </aside>

            <div className="design-stage-wrap">
              <div className="design-stage">
                <div className="design-preview-card">
                  <div className="preview-topbar">
                    <span className="badge">Vista previa</span>
                    <span className="hint">Simulación visual para el cliente</span>
                  </div>
                  <div className="design-canvas" ref={canvasRef}>
                    {showShirt ? <div className="canvas-shirt"></div> : null}
                    <img
                      id="designPreviewImage"
                      ref={previewImageRef}
                      className={`canvas-upload${previewImageSrc ? "" : " hidden"}`}
                      alt="Diseño cargado"
                      src={previewImageSrc || ""}
                    />
                    <div
                      id="designPreviewText"
                      ref={previewTextRef}
                      className={`canvas-text${showText ? "" : " hidden"}`}
                      style={{ color: selectedColor, fontSize: FONT_SIZE_MAP[textSize] || "1.4rem" }}
                    >
                      {designText || "DYSTINTA"}
                    </div>
                    <div
                      id="designPreviewShape"
                      ref={previewShapeRef}
                      className={shapeClassName()}
                      style={{ background: selectedColor }}
                    ></div>
                  </div>
                </div>

                <div className="design-controls">
                  <section className={`tool-panel${activeTool === "texto" ? " active" : ""}`} id="tool-texto">
                    <h3>Texto</h3>
                    <div className="form-row">
                      <label>Texto principal<input id="designTextInput" value={designText} onChange={(e) => setDesignText(e.target.value)} /></label>
                      <label>Tamaño<select id="designTextSize" value={textSize} onChange={(e) => setTextSize(e.target.value)}><option>Pequeño</option><option>Mediano</option><option>Grande</option></select></label>
                    </div>
                    <label>Tipografía<select><option>Sans</option><option>Bold</option><option>Script</option></select></label>
                  </section>

                  <section className={`tool-panel${activeTool === "colores" ? " active" : ""}`} id="tool-colores">
                    <h3>Colores</h3>
                    <div className="palette-block"><strong>Paleta vibrante</strong><div className="color-palette">{["#8b4bff", "#6a2db8", "#35d07f", "#ffcc66", "#0b0613"].map((color) => <button key={color} className={`color-chip${selectedColor === color ? " active" : ""}`} data-color={color} type="button" onClick={() => setSelectedColor(color)}></button>)}</div></div>
                    <div className="palette-block"><strong>Paleta pastel</strong><div className="color-palette">{["#f7b2d9", "#ffd8a8", "#c7f9cc", "#a9def9", "#d0bfff"].map((color) => <button key={color} className={`color-chip${selectedColor === color ? " active" : ""}`} data-color={color} type="button" onClick={() => setSelectedColor(color)}></button>)}</div></div>
                    <div className="palette-block"><strong>Paleta industrial</strong><div className="color-palette">{["#111827", "#374151", "#ef4444", "#0ea5e9", "#f97316"].map((color) => <button key={color} className={`color-chip${selectedColor === color ? " active" : ""}`} data-color={color} type="button" onClick={() => setSelectedColor(color)}></button>)}</div></div>
                    <p className="hint">Elegí una paleta base para piezas textiles, UV o serigrafía.</p>
                  </section>

                  <section className={`tool-panel${activeTool === "figuras" ? " active" : ""}`} id="tool-figuras">
                    <h3>Figuras</h3>
                    <div className="shape-grid">
                      <button className={`shape-btn${shapeType === "circle" ? " active" : ""}`} type="button" onClick={() => setShapeType("circle")}>Círculo</button>
                      <button className={`shape-btn${shapeType === "square" ? " active" : ""}`} type="button" onClick={() => setShapeType("square")}>Cuadrado</button>
                      <button className={`shape-btn${shapeType === "pill" ? " active" : ""}`} type="button" onClick={() => setShapeType("pill")}>Píldora</button>
                    </div>
                    <p className="hint">Usá figuras base para destacados, fondos o marcas rápidas.</p>
                  </section>

                  <section className={`tool-panel${activeTool === "fondo" ? " active" : ""}`} id="tool-fondo">
                    <h3>Quitar fondos</h3>
                    <label>Subir imagen PNG<input id="designImageInput" type="file" accept=".png,image/png" onChange={handleImageUpload} /></label>
                    <div className="form-row"><button className="btn" id="designRemoveBgBtn" type="button" onClick={handleRemoveBackground}>Quitar fondo</button><button className="btn soft" id="designResetImageBtn" type="button" onClick={() => setPreviewImageSrc(originalImageSrc || "")}>Restablecer imagen</button></div>
                    <div className="form-row"><button className="btn soft" id="designImageSmallerBtn" type="button" onClick={() => setImageScale((prev) => Math.max(0.4, Number((prev - 0.1).toFixed(2))))}>Achicar imagen</button><button className="btn soft" id="designImageBiggerBtn" type="button" onClick={() => setImageScale((prev) => Math.min(3, Number((prev + 0.1).toFixed(2))))}>Agrandar imagen</button></div>
                    <div className="info-card"><strong>Flujo sugerido</strong><p>1. Cargar imagen PNG del cliente<br />2. Limpiar fondo por transparencia/color dominante<br />3. Revisar preview<br />4. Aprobar antes de producción</p></div>
                    <p className="hint">La carga obliga PNG para preservar transparencias y facilitar la limpieza.</p>
                  </section>

                  <section className={`tool-panel${activeTool === "capas" ? " active" : ""}`} id="tool-capas">
                    <h3>Capas y mockup</h3>
                    <div className="info-card"><strong>Capas recomendadas</strong><p>Fondo, figura base, texto, logo y guía de corte. Esto ayuda a ordenar los diseños antes de pasarlos a impresión.</p></div>
                    <div className="mockup-toggle-list">
                      <label className="mockup-toggle"><input id="toggleDesignShirt" type="checkbox" checked={showShirt} onChange={(e) => setShowShirt(e.target.checked)} /> Mostrar remera de fondo</label>
                      <label className="mockup-toggle"><input id="toggleDesignText" type="checkbox" checked={showText} onChange={(e) => setShowText(e.target.checked)} /> Mostrar texto en la remera</label>
                      <label className="mockup-toggle"><input id="toggleDesignShape" type="checkbox" checked={showShape} onChange={(e) => setShowShape(e.target.checked)} /> Mostrar figura en la remera</label>
                    </div>
                    <button className="btn soft" type="button" onClick={() => setShowShirt(false)}>Eliminar remera de fondo</button>
                    <p className="hint">La imagen cargada se coloca sobre la prenda del mockup para visualizar tamaño y contraste.</p>
                  </section>
                </div>
              </div>

              <section className="card design-order-card">
                <div className="panel-header">
                  <span className="badge">Pedido</span>
                  <h3>Enviar mockup al backoffice</h3>
                  <p>El diseño se guarda como pedido para que el equipo pueda verlo en el panel interno.</p>
                </div>
                <form className="order-form order-layout" onSubmit={submitMockupOrder}>
                  <div className="form-row">
                    <label>Nombre<input required value={orderForm.name} onChange={(event) => updateOrderForm("name", event.target.value)} /></label>
                    <label>Teléfono<input required value={orderForm.phone} onChange={(event) => updateOrderForm("phone", event.target.value)} /></label>
                  </div>
                  <label>Email <span className="hint">(opcional)</span><input type="email" value={orderForm.email} onChange={(event) => updateOrderForm("email", event.target.value)} /></label>
                  <label>Notas<textarea value={orderForm.notes} onChange={(event) => updateOrderForm("notes", event.target.value)} placeholder="Talle, color de prenda, fecha deseada o indicaciones para producción." /></label>
                  <div className="order-actions">
                    <button className="btn" type="submit" disabled={sendingOrder}>{sendingOrder ? "Enviando..." : "Enviar pedido"}</button>
                  </div>
                </form>
              </section>
            </div>
          </div>
        </div>
      </section>

      <Footer companyName={site.general.companyName} whatsappLink={whatsappLink} instagram={site.general.instagram} facebook={site.general.facebook} />
    </>
  );
}
