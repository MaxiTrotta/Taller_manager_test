// =================== Toast Reutilizable ===================

export function ToastOverlay({ toast }) {
  if (!toast.open) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: toast.color === "green" ? "#2ecc71" : "#e74c3c",
        color: "white",
        padding: "12px 24px",
        borderRadius: "8px",
        boxShadow: "0px 4px 12px rgba(0,0,0,0.3)",
        zIndex: 99999,
        fontSize: "16px",
        fontWeight: "600",
      }}
    >
      {toast.message}
    </div>
  );
}
