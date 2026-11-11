"use client";

import { useEffect, useRef } from "react";
import type { Post } from "@/app/lib/social/types";

type EventMapProps = { events: Post[]; selectedId?: string; onSelect: (event: Post) => void };

function markerSvg(category: string) {
  const value = category.toLowerCase();
  const color = value.includes("food") ? "#ff7a21" : value.includes("sport") || value.includes("outdoor") ? "#35e681" : value.includes("music") || value.includes("party") ? "#c62dff" : "#2c9dff";
  const icon = value.includes("food") ? "M12 7v10M9 7v4a3 3 0 0 0 6 0V7M8 7v4M16 7v4" : value.includes("sport") || value.includes("outdoor") ? "M12 5v14M5 12h14M7 7l10 10M17 7 7 17" : value.includes("music") || value.includes("party") ? "M9 18V6l9-2v12M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3Zm9-2a3 3 0 1 1-3-3 3 3 0 0 1 3 3Z" : "M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Zm0-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="54" height="64" viewBox="0 0 54 64"><path d="M27 2C13 2 4 12 4 24c0 16 23 36 23 36s23-20 23-36C50 12 41 2 27 2Z" fill="${color}" fill-opacity=".94" stroke="#fff" stroke-width="2"/><circle cx="27" cy="24" r="14" fill="#090b13" fill-opacity=".82"/><path d="${icon}" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

export default function EventMap({ events, selectedId, onSelect }: EventMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<{ map: import("leaflet").Map; layer: import("leaflet").LayerGroup; L: typeof import("leaflet") } | null>(null);

  useEffect(() => {
    let alive = true;
    void import("leaflet").then(L => {
      if (!alive || !mapRef.current || layerRef.current) return;
      const map = L.map(mapRef.current, { zoomControl: false, attributionControl: true }).setView([51.0447, -114.0719], 12);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(map);
      const layer = L.layerGroup().addTo(map);
      layerRef.current = { map, layer, L };
    });
    return () => { alive = false; layerRef.current?.map.remove(); layerRef.current = null; };
  }, []);

  useEffect(() => {
    const current = layerRef.current;
    if (!current) return;
    current.layer.clearLayers();
    const located = events.filter(event => event.latitude !== null && event.longitude !== null);
    located.forEach(event => {
      const icon = current.L.divIcon({ className: "buzz-map-marker", html: markerSvg(event.category), iconSize: [54, 64], iconAnchor: [27, 60], popupAnchor: [0, -54] });
      current.L.marker([event.latitude!, event.longitude!], { icon }).on("click", () => onSelect(event)).addTo(current.layer).bindTooltip(event.title, { direction: "top", offset: [0, -48] });
    });
    if (selectedId) {
      const selected = located.find(event => event._id === selectedId);
      if (selected) current.map.setView([selected.latitude!, selected.longitude!], 14, { animate: true });
    } else if (located.length) {
      current.map.setView([located[0].latitude!, located[0].longitude!], 12);
    }
  }, [events, onSelect, selectedId]);

  return <div className="event-map" ref={mapRef} aria-label="Interactive BUZZ event map" />;
}
