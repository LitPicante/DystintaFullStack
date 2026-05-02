import { Link, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import logo from "../assets/logo-dystinta.jpg";

const DEFAULT_THEME = {
  themePrimary: "#8b4bff",
  themeSecondary: "#6a2db8",
  themeAccent: "#d7b8ff",
  themeBackground: "#0b0613",
  themeSurface: "#ffffff",
  themeText: "#ffffff",
};

function hexToRgb(hex) {
  const normalized = String(hex || "").replace("#", "");
  if (normalized.length !== 6) return [139, 75, 255];
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ];
}

function alpha(hex, value) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${value})`;
}

function applyTheme(mode, theme) {
  const root = document.documentElement;
  const selected = mode === "light"
    ? {
        themePrimary: "#6a2db8",
        themeSecondary: "#8b4bff",
        themeAccent: "#35d07f",
        themeBackground: "#f7f3ff",
        themeSurface: "#ffffff",
        themeText: "#170f24",
      }
    : mode === "dark"
      ? {
          themePrimary: "#8b4bff",
          themeSecondary: "#25113f",
          themeAccent: "#00eaff",
          themeBackground: "#07040d",
          themeSurface: "#ffffff",
          themeText: "#ffffff",
        }
      : { ...DEFAULT_THEME, ...theme };

  root.style.setProperty("--brand", selected.themePrimary);
  root.style.setProperty("--brand2", selected.themeSecondary);
  root.style.setProperty("--accent", selected.themeAccent);
  root.style.setProperty("--bg", selected.themeBackground);
  root.style.setProperty("--ink", mode === "light" ? "rgba(23,15,36,.92)" : alpha(selected.themeText, 0.92));
  root.style.setProperty("--text", mode === "light" ? "rgba(23,15,36,.92)" : alpha(selected.themeText, 0.92));
  root.style.setProperty("--muted", mode === "light" ? "rgba(23,15,36,.68)" : alpha(selected.themeText, 0.72));
  root.style.setProperty("--card", mode === "light" ? "rgba(255,255,255,.82)" : alpha(selected.themeSurface, 0.06));
  root.style.setProperty("--paper", mode === "light" ? "rgba(255,255,255,.72)" : alpha(selected.themeSurface, 0.04));
  root.style.setProperty("--paper-2", mode === "light" ? "rgba(255,255,255,.9)" : alpha(selected.themeSurface, 0.08));
  root.style.setProperty("--line", mode === "light" ? "rgba(23,15,36,.12)" : alpha(selected.themeSurface, 0.12));
  root.style.setProperty("--line-strong", mode === "light" ? "rgba(23,15,36,.2)" : alpha(selected.themeSurface, 0.18));
  root.style.setProperty("--brand-rgb", hexToRgb(selected.themePrimary).join(","));
  root.style.setProperty("--brand2-rgb", hexToRgb(selected.themeSecondary).join(","));
  root.style.setProperty("--accent-rgb", hexToRgb(selected.themeAccent).join(","));
  root.dataset.themeMode = mode;
}

export default function Navbar({ companyName, slogan, theme }) {
  const location = useLocation();
  const [themeMode, setThemeMode] = useState("original");
  const adminTheme = useMemo(() => ({ ...DEFAULT_THEME, ...(theme || {}) }), [theme]);

  useEffect(() => {
    applyTheme(themeMode, adminTheme);
  }, [themeMode, adminTheme]);

  const links = [
    { to: "/", label: "Inicio" },
    { to: "/quienes-somos", label: "Asesoría" },
    { to: "/servicios", label: "Servicios" },
    { to: "/catalogo", label: "Catálogo" },
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
            <div className="theme-switcher" aria-label="Selector de tema">
              {[
                ["original", "Original"],
                ["light", "Claro"],
                ["dark", "Oscuro"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={themeMode === value ? "active" : ""}
                  type="button"
                  onClick={() => setThemeMode(value)}
                >
                  {label}
                </button>
              ))}
            </div>
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
