import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function formatPrice(value) {
  const number = Number(value || 0);
  return number.toLocaleString("es-PY", {
    style: "currency",
    currency: "PYG",
    maximumFractionDigits: 0,
  });
}

export default function Catalogo() {
  const [site, setSite] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function loadSite() {
      try {
        const { data } = await api.get("/site/public/");
        if (mounted) setSite(data);
      } catch {
        if (mounted) setError("No se pudo cargar el catálogo.");
      }
    }
    loadSite();
    return () => { mounted = false; };
  }, []);

  const whatsappLink = useMemo(() => {
    const raw = site?.general?.whatsappRaw || "";
    return raw ? `https://wa.me/${raw}` : "#";
  }, [site]);

  if (error) return <div className="section"><div className="container"><div className="notice danger">{error}</div></div></div>;
  if (!site) return <div className="section"><div className="container"><div className="notice">Cargando...</div></div></div>;

  const products = site.catalog || [];

  return (
    <>
      <Navbar companyName={site.general.companyName} slogan={site.general.slogan} theme={site.general} />
      <section className="section">
        <div className="container">
          <span className="badge">Catálogo</span>
          <h2>Productos disponibles</h2>
          <p className="lead">Explorá los productos cargados por el equipo de Dystinta.</p>
          {products.length ? (
            <div className="catalog-grid">
              {products.map((product) => (
                <article className="catalog-card" key={product.id}>
                  {product.image ? <img src={product.image} alt={product.name} /> : <div className="catalog-placeholder">Producto</div>}
                  <div>
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>
                    <strong>{formatPrice(product.price)}</strong>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="notice">Todavía no hay productos cargados.</div>
          )}
        </div>
      </section>
      <Footer companyName={site.general.companyName} whatsappLink={whatsappLink} instagram={site.general.instagram} facebook={site.general.facebook} />
    </>
  );
}
