export default function OrderSuccessModal({ open, message = "Pedido enviado correctamente.", onClose }) {
  if (!open) return null;

  return (
    <div className="order-success-backdrop" role="dialog" aria-modal="true" aria-labelledby="order-success-title">
      <div className="order-success-modal">
        <span className="badge">Pedido</span>
        <h3 id="order-success-title">{message}</h3>
        <button className="btn green" type="button" onClick={onClose}>
          Aceptar
        </button>
      </div>
    </div>
  );
}
