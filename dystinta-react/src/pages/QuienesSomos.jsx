import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function QuienesSomos() {
  const [site, setSite] = useState(null);
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
    return () => {
      mounted = false;
    };
  }, []);

  const whatsappLink = useMemo(() => {
    const raw = site?.general?.whatsappRaw || "";
    return raw ? `https://wa.me/${raw}` : "#";
  }, [site]);
  const aboutCards = site?.about?.cards || [];

  if (error) return <div className="section"><div className="container"><div className="notice danger">{error}</div></div></div>;
  if (!site) return <div className="section"><div className="container"><div className="notice">Cargando...</div></div></div>;

  return (
    <>
      <Navbar companyName={site.general.companyName} slogan={site.general.slogan} theme={site.general} />

      <section className="section">
        <div className="container">
          <span className="badge">Guía práctica</span>
          <h2>{site.about?.title || "Asesoría de producción"}</h2>
          <p className="lead">
            {site.about?.text || "Referencia rápida para trabajar mejor con serigrafía, sublimación y DTF. Los tiempos y temperaturas pueden variar según máquina, tinta, film, tela y presión, pero esta base sirve para orientar decisiones comerciales y productivas."}
          </p>
          {aboutCards.length ? (
            <div className="about-dynamic-grid">
              {aboutCards.map((card) => (
                <article className="about-dynamic-card" key={card.id}>
                  {card.image ? <img src={card.image} alt={card.title} /> : null}
                  <div>
                    <h3>{card.title}</h3>
                    <p>{card.text}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
          <div className="grid-3">
            <article className="info-card">
              <h3>DTF Textil</h3>
              <p><strong>Plancha sugerida:</strong> 145°C a 160°C durante 10 a 15 segundos.</p>
              <p><strong>Presión:</strong> media a media/alta según el film y la prenda.</p>
              <p><strong>Recomendado para:</strong> algodón, poliéster, mezclas y prendas oscuras o claras.</p>
              <p><strong>Consejo:</strong> dejar enfriar o seguir el tipo de peel del film antes del segundo planchado de fijación.</p>
            </article>
            <article className="info-card">
              <h3>Sublimación</h3>
              <p><strong>Plancha sugerida:</strong> 180°C a 200°C durante 30 a 45 segundos.</p>
              <p><strong>Presión:</strong> media.</p>
              <p><strong>Recomendado para:</strong> poliéster blanco o superficies con recubrimiento para sublimación.</p>
              <p><strong>Consejo:</strong> cuanto más alto el porcentaje de poliéster, mejor definición y durabilidad del color.</p>
            </article>
            <article className="info-card">
              <h3>Serigrafía</h3>
              <p><strong>Curado orientativo:</strong> depende de la tinta, pero suele requerir secado técnico o túnel para fijación completa.</p>
              <p><strong>Recomendado para:</strong> volumen, colores planos, prendas promocionales y grandes tiradas.</p>
              <p><strong>Consejo:</strong> validar siempre malla, fotolito, registro y opacidad antes de entrar en producción completa.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Tiempos orientativos de planchado por material</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Técnica</th>
                  <th>Temperatura</th>
                  <th>Tiempo</th>
                  <th>Observación</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Algodón</td><td>DTF</td><td>150°C aprox.</td><td>12 a 15 s</td><td>Usar presión media y planchado final corto para sellado.</td></tr>
                <tr><td>Poliéster</td><td>DTF</td><td>140°C a 150°C</td><td>10 a 12 s</td><td>Bajar temperatura si la tela es sensible al brillo.</td></tr>
                <tr><td>Poliéster blanco</td><td>Sublimación</td><td>190°C a 200°C</td><td>35 a 45 s</td><td>Ideal para colores vivos y máxima transferencia.</td></tr>
                <tr><td>Tazas / rígidos sublimables</td><td>Sublimación</td><td>Según equipo</td><td>Variable</td><td>Depende de prensa, resistencia y recubrimiento.</td></tr>
                <tr><td>Remeras para volumen</td><td>Serigrafía</td><td>Curado técnico</td><td>Variable</td><td>La fijación final depende de la tinta y del sistema de secado.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container grid-2">
          <div className="info-card">
            <h3>Paleta de colores recomendada</h3>
            <p><strong>Serigrafía:</strong> conviene trabajar con colores sólidos bien definidos, especialmente si se busca repetibilidad en volumen.</p>
            <p><strong>Sublimación:</strong> rinde mejor con paletas vibrantes, degradados y composición full color sobre fondos claros.</p>
            <p><strong>DTF:</strong> permite gran libertad cromática, detalles finos y colores intensos, incluso en prendas oscuras.</p>
            <p><strong>Tip comercial:</strong> si el cliente necesita fidelidad exacta, pedir referencia Pantone o una muestra física previa.</p>
          </div>
          <div className="info-card">
            <h3>Buenas prácticas de archivo</h3>
            <p>Enviar en PNG transparente, PDF o vector cuando aplique.</p>
            <p>Trabajar a tamaño real o indicar medidas exactas.</p>
            <p>Convertir textos a curvas si se envían archivos editables.</p>
            <p>Evitar fondos innecesarios y revisar resolución antes de producir.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container grid-2">
          <div className="info-card">
            <h3>Cuándo conviene cada técnica</h3>
            <p><strong>DTF:</strong> ideal para variedad de talles, diseños complejos y pedidos flexibles.</p>
            <p><strong>Sublimación:</strong> mejor opción para poliéster blanco y artículos sublimables.</p>
            <p><strong>Serigrafía:</strong> conviene cuando hay volumen, pocas tintas y necesidad de costo competitivo por unidad.</p>
          </div>
          <div className="info-card">
            <h3>Recomendación final</h3>
            <p>Antes de producir una tanda grande, siempre conviene testear una muestra. Esa validación reduce errores de color, presión, encogimiento y posicionamiento del diseño.</p>
            <Link className="btn" to="/contacto">Solicitar asesoría</Link>
          </div>
        </div>
      </section>

      <Footer
        companyName={site.general.companyName}
        whatsappLink={whatsappLink}
        instagram={site.general.instagram}
        facebook={site.general.facebook}
      />
    </>
  );
}
