import { useEffect, useState } from "react";
import { fetchPublicSite, getCachedPublicSite } from "../services/publicSite";

export default function usePublicSite() {
  const [state, setState] = useState(() => {
    const cached = getCachedPublicSite();
    return {
      site: cached.site,
      loading: cached.source === "fallback",
      source: cached.source,
      error: "",
    };
  });

  useEffect(() => {
    let mounted = true;

    fetchPublicSite()
      .then((site) => {
        if (mounted) setState({ site, loading: false, source: "network", error: "" });
      })
      .catch(() => {
        if (!mounted) return;
        setState((current) => ({
          ...current,
          loading: false,
          error: "Mostrando contenido local porque el servidor no esta disponible.",
        }));
      });

    return () => {
      mounted = false;
    };
  }, []);

  return state;
}
