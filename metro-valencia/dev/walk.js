(() => {
  const KEY_STORE = "metro-valencia-ors";
  const SETUP_LABEL = "Configurar el tiempo a pie hasta la estación";
  const walkCache = new Map();
  let here = null;
  let walkToken = 0;
  let askedPlace = null;

  function readKey() {
    try {
      return (localStorage.getItem(KEY_STORE) || "").trim();
    } catch {
      return "";
    }
  }

  function writeKey(value) {
    const key = value.trim();
    try {
      if (key) localStorage.setItem(KEY_STORE, key);
      else localStorage.removeItem(KEY_STORE);
    } catch { /* private mode */ }
  }

  function openKeyDialog() {
    const dialog = document.querySelector("#walk-key");
    const input = document.querySelector("#walk-key-input");
    if (!dialog || !input) return;
    input.value = readKey();
    if (!dialog.open) dialog.showModal();
    input.focus();
    input.select();
  }

  function clearSetup() {
    const spot = document.querySelector("#walk-setup");
    if (!spot) return;
    spot.replaceChildren();
    spot.hidden = true;
  }

  function paintSetup(text) {
    const el = document.querySelector("#walk");
    const spot = document.querySelector("#walk-setup");
    el.replaceChildren();
    el.hidden = true;
    spot.replaceChildren();
    spot.hidden = false;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "walk-ask";
    button.textContent = text;
    button.addEventListener("click", openKeyDialog);
    spot.append(button);
  }

  function paintWalk(text, action) {
    if (action === "setup") {
      paintSetup(text);
      return;
    }
    clearSetup();
    const el = document.querySelector("#walk");
    el.replaceChildren();
    if (!text) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    if (!action) {
      el.textContent = text;
      return;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "walk-ask";
    button.textContent = text;
    button.addEventListener("click", () => walkTo(askedPlace));
    el.append(button);
  }

  function formatWalk(seconds) {
    const minutes = Math.max(1, Math.round(seconds / 60));
    return `${minutes} min a pie`;
  }

  function publishWalk(seconds) {
    window.walkSeconds = typeof seconds === "number" ? seconds : null;
    window.dispatchEvent(new Event("walk-time"));
  }

  function readWalkDuration(data) {
    const summary = data?.features?.[0]?.properties?.summary || data?.routes?.[0]?.summary;
    return typeof summary?.duration === "number" ? summary.duration : null;
  }

  function askPosition(highAccuracy) {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({
          lon: position.coords.longitude,
          lat: position.coords.latitude,
          at: Date.now(),
        }),
        reject,
        { enableHighAccuracy: highAccuracy, timeout: highAccuracy ? 20_000 : 10_000, maximumAge: 180_000 }
      );
    });
  }

  async function locationDenied() {
    try {
      const status = await navigator.permissions.query({ name: "geolocation" });
      return status.state === "denied";
    } catch {
      return false;
    }
  }

  async function readHere() {
    if (!navigator.geolocation) throw new Error("Sin ubicación");
    if (!window.isSecureContext) throw new Error("La ubicación requiere HTTPS");
    try {
      return await askPosition(false);
    } catch (error) {
      if (error?.code === 1 || await locationDenied()) throw new Error("Activa la ubicación");
      try {
        return await askPosition(true);
      } catch (again) {
        if (again?.code === 1 || await locationDenied()) throw new Error("Activa la ubicación");
        throw new Error("Activa la ubicación");
      }
    }
  }

  async function walkTo(place) {
    const token = ++walkToken;
    askedPlace = place;
    const key = readKey();
    publishWalk(null);
    if (!key) {
      paintWalk(SETUP_LABEL, "setup");
      return;
    }
    if (!place || !navigator.onLine) {
      paintWalk("");
      return;
    }
    if (!here || Date.now() - here.at > 120_000) {
      paintWalk("Buscando ubicación…");
      try {
        here = await readHere();
      } catch (error) {
        if (token !== walkToken) return;
        paintWalk(error.message, error.message === "Activa la ubicación" ? "retry" : null);
        return;
      }
    }
    if (token !== walkToken) return;
    const cacheKey = `${place.id}:${here.lat.toFixed(4)}:${here.lon.toFixed(4)}`;
    const cached = walkCache.get(cacheKey);
    if (cached) {
      publishWalk(cached);
      paintWalk(formatWalk(cached));
      return;
    }
    paintWalk("Calculando el camino…");
    const url = new URL("https://api.heigit.org/openrouteservice/v2/directions/foot-walking");
    url.searchParams.set("api_key", key);
    url.searchParams.set("start", `${here.lon},${here.lat}`);
    url.searchParams.set("end", `${place.lon},${place.lat}`);
    try {
      const response = await fetch(url);
      if (response.status === 401 || response.status === 403) throw new Error("Clave no válida");
      if (!response.ok) throw new Error("Sin ruta a pie");
      const duration = readWalkDuration(await response.json());
      if (token !== walkToken) return;
      if (duration == null) throw new Error("Sin ruta a pie");
      walkCache.set(cacheKey, duration);
      publishWalk(duration);
      paintWalk(formatWalk(duration));
    } catch (error) {
      if (token !== walkToken) return;
      const message = error.message === "Clave no válida" || error.message === "Sin ruta a pie" || error.message === "Activa la ubicación" || error.message === "Sin ubicación"
        ? error.message
        : "Sin ruta a pie";
      const action = message === "Clave no válida" ? "setup" : message === "Activa la ubicación" ? "retry" : null;
      paintWalk(message, action);
    }
  }

  const dialog = document.querySelector("#walk-key");
  const form = document.querySelector("#walk-key-form");
  const input = document.querySelector("#walk-key-input");
  document.querySelector("#walk-key-cancel")?.addEventListener("click", () => dialog?.close());
  dialog?.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    writeKey(input?.value || "");
    dialog?.close();
    walkTo(askedPlace);
  });

  window.walkTo = walkTo;
})();
