// events.js — tiny global event bus that decouples systems
// (gameplay fires events; achievements / missions / stats / HUD listen).
(function (global) {
  const map = new Map();
  const Bus = {
    on(evt, fn) {
      if (!map.has(evt)) map.set(evt, new Set());
      map.get(evt).add(fn);
      return () => Bus.off(evt, fn);
    },
    off(evt, fn) { const s = map.get(evt); if (s) s.delete(fn); },
    emit(evt, payload) {
      const s = map.get(evt);
      if (s) for (const fn of s) { try { fn(payload); } catch (e) { console.error("bus", evt, e); } }
    },
  };
  global.Bus = Bus;
})(window);
