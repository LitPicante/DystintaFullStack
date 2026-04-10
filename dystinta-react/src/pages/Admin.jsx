import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Admin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const access = localStorage.getItem("access");
      if (!access) {
        if (mounted) setCheckingSession(false);
        return;
      }

      try {
        const { data } = await api.get("/auth/me/");
        if (!mounted) return;

        if (data.role === "admin" || data.role === "designer") {
          navigate("/panel");
          return;
        }

        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        setCheckingSession(false);
      } catch (error) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        if (mounted) setCheckingSession(false);
      }
    }

    checkSession();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setMsg("");

    try {
      const { data } = await api.post("/auth/login/", { username, password });

      localStorage.setItem("access", data.access);
      localStorage.setItem("refresh", data.refresh);

      const me = await api.get("/auth/me/");

      if (me.data.role !== "admin" && me.data.role !== "designer") {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        setMsg("Este acceso es solo para usuarios internos.");
        return;
      }

      navigate("/panel");
    } catch (error) {
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      setMsg("Credenciales inválidas");
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="login-box">
        <div className="notice">Verificando sesión...</div>
      </div>
    );
  }

  return (
    <div id="loginView" className="login-box">
      <h2>Back office Dystinta</h2>
      <p className="hint">Ingresá con usuario interno. Admin ve todo; designer solo pedidos.</p>

      <form id="loginForm" onSubmit={handleLogin}>
        <label>
          Usuario
          <input
            id="loginUser"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
        </label>

        <label>
          Contraseña
          <input
            id="loginPass"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>

      <p className="hint">Demo: admin / admin123 o designer / designer123</p>

      <div id="loginMsg">
        {msg ? <div className="notice danger">{msg}</div> : null}
      </div>
    </div>
  );
}
