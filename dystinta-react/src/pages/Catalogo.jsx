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
  const [success, setSuccess] = useState("");
  const [cart, setCart] = useState([]);
  const [customerForm, setCustomerForm] = useState({ name: "", phone: "", notes: "" });
  const [sendingOrder, setSendingOrder] = useState(false);

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

  if (error && !site) return <div className="section"><div className="container"><div className="notice danger">{error}</div></div></div>;
  if (!site) return <div className="section"><div className="container"><div className="notice">Cargando...</div></div></div>;

  const products = site.catalog || [];
  const cartTotal = cart.reduce((sum, item) => sum + Number(item.price || 0) * item.quantity, 0);
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  function updateCustomerForm(field, value) {
    setCustomerForm((current) => ({ ...current, [field]: value }));
  }

  function addToCart(product) {
    setError("");
    setSuccess("");
    setCart((current) => {
      const productKey = String(product.id || product.name);
      const existing = current.find((item) => item.productKey === productKey);
      if (existing) {
        return current.map((item) => (
          item.productKey === productKey ? { ...item, quantity: item.quantity + 1 } : item
        ));
      }
      return [
        ...current,
        {
          productKey,
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          description: product.description,
          quantity: 1,
        },
      ];
    });
  }

  function updateCartQuantity(productKey, nextQuantity) {
    const quantity = Math.max(1, Number(nextQuantity) || 1);
    setCart((current) => current.map((item) => (
      item.productKey === productKey ? { ...item, quantity } : item
    )));
  }

  function removeFromCart(productKey) {
    setCart((current) => current.filter((item) => item.productKey !== productKey));
  }

  async function submitCatalogOrder(event) {
    event.preventDefault();
    if (!cart.length) {
      setError("Agregá al menos un producto al carrito.");
      return;
    }

    setSendingOrder(true);
    setError("");
    setSuccess("");

    try {
      const details = [
        "Pedido generado desde el catálogo web.",
        "Productos:",
        ...cart.map((item, index) => `${index + 1}. ${item.name} x ${item.quantity} - ${formatPrice(Number(item.price || 0) * item.quantity)}`),
        `Total estimado: ${formatPrice(cartTotal)}`,
        customerForm.notes ? `Notas del cliente: ${customerForm.notes}` : "",
      ].filter(Boolean).join("\n");
      const extraData = {
        source: "catalog-cart",
        cart: cart.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          subtotal: Number(item.price || 0) * item.quantity,
        })),
        total: cartTotal,
      };

      const payload = new FormData();
      payload.append("service", "Catálogo");
      payload.append("name", customerForm.name);
      payload.append("phone", customerForm.phone);
      payload.append("email", "");
      payload.append("quantity", `${cartItemsCount} producto${cartItemsCount === 1 ? "" : "s"}`);
      payload.append("details", details);
      payload.append("extraData", JSON.stringify(extraData));

      await api.post("/orders/", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccess("Pedido enviado correctamente. El equipo de Dystinta lo va a gestionar desde el backoffice.");
      setCart([]);
      setCustomerForm({ name: "", phone: "", notes: "" });
    } catch {
      setError("No se pudo enviar el pedido del catálogo.");
    } finally {
      setSendingOrder(false);
    }
  }

  return (
    <>
      <Navbar companyName={site.general.companyName} slogan={site.general.slogan} theme={site.general} />
      <section className="section">
        <div className="container">
          <span className="badge">Catálogo</span>
          <h2>Productos disponibles</h2>
          <p className="lead">Explorá los productos cargados por el equipo de Dystinta.</p>
          {success ? <div className="notice">{success}</div> : null}
          {error ? <div className="notice danger">{error}</div> : null}

          {products.length ? (
            <div className="catalog-shop-layout">
              <div className="catalog-grid">
                {products.map((product) => (
                  <article className="catalog-card" key={product.id || product.name}>
                    {product.image ? <img src={product.image} alt={product.name} /> : <div className="catalog-placeholder">Producto</div>}
                    <div>
                      <h3>{product.name}</h3>
                      <p>{product.description}</p>
                      <strong>{formatPrice(product.price)}</strong>
                      <button className="btn green catalog-add-btn" type="button" onClick={() => addToCart(product)}>
                        Agregar al carrito
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <aside className="catalog-cart card">
                <div className="panel-header">
                  <span className="badge">Carrito</span>
                  <h3>Pedido del catálogo</h3>
                  <p>{cartItemsCount ? `${cartItemsCount} producto${cartItemsCount === 1 ? "" : "s"} agregado${cartItemsCount === 1 ? "" : "s"}.` : "Agregá productos para iniciar el pedido."}</p>
                </div>

                {cart.length ? (
                  <div className="catalog-cart-list">
                    {cart.map((item) => (
                      <article className="catalog-cart-item" key={item.productKey}>
                        {item.image ? <img src={item.image} alt={item.name} /> : <div className="catalog-cart-thumb">Producto</div>}
                        <div>
                          <strong>{item.name}</strong>
                          <span>{formatPrice(Number(item.price || 0) * item.quantity)}</span>
                          <div className="catalog-qty-row">
                            <button type="button" onClick={() => updateCartQuantity(item.productKey, item.quantity - 1)}>-</button>
                            <input type="number" min="1" value={item.quantity} onChange={(event) => updateCartQuantity(item.productKey, event.target.value)} />
                            <button type="button" onClick={() => updateCartQuantity(item.productKey, item.quantity + 1)}>+</button>
                            <button type="button" onClick={() => removeFromCart(item.productKey)}>Eliminar</button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : null}

                <div className="catalog-cart-total">
                  <span>Total estimado</span>
                  <strong>{formatPrice(cartTotal)}</strong>
                </div>

                <form className="catalog-order-form" onSubmit={submitCatalogOrder}>
                  <label>
                    Nombre
                    <input required value={customerForm.name} onChange={(event) => updateCustomerForm("name", event.target.value)} />
                  </label>
                  <label>
                    Celular
                    <input required value={customerForm.phone} onChange={(event) => updateCustomerForm("phone", event.target.value)} />
                  </label>
                  <label>
                    Notas <span className="hint">(opcional)</span>
                    <textarea value={customerForm.notes} onChange={(event) => updateCustomerForm("notes", event.target.value)} placeholder="Color, talle, cantidad especial o aclaraciones." />
                  </label>
                  <button className="btn green" type="submit" disabled={!cart.length || sendingOrder}>
                    {sendingOrder ? "Enviando..." : "Terminar pedido"}
                  </button>
                </form>
              </aside>
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
