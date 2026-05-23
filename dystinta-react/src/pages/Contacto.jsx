import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function Contacto() {
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
        <div className="container grid-2">
          <div>
            <h2>{site.contact.title}</h2>
            <p className="lead">{site.contact.text}</p>
            <div className="info-card">
              <h3>Atención</h3>
              <p><strong>Dirección:</strong> <span data-address>{site.general.address}</span></p>
              <p><a className="btn green" data-whatsapp-link href={whatsappLink}>WhatsApp</a></p>
              <div className="socials">
                <a className="social" data-instagram-link href={site.general.instagram || "#"} target="_blank" rel="noreferrer">Instagram</a>
                <a className="social" data-facebook-link href={site.general.facebook || "#"} target="_blank" rel="noreferrer">Facebook</a>
              </div>
            </div>
          </div>
          <div>
            <iframe
              className="map"
              data-map
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={site.general.map || ""}
              title="Mapa Dystinta"
            ></iframe>
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
