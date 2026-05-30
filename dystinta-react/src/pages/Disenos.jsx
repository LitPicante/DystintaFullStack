import { useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const FONT_SIZE_MAP = {
  Pequeño: "1rem",
  Mediano: "1.4rem",
  Grande: "2rem",
};

const CM_TO_PX = 18;
const MIN_LAYER_CM = 1;

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
  const [activeTool, setActiveTool] = useState("capas");
  const [canvasSize, setCanvasSize] = useState({ width: 30, height: 40 });
  const [imageLayers, setImageLayers] = useState([]);
  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const [backgroundSelection, setBackgroundSelection] = useState([]);
  const [removingLayerBackground, setRemovingLayerBackground] = useState(false);
  const [designText, setDesignText] = useState("");
  const [textSize, setTextSize] = useState("Mediano");
  const [selectedColor, setSelectedColor] = useState("#8b4bff");
  const [shapeType, setShapeType] = useState("circle");
  const [showText, setShowText] = useState(false);
  const [showShape, setShowShape] = useState(false);
  const [showShirt, setShowShirt] = useState(false);
  const [orderForm, setOrderForm] = useState(EMPTY_ORDER_FORM);

  const canvasRef = useRef(null);
  const previewShirtRef = useRef(null);
  const previewTextRef = useRef(null);
  const previewShapeRef = useRef(null);
  const layerInteractionRef = useRef(null);

  useDraggable(previewShirtRef, canvasRef, { x: 0, y: 0 });
  useDraggable(previewTextRef, canvasRef, { x: 0, y: -8 });
  useDraggable(previewShapeRef, canvasRef, { x: 0, y: 38 });

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
    const onPointerMove = (event) => {
      const interaction = layerInteractionRef.current;
      if (!interaction || interaction.pointerId !== event.pointerId) return;
      const dxCm = (event.clientX - interaction.startClientX) / CM_TO_PX;
      const dyCm = (event.clientY - interaction.startClientY) / CM_TO_PX;

      setImageLayers((current) => current.map((layer) => {
        if (layer.id !== interaction.layerId || layer.locked) return layer;
        if (interaction.type === "move") {
          return {
            ...layer,
            xCm: roundCm(clamp(interaction.startLayer.xCm + dxCm, 0, canvasSize.width - layer.widthCm)),
            yCm: roundCm(clamp(interaction.startLayer.yCm + dyCm, 0, canvasSize.height - layer.heightCm)),
          };
        }

        let nextX = interaction.startLayer.xCm;
        let nextY = interaction.startLayer.yCm;
        let nextWidth = interaction.startLayer.widthCm;
        let nextHeight = interaction.startLayer.heightCm;

        if (interaction.handle.includes("e")) {
          nextWidth = clamp(interaction.startLayer.widthCm + dxCm, MIN_LAYER_CM, canvasSize.width - nextX);
        }
        if (interaction.handle.includes("s")) {
          nextHeight = clamp(interaction.startLayer.heightCm + dyCm, MIN_LAYER_CM, canvasSize.height - nextY);
        }
        if (interaction.handle.includes("w")) {
          const clampedDx = clamp(dxCm, -interaction.startLayer.xCm, interaction.startLayer.widthCm - MIN_LAYER_CM);
          nextX = interaction.startLayer.xCm + clampedDx;
          nextWidth = interaction.startLayer.widthCm - clampedDx;
        }
        if (interaction.handle.includes("n")) {
          const clampedDy = clamp(dyCm, -interaction.startLayer.yCm, interaction.startLayer.heightCm - MIN_LAYER_CM);
          nextY = interaction.startLayer.yCm + clampedDy;
          nextHeight = interaction.startLayer.heightCm - clampedDy;
        }

        return {
          ...layer,
          xCm: roundCm(nextX),
          yCm: roundCm(nextY),
          widthCm: roundCm(nextWidth),
          heightCm: roundCm(nextHeight),
        };
      }));
    };

    const onPointerUp = (event) => {
      const interaction = layerInteractionRef.current;
      if (!interaction || interaction.pointerId !== event.pointerId) return;
      layerInteractionRef.current = null;
      document.body.classList.remove("canvas-layer-resizing");
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [canvasSize.height, canvasSize.width]);

  const canvasPixelSize = useMemo(() => ({
    width: canvasSize.width * CM_TO_PX,
    height: canvasSize.height * CM_TO_PX,
  }), [canvasSize.height, canvasSize.width]);

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

  async function removeBackgroundFromSelectedLayers() {
    if (!backgroundSelection.length) {
      alert("Seleccioná una o varias imágenes del lienzo.");
      return;
    }

    setRemovingLayerBackground(true);
    try {
      const selectedIds = new Set(backgroundSelection);
      const processedById = new Map();
      const selectedLayers = imageLayers.filter((layer) => selectedIds.has(layer.id));

      for (const layer of selectedLayers) {
        const processed = await removeBackgroundFromImage(layer.src);
        const fileBaseName = (layer.name || "imagen-lienzo").replace(/\.[^.]+$/, "");
        processedById.set(layer.id, {
          src: processed,
          file: dataUrlToFile(processed, `${fileBaseName}-sin-fondo.png`),
          name: `${fileBaseName}-sin-fondo.png`,
        });
      }

      setImageLayers((current) => current.map((layer) => (
        processedById.has(layer.id)
          ? { ...layer, ...processedById.get(layer.id) }
          : layer
      )));
    } catch {
      alert("No se pudo quitar el fondo de una o más imágenes.");
    } finally {
      setRemovingLayerBackground(false);
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

  function updateCanvasSize(field, value) {
    const nextValue = clamp(Number(value) || 1, 1, 300);
    setCanvasSize((current) => ({ ...current, [field]: nextValue }));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function roundCm(value) {
    return Math.round(value * 10) / 10;
  }

  function formatCm(value) {
    return roundCm(value).toLocaleString("es-PY", { maximumFractionDigits: 1 });
  }

  function buildImageLayer(file, src, offset = 0) {
    const maxWidth = Math.max(MIN_LAYER_CM, canvasSize.width - 1);
    const maxHeight = Math.max(MIN_LAYER_CM, canvasSize.height - 1);
    const widthCm = Math.min(10, maxWidth);
    const heightCm = Math.min(10, maxHeight);
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: file?.name || "imagen-lienzo.png",
      file,
      src,
      xCm: roundCm(clamp(1 + offset, 0, canvasSize.width - widthCm)),
      yCm: roundCm(clamp(1 + offset, 0, canvasSize.height - heightCm)),
      widthCm,
      heightCm,
      locked: false,
    };
  }

  function handleCanvasImageUpload(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    files.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        setImageLayers((current) => {
          const layer = buildImageLayer(file, result, current.length + index);
          setSelectedLayerId(layer.id);
          setBackgroundSelection((selected) => [...new Set([...selected, layer.id])]);
          return [...current, layer];
        });
      };
      reader.readAsDataURL(file);
    });
    event.target.value = "";
  }

  function startLayerMove(event, layer) {
    if (event.target.closest(".canvas-layer-toolbar") || event.target.closest(".resize-handle")) return;
    setSelectedLayerId(layer.id);
    if (layer.locked) return;
    event.preventDefault();
    layerInteractionRef.current = {
      type: "move",
      pointerId: event.pointerId,
      layerId: layer.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startLayer: layer,
    };
  }

  function startLayerResize(event, layer, handle) {
    if (layer.locked) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedLayerId(layer.id);
    document.body.classList.add("canvas-layer-resizing");
    layerInteractionRef.current = {
      type: "resize",
      handle,
      pointerId: event.pointerId,
      layerId: layer.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startLayer: layer,
    };
  }

  function toggleLayerLock(id) {
    setImageLayers((current) => current.map((layer) => (
      layer.id === id ? { ...layer, locked: !layer.locked } : layer
    )));
  }

  function duplicateLayer(id) {
    setImageLayers((current) => {
      const source = current.find((layer) => layer.id === id);
      if (!source) return current;
      const copy = {
        ...source,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: `${source.name} copia`,
        xCm: roundCm(clamp(source.xCm + 1, 0, canvasSize.width - source.widthCm)),
        yCm: roundCm(clamp(source.yCm + 1, 0, canvasSize.height - source.heightCm)),
        locked: false,
      };
      setSelectedLayerId(copy.id);
      return [...current, copy];
    });
  }

  function deleteLayer(id) {
    setImageLayers((current) => current.filter((layer) => layer.id !== id));
    setSelectedLayerId((current) => (current === id ? null : current));
    setBackgroundSelection((current) => current.filter((layerId) => layerId !== id));
  }

  function toggleBackgroundSelection(layerId) {
    setBackgroundSelection((current) => (
      current.includes(layerId)
        ? current.filter((id) => id !== layerId)
        : [...current, layerId]
    ));
  }

  function selectAllImageLayersForBackground() {
    setBackgroundSelection(imageLayers.map((layer) => layer.id));
  }

  function clearBackgroundSelection() {
    setBackgroundSelection([]);
  }

  function addShirtMockup() {
    setShowShirt(true);
  }

  function removeShirtMockup() {
    setShowShirt(false);
  }

  function addTextLayer() {
    setShowText(true);
    setDesignText((current) => current || "Texto");
  }

  function removeTextLayer() {
    setShowText(false);
    setDesignText("");
  }

  function addShapeLayer() {
    setShowShape(true);
  }

  function removeShapeLayer() {
    setShowShape(false);
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

  function escapeXml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getDraggablePosition(ref, fallback = { x: 0, y: 0 }) {
    const element = ref.current;
    return {
      x: Number(element?.dataset?.x || fallback.x),
      y: Number(element?.dataset?.y || fallback.y),
    };
  }

  function buildMockupSnapshotSvg() {
    const width = canvasPixelSize.width;
    const height = canvasPixelSize.height;
    const textPosition = getDraggablePosition(previewTextRef, { x: 0, y: -8 });
    const shapePosition = getDraggablePosition(previewShapeRef, { x: 0, y: 38 });
    const shirtPosition = getDraggablePosition(previewShirtRef, { x: 0, y: 0 });
    const textFontPx = textSize === "Grande" ? 32 : textSize === "Pequeño" ? 16 : 22;
    const shapeWidth = shapeType === "pill" ? 170 : 110;
    const shapeHeight = shapeType === "pill" ? 78 : 110;
    const shapeRadius = shapeType === "square" ? 24 : shapeType === "pill" ? 39 : 55;
    const shirtX = width / 2 + shirtPosition.x - 135;
    const shirtY = height / 2 + shirtPosition.y - 155;
    const shapeX = width / 2 + shapePosition.x - shapeWidth / 2;
    const shapeY = height / 2 + shapePosition.y - shapeHeight / 2;
    const textX = width / 2 + textPosition.x;
    const textY = height / 2 + textPosition.y;

    const layerMarkup = imageLayers.map((layer) => `
      <image href="${escapeXml(layer.src)}" x="${layer.xCm * CM_TO_PX}" y="${layer.yCm * CM_TO_PX}" width="${layer.widthCm * CM_TO_PX}" height="${layer.heightCm * CM_TO_PX}" preserveAspectRatio="xMidYMid meet" />
      <rect x="${layer.xCm * CM_TO_PX}" y="${layer.yCm * CM_TO_PX}" width="${layer.widthCm * CM_TO_PX}" height="${layer.heightCm * CM_TO_PX}" fill="none" stroke="#00eaff" stroke-width="1" stroke-dasharray="4 4" />
      <text x="${layer.xCm * CM_TO_PX + 4}" y="${layer.yCm * CM_TO_PX + 14}" fill="#00eaff" font-family="Arial" font-size="11">${escapeXml(layer.name)} · ${formatCm(layer.widthCm)} x ${formatCm(layer.heightCm)} cm</text>
    `).join("");

    const shirtMarkup = showShirt ? `
      <g transform="translate(${shirtX} ${shirtY})">
        <polygon points="75.6,37.2 108,18.6 162,18.6 194.4,37.2 248.4,68.2 270,117.8 232.2,136.4 210.6,99.2 210.6,310 59.4,310 59.4,99.2 37.8,136.4 0,117.8 21.6,68.2" fill="#d4c8ef" stroke="rgba(255,255,255,.45)" stroke-width="2" />
        <path d="M87 28 Q135 66 183 28" fill="none" stroke="#2a1d3e" stroke-width="22" stroke-linecap="round" />
      </g>
    ` : "";

    const shapeMarkup = showShape ? `
      <rect x="${shapeX}" y="${shapeY}" width="${shapeWidth}" height="${shapeHeight}" rx="${shapeRadius}" fill="${selectedColor}" opacity="0.32" />
    ` : "";

    const textMarkup = showText && designText ? `
      <text x="${textX}" y="${textY}" fill="${selectedColor}" font-family="Arial, sans-serif" font-size="${textFontPx}" font-weight="900" text-anchor="middle" dominant-baseline="middle">${escapeXml(designText)}</text>
    ` : "";

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect width="100%" height="100%" fill="#21172c" />
        <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" fill="none" stroke="#8b4bff" stroke-width="1" />
        <text x="14" y="22" fill="#ffffff" font-family="Arial" font-size="14" font-weight="700">Lienzo: ${formatCm(canvasSize.width)} x ${formatCm(canvasSize.height)} cm</text>
        ${shirtMarkup}
        ${layerMarkup}
        ${shapeMarkup}
        ${textMarkup}
      </svg>
    `.trim();
  }

  function createMockupSnapshotFile() {
    const svg = buildMockupSnapshotSvg();
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    return new File([blob], "lienzo-mockup-cliente.svg", { type: "image/svg+xml" });
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
        `Imágenes en lienzo: ${imageLayers.length}.`,
        `Remera de fondo: ${showShirt ? "visible" : "eliminada/oculta"}.`,
        `Lienzo: ${canvasSize.width} x ${canvasSize.height} cm.`,
        "Archivo de armado del lienzo: adjunto como lienzo-mockup-cliente.svg.",
        orderForm.notes ? `Notas del cliente: ${orderForm.notes}` : "",
      ].filter(Boolean).join("\n");
      const extraData = {
        source: "mockup-designer",
        text: { value: designText, size: textSize, visible: showText },
        color: selectedColor,
        shape: { type: shapeType, visible: showShape },
        canvas: { ...canvasSize, unit: "cm" },
        imageLayers: imageLayers.map((layer) => ({
          name: layer.name,
          xCm: layer.xCm,
          yCm: layer.yCm,
          widthCm: layer.widthCm,
          heightCm: layer.heightCm,
          locked: layer.locked,
        })),
        mockup: { shirtVisible: showShirt },
      };

      payload.append("service", "DTF Textil");
      payload.append("name", orderForm.name);
      payload.append("phone", orderForm.phone);
      payload.append("email", orderForm.email);
      payload.append("quantity", "Mockup de diseño");
      payload.append("details", details);
      payload.append("extraData", JSON.stringify(extraData));

      const snapshotFile = createMockupSnapshotFile();
      payload.append("file", snapshotFile);
      payload.append("attachments", snapshotFile);

      imageLayers.forEach((layer, index) => {
        if (!layer.file) return;
        if (index === 0 && !snapshotFile) payload.append("file", layer.file);
        payload.append("attachments", layer.file);
      });

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
              <button className={`tool-btn${activeTool === "capas" ? " active" : ""}`} type="button" onClick={() => setActiveTool("capas")}>Capas y mockup</button>
              <button className={`tool-btn${activeTool === "remera" ? " active" : ""}`} type="button" onClick={() => setActiveTool("remera")}>Diseñar remera</button>
            </aside>

            <div className="design-stage-wrap">
              <div className="design-stage">
                <div className="design-preview-card">
                  <div className="preview-topbar">
                    <span className="badge">Vista previa</span>
                    <span className="hint">Simulación visual para el cliente</span>
                  </div>
                  <div
                    className="design-canvas"
                    ref={canvasRef}
                    onPointerDown={(event) => {
                      if (event.target === event.currentTarget) setSelectedLayerId(null);
                    }}
                    style={{
                      width: `${canvasPixelSize.width}px`,
                      height: `${canvasPixelSize.height}px`,
                    }}
                  >
                    <div ref={previewShirtRef} className={`canvas-shirt${showShirt ? "" : " hidden"}`}></div>
                    {imageLayers.map((layer) => {
                      const selected = selectedLayerId === layer.id;
                      return (
                        <div
                          key={layer.id}
                          className={`canvas-image-layer${selected ? " selected" : ""}${layer.locked ? " locked" : ""}`}
                          onPointerDown={(event) => startLayerMove(event, layer)}
                          style={{
                            left: `${layer.xCm * CM_TO_PX}px`,
                            top: `${layer.yCm * CM_TO_PX}px`,
                            width: `${layer.widthCm * CM_TO_PX}px`,
                            height: `${layer.heightCm * CM_TO_PX}px`,
                          }}
                        >
                          <img alt={layer.name} src={layer.src} />
                          {selected ? (
                            <>
                              <div className="canvas-layer-toolbar">
                                <button type="button" title={layer.locked ? "Desbloquear posición" : "Bloquear posición"} onClick={() => toggleLayerLock(layer.id)}>{layer.locked ? "Abrir" : "Candado"}</button>
                                <button type="button" title="Duplicar imagen" onClick={() => duplicateLayer(layer.id)}>+</button>
                                <button type="button" title="Eliminar imagen" onClick={() => deleteLayer(layer.id)}>Eliminar</button>
                              </div>
                              <span className="canvas-layer-size">{formatCm(layer.widthCm)} x {formatCm(layer.heightCm)} cm</span>
                              {!layer.locked ? ["n", "s", "e", "w", "ne", "nw", "se", "sw"].map((handle) => (
                                <button
                                  key={handle}
                                  className={`resize-handle ${handle}`}
                                  type="button"
                                  aria-label={`Redimensionar ${handle}`}
                                  onPointerDown={(event) => startLayerResize(event, layer, handle)}
                                />
                              )) : null}
                            </>
                          ) : null}
                        </div>
                      );
                    })}
                    <div
                      id="designPreviewText"
                      ref={previewTextRef}
                      className={`canvas-text${showText ? "" : " hidden"}`}
                      style={{ color: selectedColor, fontSize: FONT_SIZE_MAP[textSize] || "1.4rem" }}
                    >
                      {designText}
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
                  <section className={`tool-panel${activeTool === "capas" ? " active" : ""}`} id="tool-capas">
                    <h3>Capas y mockup</h3>
                    <div className="form-row">
                      <label>Ancho del lienzo (cm)<input type="number" min="1" max="300" step="0.5" value={canvasSize.width} onChange={(event) => updateCanvasSize("width", event.target.value)} /></label>
                      <label>Alto del lienzo (cm)<input type="number" min="1" max="300" step="0.5" value={canvasSize.height} onChange={(event) => updateCanvasSize("height", event.target.value)} /></label>
                    </div>
                    <label>Agregar imágenes al lienzo<input type="file" accept="image/*" multiple onChange={handleCanvasImageUpload} /></label>
                    <div className="info-card"><strong>Hoja actual</strong><p>{formatCm(canvasSize.width)} x {formatCm(canvasSize.height)} cm. Imágenes cargadas: {imageLayers.length}.</p></div>
                    <div className="tool-subsection">
                      <h4>Quita fondos de capas</h4>
                      {imageLayers.length ? (
                        <>
                          <div className="layer-selection-list">
                            {imageLayers.map((layer) => (
                              <label className="layer-selection-item" key={layer.id}>
                                <input
                                  type="checkbox"
                                  checked={backgroundSelection.includes(layer.id)}
                                  onChange={() => toggleBackgroundSelection(layer.id)}
                                />
                                {layer.src ? <img src={layer.src} alt={layer.name} /> : null}
                                <span>{layer.name}</span>
                                <small>{formatCm(layer.widthCm)} x {formatCm(layer.heightCm)} cm</small>
                              </label>
                            ))}
                          </div>
                          <div className="panel-action-row">
                            <button className="btn soft small" type="button" onClick={selectAllImageLayersForBackground}>Seleccionar todas</button>
                            <button className="btn soft small" type="button" onClick={clearBackgroundSelection}>Limpiar selección</button>
                            <button className="btn small" type="button" onClick={removeBackgroundFromSelectedLayers} disabled={removingLayerBackground || !backgroundSelection.length}>
                              {removingLayerBackground ? "Procesando..." : "Quitar fondo"}
                            </button>
                          </div>
                        </>
                      ) : (
                        <p className="hint">Subí una o varias imágenes al lienzo para poder quitarles el fondo.</p>
                      )}
                    </div>
                    <p className="hint">El lienzo empieza vacío. Agregá mockups o elementos desde Diseñar remera cuando corresponda.</p>
                  </section>

                  <section className={`tool-panel${activeTool === "remera" ? " active" : ""}`} id="tool-remera">
                    <h3>Diseñar remera</h3>
                    <div className="panel-action-row">
                      <button className="btn soft small" type="button" onClick={addShirtMockup}>Agregar remera</button>
                      <button className="btn soft small" type="button" onClick={addTextLayer}>Agregar texto</button>
                      <button className="btn soft small" type="button" onClick={addShapeLayer}>Agregar figura</button>
                    </div>

                    <div className="mockup-toggle-list">
                      <label className="mockup-toggle"><input id="toggleDesignShirt" type="checkbox" checked={showShirt} onChange={(e) => setShowShirt(e.target.checked)} /> Mostrar remera</label>
                      <label className="mockup-toggle"><input id="toggleDesignText" type="checkbox" checked={showText} onChange={(e) => setShowText(e.target.checked)} /> Mostrar texto</label>
                      <label className="mockup-toggle"><input id="toggleDesignShape" type="checkbox" checked={showShape} onChange={(e) => setShowShape(e.target.checked)} /> Mostrar figura</label>
                    </div>

                    <div className="panel-action-row">
                      <button className="btn soft small" type="button" onClick={removeShirtMockup} disabled={!showShirt}>Eliminar remera</button>
                      <button className="btn soft small" type="button" onClick={removeTextLayer} disabled={!showText && !designText}>Eliminar texto</button>
                      <button className="btn soft small" type="button" onClick={removeShapeLayer} disabled={!showShape}>Eliminar figura</button>
                    </div>

                    <div className="tool-subsection">
                      <h4>Texto</h4>
                      <div className="form-row">
                        <label>Texto principal<input id="designTextInput" value={designText} onChange={(e) => { setDesignText(e.target.value); setShowText(Boolean(e.target.value)); }} /></label>
                        <label>Tamaño<select id="designTextSize" value={textSize} onChange={(e) => setTextSize(e.target.value)}><option>Pequeño</option><option>Mediano</option><option>Grande</option></select></label>
                      </div>
                      <label>Tipografía<select><option>Sans</option><option>Bold</option><option>Script</option></select></label>
                    </div>

                    <div className="tool-subsection">
                      <h4>Colores</h4>
                      <div className="palette-block"><strong>Paleta vibrante</strong><div className="color-palette">{["#8b4bff", "#6a2db8", "#35d07f", "#ffcc66", "#0b0613"].map((color) => <button key={color} className={`color-chip${selectedColor === color ? " active" : ""}`} style={{ "--chip-color": color }} title={color} type="button" onClick={() => setSelectedColor(color)}></button>)}</div></div>
                      <div className="palette-block"><strong>Paleta pastel</strong><div className="color-palette">{["#f7b2d9", "#ffd8a8", "#c7f9cc", "#a9def9", "#d0bfff"].map((color) => <button key={color} className={`color-chip${selectedColor === color ? " active" : ""}`} style={{ "--chip-color": color }} title={color} type="button" onClick={() => setSelectedColor(color)}></button>)}</div></div>
                      <div className="palette-block"><strong>Paleta industrial</strong><div className="color-palette">{["#111827", "#374151", "#ef4444", "#0ea5e9", "#f97316"].map((color) => <button key={color} className={`color-chip${selectedColor === color ? " active" : ""}`} style={{ "--chip-color": color }} title={color} type="button" onClick={() => setSelectedColor(color)}></button>)}</div></div>
                    </div>

                    <div className="tool-subsection">
                      <h4>Figuras</h4>
                      <div className="shape-grid">
                        <button className={`shape-btn${shapeType === "circle" ? " active" : ""}`} type="button" onClick={() => { setShapeType("circle"); setShowShape(true); }}>Círculo</button>
                        <button className={`shape-btn${shapeType === "square" ? " active" : ""}`} type="button" onClick={() => { setShapeType("square"); setShowShape(true); }}>Cuadrado</button>
                        <button className={`shape-btn${shapeType === "pill" ? " active" : ""}`} type="button" onClick={() => { setShapeType("pill"); setShowShape(true); }}>Píldora</button>
                      </div>
                    </div>
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

