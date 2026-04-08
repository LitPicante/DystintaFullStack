import { Link, useLocation } from "react-router-dom";
import logo from "../assets/logo-dystinta.jpg";

export default function Navbar({ companyName, slogan }) {
  const location = useLocation();

  const links = [
    { to: "/", label: "Inicio" },
    { to: "/quienes-somos", label: "Asesoría" },
    { to: "/servicios", label: "Servicios" },
    { to: "/pedidos", label: "Pedidos" },
    { to: "/disenos", label: "Mockup" },
    { to: "/calculadora", label: "Calculadora DTF" },
    { to: "/contacto", label: "Contacto" },
    { to: "/admin", label: "Back office" },
    { to: "/panel", label: "Panel pedidos" },
  ];

  return (
    <>
      <header className="topbar home-topbar home-logo-bar">
        <div className="container nav">
          <Link className="brand" to="/">
            <img src={logo} alt="Dystinta logo" />
            <div>
              <span data-company>{companyName}</span>
              <small data-slogan>{slogan}</small>
            </div>
          </Link>
        </div>
      </header>

      <section className="home-hero">
        <div className="container home-nav-panel">
          <div className="home-action-strip home-action-strip-nav">
            <p>Ingresá al módulo o formulario del servicio que prefieras y enviá tu pedido.</p>
            <nav className="nav-links home-pill-grid home-pill-grid-primary">
              {links.map((link) => {
                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    className={`home-service-pill${isActive ? " active" : ""}`}
                    to={link.to}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </section>
    </>
  );
}
