import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Carrusel from "../components/Carrusel";

export default function Home() {
  const [site, setSite] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadSite() {
      try {
        const { data } = await api.get("/site/public/");
        if (mounted) setSite(data);
      } catch (err) {
        if (mounted) setError("No se pudo cargar la información del sitio.");
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

  if (error) {
    return (
      <div className="section">
        <div className="container">
          <div className="notice danger">{error}</div>
        </div>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="section">
        <div className="container">
          <div className="notice">Cargando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="home-shell">
      <Navbar companyName={site.general.companyName} slogan={site.general.slogan} theme={site.general} />

      <main>
        <section className="home-hero">
          <Carrusel captions={site.home} />

          <div className="container home-copy-wrap">
            <div className="home-copy">
              <span className="home-kicker">Centro gráfico para marcas, talleres y revendedores</span>
              <h1 data-home-title>{site.home.title}</h1>
              <p className="home-lead" data-home-subtitle>{site.home.subtitle}</p>
              <div className="cta-row">
                <a className="btn green" data-whatsapp-link href={whatsappLink}>
                  Hablar con un vendedor
                </a>
                <Link className="btn outline" to="/pedidos">
                  Subir pedido
                </Link>
              </div>
              <div className="home-stat-row">
                <article className="home-stat-card">
                  <strong>3</strong>
                  <span>Líneas activas de producción</span>
                </article>
                <article className="home-stat-card">
                  <strong>48 hs</strong>
                  <span>Respuesta comercial estimada</span>
                </article>
                <article className="home-stat-card">
                  <strong>PY</strong>
                  <span>Atención para todo Paraguay</span>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section className="section home-services">
          <div className="container">
            <div className="section-heading">
              <div>
                <span className="badge">Servicios</span>
                <h2>Un flujo claro para cotizar, producir y entregar</h2>
              </div>
              <Link className="btn soft" to="/servicios">
                Ver todos
              </Link>
            </div>
            <div className="home-service-grid">
              <article className="service-card service-card-emphasis">
                <span className="badge">DTF Textil</span>
                <h3>Producción para prendas y colecciones</h3>
                <p>Ideal para marcas, uniformes, drops promocionales y tiradas cortas con alta definición.</p>
                <Link className="btn small" to="/pedidos">
                  Solicitar pedido
                </Link>
              </article>
              <article className="service-card">
                <span className="badge">DTF UV</span>
                <h3>Adhesivos para rígidos y packaging</h3>
                <p>Aplicación sobre frascos, cajas, botellas, señalética pequeña y piezas de branding.</p>
                <Link className="btn small" to="/pedidos">
                  Cotizar DTF UV
                </Link>
              </article>
              <article className="service-card">
                <span className="badge">Serigrafía</span>
                <h3>Volumen con terminación estable</h3>
                <p>Solución pensada para eventos, campañas, remeras corporativas y pedidos repetitivos.</p>
                <Link className="btn small" to="/pedidos">
                  Pedir serigrafía
                </Link>
              </article>
            </div>
          </div>
        </section>

        <section className="section home-directory">
          <div className="container home-directory-grid">
            <article className="info-card directory-card">
              <span className="badge">Atención</span>
              <h3>Canales de contacto</h3>
              <ul className="directory-list">
                <li>
                  <strong>Ventas mayoristas</strong>
                  <span>+595 981 000 111</span>
                </li>
                <li>
                  <strong>Asesor comercial</strong>
                  <span>+595 981 000 222</span>
                </li>
                <li>
                  <strong>Seguimiento de pedidos</strong>
                  <span>+595 981 000 333</span>
                </li>
              </ul>
              <a className="btn small" data-whatsapp-link href={whatsappLink}>
                Escribir por WhatsApp
              </a>
            </article>

            <article className="info-card directory-card">
              <span className="badge">Showroom</span>
              <h3>Visitanos con cita previa</h3>
              <p className="lead-small">Av. Creativa 2450, Asunción, Paraguay</p>
              <div className="directory-meta">
                <span>Lunes a Viernes</span>
                <strong>08:30 a 18:00 hs</strong>
              </div>
              <div className="directory-map-placeholder">Mapa de referencia comercial</div>
            </article>

            <article className="info-card directory-card">
              <span className="badge">Recursos</span>
              <h3>Accesos rápidos</h3>
              <div className="directory-links">
                <Link to="/calculadora">Calculadora DTF</Link>
                <Link to="/pedidos">Formulario de pedidos</Link>
                <Link to="/disenos">Mockups y muestras</Link>
                <Link to="/contacto">Hablar con el equipo</Link>
              </div>
            </article>
          </div>
        </section>
      </main>

      <Footer
        companyName={site.general.companyName}
        whatsappLink={whatsappLink}
        instagram={site.general.instagram}
        facebook={site.general.facebook}
      />
    </div>
  );
}
