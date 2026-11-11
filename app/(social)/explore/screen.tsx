"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PersonCard, PublicProfile } from "@/app/components/social/people";
import { Empty, ErrorNote, useData } from "@/app/components/social/common";
import { Feed } from "@/app/components/social/posts";
import { defaults, type Person, type Post, type Settings } from "@/app/lib/social/types";

function Explore() {
  const router = useRouter();
  const search = useSearchParams();
  const person = search.get("person");
  const [tab, setTab] = useState("events");
  const [text, setText] = useState("");
  const [term, setTerm] = useState("");
  const [location, setLocation] = useState<{ lat: string; lng: string } | null>(null);
  const [radiusOverride, setRadius] = useState<number | null>(null);
  const [categoryOverride, setCategory] = useState<string | null>(null);
  const [freeOverride, setFree] = useState<boolean | null>(null);
  const [geoError, setGeoError] = useState("");
  const settings = useData<{ settings: Settings }>("settings");
  const radius = radiusOverride ?? settings.data?.settings.radius ?? 25;
  const category = categoryOverride ?? settings.data?.settings.category ?? "";
  const free = freeOverride ?? settings.data?.settings.freeOnly ?? false;
  useEffect(() => { const timer = setTimeout(() => setTerm(text), 300); return () => clearTimeout(timer); }, [text]);
  const people = useData<{ people: Person[] }>("users", { q: term });
  const params = { events: "1", q: term, category, free: free ? "1" : "0", radius: String(radius), ...(location || {}) };
  const events = useData<{ posts: Post[] }>("feed", params);
  const requestLocation = () => { setGeoError(""); if (!navigator.geolocation) return setGeoError("Location is unavailable in this browser."); navigator.geolocation.getCurrentPosition(position => setLocation({ lat: String(position.coords.latitude), lng: String(position.coords.longitude) }), () => setGeoError("Location permission was denied or unavailable."), { timeout: 15000 }); };
  if (person) return <main className="real-page explore-dashboard"><button onClick={() => router.push("/explore")}>← Explore</button><PublicProfile key={person} id={person} /></main>;
  return <main className="real-page explore-dashboard"><section className="explore-heading"><div><p className="real-eyebrow">DISCOVER YOUR CITY</p><h1>Explore the buzz.</h1></div><button className="explore-search-button">⌕</button></section><div className="explore-tabs">{[["events", "For you"], ["people", "People"], ["nearby", "Nearby"], ["upcoming", "Upcoming"]].map(([key, label]) => <button key={key} aria-pressed={tab === key} onClick={() => setTab(key)}>{label}</button>)}</div><label className="explore-search">⌕<input type="search" value={text} onChange={event => setText(event.target.value)} placeholder={tab === "people" ? "Search people and handles" : "Search events, places or content"} /></label>{tab === "people" ? <section className="explore-people"><ErrorNote text={people.error}/>{people.loading && <p>Finding people…</p>}{people.data?.people.length === 0 && <Empty>No matching people yet.</Empty>}{people.data?.people.map(personItem => <PersonCard key={personItem.id} person={personItem} refresh={people.refresh} onOpen={id => router.push(`/explore?person=${encodeURIComponent(id)}`)} />)}</section> : <><section className="explore-filter-bar"><button onClick={requestLocation}>{location ? "Location on" : "⌖ Near me"}</button><label>Category<input value={category} maxLength={40} onChange={event => setCategory(event.target.value)} placeholder="All types" /></label><label>Distance <input type="number" min={1} max={200} value={radius || defaults.radius} onChange={event => setRadius(Number(event.target.value))} /></label><label className="explore-check"><input type="checkbox" checked={free} onChange={event => setFree(event.target.checked)} /> Free only</label></section><ErrorNote text={geoError || events.error}/><div className="explore-grid"><Feed key={JSON.stringify(params)} params={params}/></div></>}</main>;
}

export default function Screen() { return <Suspense fallback={<p className="real-page">Loading Explore…</p>}><Explore /></Suspense>; }
