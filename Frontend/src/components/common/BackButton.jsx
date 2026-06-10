import { useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";

const BackButton = ({
  label = "Back",
  fallback = "/",
  className = "",
  style = {},
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: "rgba(212,175,55,0.08)",
        border: "1px solid rgba(212,175,55,0.28)",
        color: "var(--gold)",
        borderRadius: 999,
        padding: "9px 16px",
        fontWeight: 800,
        cursor: "pointer",
        transition: "0.2s ease",
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(212,175,55,0.16)";
        e.currentTarget.style.transform = "translateX(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(212,175,55,0.08)";
        e.currentTarget.style.transform = "translateX(0)";
      }}
    >
      <FiArrowLeft size={16} />
      {label}
    </button>
  );
};

export default BackButton;
