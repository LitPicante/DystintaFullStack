import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function Servicios() {
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

  if (error) return <div className="section"><div className="container"><div className="notice danger">{error}</div></div></div>;
  if (!site) return <div className="section"><div className="container"><div className="notice">Cargando...</div></div></div>;

  return (
    <>
      <Navbar companyName={site.general.companyName} slogan={site.general.slogan} theme={site.general} />

      <section className="section">
        <div className="container">
          <h2>{site.services.title}</h2>
          <p className="lead">Cada módulo tiene su enfoque y su formulario de pedido correspondiente.</p>
          <div className="grid-3">
            <article className="service-card">
              <h3>DTF Textil</h3>
              <p>{site.services.textil}</p>
              <Link className="btn" to="/pedidos#dtf-textil">Pedir</Link>
            </article>
            <article className="service-card">
              <h3>DTF UV</h3>
              <p>{site.services.uv}</p>
              <Link className="btn" to="/pedidos#dtf-uv">Pedir</Link>
            </article>
            <article className="service-card">
              <h3>Serigrafía</h3>
              <p>{site.services.serigrafia}</p>
              <Link className="btn" to="/pedidos#serigrafia">Pedir</Link>
            </article>
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
