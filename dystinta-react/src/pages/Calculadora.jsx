import { useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const PALETTE = ["#8b4bff", "#6a2db8", "#35d07f", "#ffcc66", "#ff7f9b", "#d7b8ff"];

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

function canFit(space, box) {
  return (space.width >= box.width && space.height >= box.height) || (space.width >= box.height && space.height >= box.width);
}

function pickSpace(box, spaces) {
  return spaces.reduce((best, space, index, all) => (canFit(space, box) && (best === -1 || canFit(all[best], space)) ? index : best), -1);
}

function packBoxes(boxes, materialWidth) {
  const spaces = [{ x: 0, y: 0, width: materialWidth, height: Number.POSITIVE_INFINITY }];
  const packed = [];

  boxes.slice().sort((a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height)).forEach((originalBox) => {
    let box = { ...originalBox };
    const slotIndex = pickSpace(box, spaces);
    if (slotIndex === -1) return;
    const slot = spaces[slotIndex];

    if ((box.width > slot.width || box.height > slot.height) && canFit(slot, { width: box.height, height: box.width })) {
      box = { ...box, width: box.height, height: box.width };
    }

    packed.push({ box, x: slot.x, y: slot.y });

    if (box.width === slot.width && box.height === slot.height) {
      spaces.splice(slotIndex, 1);
    } else if (box.height === slot.height) {
      slot.x += box.width;
      slot.width -= box.width;
    } else if (box.width === slot.width) {
      slot.y += box.height;
      slot.height -= box.height;
    } else {
      spaces.push({ x: slot.x + box.width, y: slot.y, width: slot.width - box.width, height: box.height });
      slot.y += box.height;
      slot.height -= box.height;
    }

    for (let i = spaces.length - 1; i >= 0; i -= 1) {
      for (let j = spaces.length - 1; j >= 0; j -= 1) {
        if (i === j) continue;
        if (spaces[i].x === spaces[j].x) {
          if (spaces[i].y < spaces[j].y) {
            spaces[i].height += spaces[j].height;
            spaces.splice(j, 1);
          } else {
            spaces[j].height += spaces[i].height;
            spaces.splice(i, 1);
            break;
          }
        }
      }
    }
  });

  return { packed, spaces };
}

export default function Calculadora() {
  const [site, setSite] = useState(null);
  const [error, setError] = useState("");
  const [colorIndex, setColorIndex] = useState(1);
  const [materialWidth, setMaterialWidth] = useState("100");
  const [separationWidth, setSeparationWidth] = useState("1");
  const [padding, setPadding] = useState("0");
  const [items, setItems] = useState([{ width: 21, height: 21, repeated: 1, color: PALETTE[0] }]);
  const canvasRef = useRef(null);

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

  const whatsappLink = useMemo(() => {
    const raw = site?.general?.whatsappRaw || "";
    return raw ? `https://wa.me/${raw}` : "#";
  }, [site]);

  const expanded = useMemo(() => {
    const gap = parseNumber(separationWidth, 1);
    return items.flatMap((item) => {
      const repeated = Math.max(1, Math.round(parseNumber(item.repeated, 1)));
      return Array.from({ length: repeated }, () => ({
        width: parseNumber(item.width, 0) + gap,
        height: parseNumber(item.height, 0) + gap,
        color: item.color,
      }));
    }).filter((item) => item.width > 0 && item.height > 0);
  }, [items, separationWidth]);

  const calculation = useMemo(() => {
    const width = parseNumber(materialWidth, 100);
    const pad = parseNumber(padding, 0);
    const separation = parseNumber(separationWidth, 1);
    const usableWidth = Math.max(width - pad * 2 + separation, 1);
    const layout = packBoxes(expanded, usableWidth);
    const totalHeight = layout.packed.reduce((max, item) => Math.max(max, item.y + item.box.height), 0);

    return {
      layout,
      usableWidth,
      materialWidthNumber: width,
      heightCm: Math.max(totalHeight - separation, 0),
    };
  }, [materialWidth, padding, separationWidth, expanded]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const totalHeight = calculation.layout.packed.reduce((max, item) => Math.max(max, item.y + item.box.height), 0);
    const scale = calculation.usableWidth > 0 ? Math.min(520, calculation.usableWidth) / calculation.usableWidth : 1;

    canvas.width = Math.max(calculation.usableWidth, 1);
    canvas.height = Math.max(totalHeight, 1);
    canvas.style.width = `${Math.max(calculation.usableWidth * scale, 220)}px`;
    canvas.style.height = `${Math.max(totalHeight * scale, 120)}px`;

    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255,255,255,.08)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(255,255,255,.16)";
    ctx.lineWidth = 1 / scale;

    calculation.layout.packed.forEach((item) => {
      ctx.fillStyle = item.box.color;
      ctx.fillRect(item.x, item.y, item.box.width, item.box.height);
      ctx.strokeRect(item.x, item.y, item.box.width, item.box.height);
    });
  }, [calculation]);

  function addItem() {
    setItems((prev) => [...prev, { width: 21, height: 21, repeated: 1, color: PALETTE[colorIndex % PALETTE.length] }]);
    setColorIndex((prev) => prev + 1);
  }

  function clearItems() {
    setItems([{ width: 21, height: 21, repeated: 1, color: PALETTE[0] }]);
    setColorIndex(1);
  }

  function updateItem(index, field, value) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: field === "repeated" ? Math.max(1, Math.round(parseNumber(value, 1))) : Math.max(0.01, parseNumber(value, 0.01)),
            }
          : item
      )
    );
  }

  function removeItem(index) {
    const next = items.filter((_, i) => i !== index);
    setItems(next.length ? next : [{ width: 21, height: 21, repeated: 1, color: PALETTE[0] }]);
  }

  if (error) return <div className="section"><div className="container"><div className="notice danger">{error}</div></div></div>;
  if (!site) return <div className="section"><div className="container"><div className="notice">Cargando...</div></div></div>;

  return (
    <>
      <Navbar companyName={site.general.companyName} slogan={site.general.slogan} />

      <section className="section">
        <div className="container">
          <div className="calc-hero">
            <div>
              <h2>{site.calc.title} en guaraníes</h2>
              <p className="lead">Configurá el ancho del film, la separación, el margen y cada diseño con sus repeticiones. La vista inferior replica exactamente la cantidad de copias cargadas.</p>
            </div>
            <div className="info-card">
              <h3>Cómo usarla</h3>
              <p>Agregá cada medida, indicá cuántas repeticiones necesitás y la calculadora acomodará las piezas sobre el film para estimar el alto recomendado.</p>
            </div>
          </div>

          <div className="dtf-calculator">
            <section className="card calc-config">
              <h3>Parámetros del material</h3>
              <div className="calc-grid-top">
                <label>Ancho del film (cm)<input id="materialWidth" type="number" min="1" step="0.01" value={materialWidth} onChange={(e) => setMaterialWidth(e.target.value)} /></label>
                <label>Separación entre imágenes (cm)<input id="separationWidth" type="number" min="0" step="0.01" value={separationWidth} onChange={(e) => setSeparationWidth(e.target.value)} /></label>
                <label>Margen del material (cm)<input id="padding" type="number" min="0" step="0.01" value={padding} onChange={(e) => setPadding(e.target.value)} /></label>
              </div>
            </section>

            <section className="calc-layout">
              <div className="calc-left">
                <div className="calc-panel-header">
                  <h3>Diseños</h3>
                  <button className="btn small" id="addCalcItem" type="button" onClick={addItem}>Agregar diseño</button>
                </div>
                <div id="calcItems" className="calc-items">
                  {items.map((item, index) => (
                    <article className="calc-item card" key={`${item.color}-${index}`}>
                      <div className="calc-item-fields">
                        <label>Ancho (cm)<input type="number" min="0.01" step="0.01" value={item.width} onChange={(e) => updateItem(index, "width", e.target.value)} /></label>
                        <label>Alto (cm)<input type="number" min="0.01" step="0.01" value={item.height} onChange={(e) => updateItem(index, "height", e.target.value)} /></label>
                        <label>Repeticiones<input type="number" min="1" step="1" value={item.repeated} onChange={(e) => updateItem(index, "repeated", e.target.value)} /></label>
                        <button className="btn soft small" type="button" onClick={() => removeItem(index)}>Eliminar</button>
                      </div>
                      <div className="calc-item-preview">
                        <div className="calc-preview-box" style={{ width: `${Math.max(item.width, 2.4)}px`, height: `${Math.max(item.height, 2.4)}px`, background: item.color }}></div>
                        <span className="hint">{formatMetric(item.width)} × {formatMetric(item.height)} cm</span>
                      </div>
                    </article>
                  ))}
                </div>
                <div className="order-actions">
                  <button className="btn soft" id="clearCalcItems" type="button" onClick={clearItems}>Eliminar todo</button>
                </div>
              </div>

              <div className="calc-right">
                <div className="calc-summary">
                  <h3>Recomendado</h3>
                  <div id="calcResult" className="notice">
                    <strong>Ancho:</strong> {formatMetric(calculation.materialWidthNumber / 100)} m
                    <br />
                    <strong>Alto:</strong> {formatMetric(calculation.heightCm / 100)} m
                    <br />
                    <span className="hint">Área útil: {formatMetric(calculation.usableWidth)} cm · Diseños cargados: {expanded.length}</span>
                  </div>
                </div>
                <div className="calc-canvas-card">
                  <canvas id="calcCanvas" ref={canvasRef}></canvas>
                </div>
              </div>
            </section>

            <section className="card calc-repetitions-card">
              <div className="calc-panel-header">
                <h3>Repeticiones</h3>
                <span className="hint">Se replica una tarjeta por cada copia solicitada.</span>
              </div>
              <div id="calcRepetitions" className="calc-repetitions">
                {items.flatMap((item, index) => {
                  const repeated = Math.max(1, Math.round(parseNumber(item.repeated, 1)));
                  return Array.from({ length: repeated }, (_, repeatIndex) => (
                    <article className="calc-repetition-card" key={`${index}-${repeatIndex}`}>
                      <div className="calc-repetition-box" style={{ background: item.color, width: `${Math.max(item.width * 2, 44)}px`, height: `${Math.max(item.height * 2, 44)}px` }}></div>
                      <strong>Diseño {index + 1}</strong>
                      <span>{formatMetric(item.width)} × {formatMetric(item.height)} cm</span>
                      <small>Repetición {repeatIndex + 1} de {repeated}</small>
                    </article>
                  ));
                })}
              </div>
            </section>
          </div>
        </div>
      </section>

      <Footer companyName={site.general.companyName} whatsappLink={whatsappLink} instagram={site.general.instagram} facebook={site.general.facebook} />
    </>
  );
}
