import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

export default function LogoutButton() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  if (!user) return null;

  return (
    <button
      onClick={() => { logout(); nav("/login", { replace: true }); }}
      style={{
        position: "fixed",
        top: 12,
        right: 12,
        padding: "6px 10px",
        borderRadius: 8,
        zIndex: 9999,       
        boxShadow: "0 4px 12px rgba(0,0,0,.1)"
      }}
    >
      Logout
    </button>
  );
}
