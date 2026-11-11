"use client";

import { useState } from "react";
import Link from "next/link";
import EventMap from "@/app/components/social/event-map";
import { Empty, ErrorNote, mutate, useAction, useData } from "@/app/components/social/common";
import { Feed } from "@/app/components/social/posts";
import type { Post } from "@/app/lib/social/types";

function EventDetail({ event, refresh, onClose }: { event: Post; refresh: () => Promise<void>; onClose: () => void }) {
  const action = useAction(refresh);
  const [now] = useState(() => Date.now());
  const ended = !!event.endsAt && new Date(event.endsAt).getTime() <= now;
  return <aside className="map-detail-panel">
    <button className="map-close" onClick={onClose} aria-label="Close event details">×</button>
    <div className="map-detail-hero"><span>{event.category?.slice(0, 1) || "✦"}</span></div>
    <div className="map-detail-content"><span className="map-detail-tag">{event.category || "Event"}</span><h2>{event.title}</h2><p className="map-detail-meta">▣ {event.startsAt ? new Date(event.startsAt).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Date to be announced"}</p><p className="map-detail-meta">⌖ {event.location || "Location to be announced"}</p><p className="map-detail-meta">♧ {event.going} going · {event.here} here</p><button className="real-primary map-rsvp" disabled={ended || action.busy} onClick={() => void action.run(() => mutate("reaction", { id: event._id, kind: "going", enabled: !event.attendance }))}>{event.attendance ? "Cancel RSVP" : "RSVP / Join"}</button><div className="map-detail-actions"><button disabled={action.busy} onClick={() => void action.run(() => mutate("reaction", { id: event._id, kind: "save", enabled: !event.saved }))}>{event.saved ? "Saved" : "Save"}</button><button onClick={() => { void navigator.clipboard?.writeText(`${location.origin}/map?event=${event._id}`); }}>Share</button><Link href="/message">Invite</Link></div><div className="map-detail-tabs"><b>Details</b><span>Attendees</span><span>Updates</span></div><p className="map-detail-copy">{event.text || "Meet up with the BUZZ community and make a plan together."}</p><small>{event.price ? `CAD $${event.price.toFixed(2)}` : "Free entry"} · {ended ? "Event ended" : "Open to the BUZZ community"}</small><ErrorNote text={action.error}/></div>
  </aside>;
}

export default function MapPage() {
  const [view, setView] = useState<"map" | "blocks">("map");
  const [category, setCategory] = useState("");
  const [radius, setRadius] = useState(25);
  const [location, setLocation] = useState<{ lat: string; lng: string } | null>(null);
  const [geoError, setGeoError] = useState("");
  const [selected, setSelected] = useState<Post | undefined>();
  const events = useData<{ posts: Post[] }>("feed", { events: "1", category, radius: String(radius), ...(location || {}) });
  const requestLocation = () => {
    setGeoError("");
    if (!navigator.geolocation) return setGeoError("Location is unavailable in this browser.");
    navigator.geolocation.getCurrentPosition(position => setLocation({ lat: String(position.coords.latitude), lng: String(position.coords.longitude) }), () => setGeoError("Location permission was denied or unavailable."), { timeout: 15000 });
  };
  const locatedCount = events.data?.posts.filter(post => post.latitude !== null && post.longitude !== null).length || 0;
  return <main className="map-screen">
    <div className="map-canvas"><EventMap events={events.data?.posts || []} selectedId={selected?._id} onSelect={setSelected} /></div>
    <section className="map-overlay map-topbar"><div className="map-brand-label"><span className="map-eyebrow">BUZZ MAP</span><strong>{events.data?.posts.length ?? 0} events nearby</strong></div><button className="map-location-button" onClick={requestLocation} aria-label={location ? "Refresh my location" : "Use my location"}>{location ? "◉" : "⌖"}</button></section>
    <section className="map-overlay map-controls"><div className="map-view-toggle" role="tablist" aria-label="Event view"><button aria-pressed={view === "map"} onClick={() => setView("map")}>⌖ Map</button><button aria-pressed={view === "blocks"} onClick={() => setView("blocks")}>▦ List</button></div><details className="map-filter"><summary>Filter events <span>⌄</span></summary><div className="map-filter-fields"><label>Category<input value={category} onChange={event => setCategory(event.target.value)} placeholder="Music, food, sports…" maxLength={40} /></label><label>Distance <strong>{radius} km</strong><input type="range" min={1} max={200} value={radius} onChange={event => setRadius(Number(event.target.value))} /></label><small>{locatedCount} events have map coordinates. Location is requested only after you choose it.</small><ErrorNote text={geoError || events.error} /></div></details></section>
    {view === "blocks" && <section className="map-blocks"><Feed key={`${category}:${radius}:${location?.lat || ""}`} params={{ events: "1", category, radius: String(radius), ...(location || {}) }} /></section>}
    {view === "map" && events.data?.posts.length === 0 && <div className="map-empty"><Empty>No events match these filters yet.</Empty></div>}
    {selected && <EventDetail event={selected} refresh={events.refresh} onClose={() => setSelected(undefined)} />}
    <p className="map-attribution">© OpenStreetMap contributors</p>
  </main>;
}
