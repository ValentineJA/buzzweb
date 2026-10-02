"use client";

import { useRef, useState } from "react";

type Preferences = { radius: number; types: string[]; timing: string; price: string };
const defaults: Preferences = { radius: 10, types: [], timing: "Anytime", price: "Any price" };
const eventTypes = ["Music", "Nightlife", "Food & drink", "Arts & culture", "Outdoors", "Social"];

function Icon({ name }: { name: "map" | "list" | "filter" | "pin" }) {
  const paths = {
    map: "m9 4-6 3v14l6-3 6 3 6-3V4l-6 3-6-3Zm0 0v14m6-11v14",
    list: "M9 6h12M9 12h12M9 18h12M3 6h1M3 12h1M3 18h1",
    filter: "M4 7h9m4 0h3M4 17h3m4 0h9M13 4v6M7 14v6",
    pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  };
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

export default function Explore() {
  const [mode, setMode] = useState<"map" | "scroll">("map");
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  const [draft, setDraft] = useState<Preferences>(defaults);
  const filtersDialog = useRef<HTMLDialogElement>(null);
  const activeCount = preferences.types.length + Number(preferences.timing !== "Anytime") + Number(preferences.price !== "Any price");
  const openFilters = () => {
    setDraft({ ...preferences, types: [...preferences.types] });
    filtersDialog.current?.showModal();
  };
  const toggleType = (type: string) => setDraft((current) => ({ ...current, types: current.types.includes(type) ? current.types.filter((item) => item !== type) : [...current.types, type] }));

  return (
    <main className={`explore-page explore-${mode}`}>
      <h1 className="sr-only">Explore events</h1>
      <div className="explore-canvas" aria-hidden="true" />
      <div className="explore-toolbar">
        <div className="explore-mode" role="group" aria-label="Explore view">
          <button aria-pressed={mode === "map"} onClick={() => setMode("map")}><Icon name="map" />Map</button>
          <button aria-pressed={mode === "scroll"} onClick={() => setMode("scroll")}><Icon name="list" />Scroll</button>
        </div>
        <button className="explore-filter-button" onClick={openFilters} aria-haspopup="dialog"><Icon name="filter" /><span>Filters</span>{activeCount > 0 && <span className="filter-count">{activeCount}</span>}</button>
      </div>
      <div className="explore-quick-filters" role="group" aria-label="Current event preferences">
        <button onClick={openFilters} aria-haspopup="dialog"><span aria-hidden="true">↔</span> {preferences.radius} km radius <span aria-hidden="true">⌄</span></button>
        <button onClick={openFilters} aria-haspopup="dialog">{preferences.types.length === 0 ? "All event types" : preferences.types.length === 1 ? preferences.types[0] : `${preferences.types.length} event types`} <span aria-hidden="true">⌄</span></button>
        {preferences.timing !== "Anytime" && <button onClick={openFilters}>{preferences.timing}</button>}
        {preferences.price !== "Any price" && <button onClick={openFilters}>{preferences.price}</button>}
      </div>

      {mode === "map" ? (
        <section className="map-preview-note" aria-label="Map preview">
          <span className="preview-dot" />
          <p>A blank canvas for your next plan.<span>Events will appear on the map here.</span></p>
          <span className="explore-preview-label">MAP PREVIEW</span>
        </section>
      ) : (
        <section className="explore-scroll-content" aria-labelledby="explore-results-title">
          <div className="explore-results-heading"><div><p>FIND YOUR KIND OF GOOD TIME</p><h2 id="explore-results-title">Out there, for you.</h2></div><span>0 events</span></div>
          <div className="explore-empty"><span className="explore-empty-icon"><Icon name="pin" /></span><h3>The plans are on their way.</h3><p>When events are added, you’ll be able to browse them here or find them on the map.</p><button onClick={openFilters}>Choose your preferences <span aria-hidden="true">↗</span></button></div>
          <p className="explore-list-note">One set of preferences. Both ways to explore.</p>
        </section>
      )}

      <dialog ref={filtersDialog} className="explore-filter-dialog" aria-labelledby="filter-title" onClick={(event) => { if (event.target === event.currentTarget) filtersDialog.current?.close(); }}>
        <form className="explore-filter-sheet" onSubmit={(event) => { event.preventDefault(); setPreferences({ ...draft, types: [...draft.types] }); filtersDialog.current?.close(); }}>
          <div className="sheet-handle" aria-hidden="true" />
          <div className="filter-sheet-heading"><div><p>YOUR KIND OF BUZZ</p><h2 id="filter-title">Make it your scene.</h2></div><button type="button" className="filter-close" aria-label="Close filters" onClick={() => filtersDialog.current?.close()}>✕</button></div>
          <p className="filter-intro">A few little details. Better plans for you.</p>
          <div className="filter-sheet-fields">
            <fieldset><legend>How far would you go?</legend><div className="radius-label"><label htmlFor="event-radius">Search radius</label><output htmlFor="event-radius">{draft.radius} <small>km</small></output></div><input id="event-radius" type="range" min="1" max="100" step="1" value={draft.radius} onChange={(event) => setDraft({ ...draft, radius: Number(event.target.value) })} /><div className="range-endpoints"><span>Close to home · 1 km</span><span>Worth the trip · 100 km</span></div><p className="radius-hint">The radius will apply once a map location is available.</p></fieldset>
            <fieldset><legend>What’s your scene?</legend><p className="fieldset-hint">Pick a few, or leave open to everything.</p><div className="preference-chips">{eventTypes.map((type) => <button type="button" key={type} aria-pressed={draft.types.includes(type)} onClick={() => toggleType(type)}>{type}{draft.types.includes(type) && <span aria-hidden="true"> ✓</span>}</button>)}</div></fieldset>
            <fieldset><legend>When are you heading out?</legend><div className="preference-chips">{["Anytime", "Today", "This weekend"].map((timing) => <button type="button" key={timing} aria-pressed={draft.timing === timing} onClick={() => setDraft({ ...draft, timing })}>{timing}</button>)}</div></fieldset>
            <fieldset><legend>Keep it in your budget.</legend><div className="preference-chips">{["Any price", "Free", "Paid"].map((price) => <button type="button" key={price} aria-pressed={draft.price === price} onClick={() => setDraft({ ...draft, price })}>{price}</button>)}</div></fieldset>
          </div>
          <footer className="filter-sheet-footer"><p>Applies to both views. Saved for this visit to Explore.</p><div><button type="button" className="filter-reset" onClick={() => setDraft({ ...defaults, types: [] })}>Reset</button><button type="submit" className="filter-apply">Apply preferences <span aria-hidden="true">↗</span></button></div></footer>
        </form>
      </dialog>
    </main>
  );
}