export default function Footer({ companyName, whatsappLink, instagram, facebook }) {
  return (
    <footer className="footer footer-rich">
      <div className="container footer-rich-grid">
        <div>
          <strong className="footer-brand" data-company>{companyName}</strong>
          <p className="footer-copy">
            Centro de impresión y personalización con enfoque comercial para textiles,
            objetos rígidos y producción visual.
          </p>
          <div className="footer-badge-row">
            <span className="home-chip">DTF Textil</span>
            <span className="home-chip">DTF UV</span>
            <span className="home-chip">Serigrafía</span>
          </div>
        </div>

        <div>
          <h4>Contacto de atención</h4>
          <ul className="footer-list">
            <li>+595 982 317 317</li>
          
          </ul>
        </div>

        <div>
          <h4>Showroom</h4>
          <ul className="footer-list">
            <li>Padre Molas c/ 1ro de mayo</li>
            <li>Capiata, Paraguay</li>
            <li>Lunes a Viernes, 08:30 a 18:00</li>
          </ul>
        </div>

        <div>
          <h4>Seguinos</h4>
          <div className="socials">
            <a className="social" data-whatsapp-link href={whatsappLink || "#"}>
              WhatsApp
            </a>
            <a
              className="social"
              data-instagram-link
              href={instagram || "#"}
              target="_blank"
              rel="noreferrer"
            >
              Instagram
            </a>
            <a
              className="social"
              data-facebook-link
              href={facebook || "#"}
              target="_blank"
              rel="noreferrer"
            >
              Facebook
            </a>
          </div>
        </div>
      </div>

      <div className="container footer-bottom">
        <span>Copyright © Dystinta Impresión & Personalización</span>
      </div>
    </footer>
  );
}
