import { useEffect } from "react";

export default function Logout() {
  useEffect(() => {
    fetch("/api/logout", { method: "POST" })
      .finally(() => {
        window.location.href = "/login";
      });
  }, []);

  return <p>Saindo...</p>;
}
