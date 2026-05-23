import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./styles.css";

import Home from "./pages/Home";
import Servicios from "./pages/Servicios";
import Pedidos from "./pages/Pedidos";
import Disenos from "./pages/Disenos";
import Calculadora from "./pages/Calculadora";
import Contacto from "./pages/Contacto";
import Catalogo from "./pages/Catalogo";
import Admin from "./pages/Admin";
import Panel from "./pages/Panel";
import QuienesSomos from "./pages/QuienesSomos";
import Seguimiento from "./pages/Seguimiento";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/servicios" element={<Servicios />} />
        <Route path="/pedidos" element={<Pedidos />} />
        <Route path="/disenos" element={<Disenos />} />
        <Route path="/calculadora" element={<Calculadora />} />
        <Route path="/contacto" element={<Contacto />} />
        <Route path="/catalogo" element={<Catalogo />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/panel" element={<Panel />} />
        <Route path="/seguimiento/:token" element={<Seguimiento />} />
        <Route path="/quienes-somos" element={<QuienesSomos />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
