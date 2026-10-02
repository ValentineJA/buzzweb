"use client";

import { useEffect, useRef, useState } from "react";

const filters = ["All posts", "Events", "Locations", "Live", "After photos", "Stories"] as const;
type Filter = (typeof filters)[number];
const stories = [
  { name: "Rooftop hours", who: "@maya", time: "18h left", style: "rooftop", mark: "UP / LATE" },
  { name: "On the floor", who: "@nightshift", time: "6h left", style: "floor", mark: "FEEL / GOOD" },
  { name: "One more song", who: "@leo", time: "21h left", style: "song", mark: "ON / REPEAT" },
  { name: "The afterglow", who: "@ava", time: "12h left", style: "glow", mark: "STILL / HERE" },
];

function PostHeader({ initials, name, meta, kind }: { initials: string; name: string; meta: string; kind: string }) {
  return <div className="post-header"><span className="post-avatar">{initials}</span><div className="post-author"><strong>{name}</strong><span>{meta}</span></div><span className="post-kind">{kind}</span></div>;
}

export default function Home() {
  const [filter, setFilter] = useState<Filter>("All posts");
  const [saved, setSaved] = useState(false);
  const [liked, setLiked] = useState(false);
  const [story, setStory] = useState<number | null>(null);
  const storyDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (story !== null) storyDialog.current?.showModal();
  }, [story]);
  const visible = (type: Filter) => filter === "All posts" || filter === type;

  return <main className="home-feed">
    <h1 className="sr-only">Your Buzz feed</h1>
    <section className="stories-section" aria-labelledby="stories-title">
      <div className="section-heading"><h2 id="stories-title">Gone in 24<span>h</span><span className="tiny-spark" aria-hidden="true">✦</span></h2><span className="section-caption">PARTY STORIES</span></div>
      <div className="story-strip">
        {stories.map((item, index) => <button key={item.name} className={`story-card ${item.style}`} onClick={() => setStory(index)} aria-label={`Preview ${item.name}, ${item.time}`}><span className="story-clock">◷ {item.time}</span><span className="story-art" aria-hidden="true">{item.mark.split(" / ").map((line) => <span key={line}>{line}</span>)}</span><span className="story-name">{item.name}<small>{item.who}</small></span></button>)}
      </div>
    </section>

    <div className="feed-heading"><div><p className="feed-kicker">THE PLANS. THE PEOPLE. THE PROOF.</p><h2>Your social frequency<span aria-hidden="true">✳</span></h2></div><span className="demo-tag">PREVIEW</span></div>
    <div className="feed-filters" role="group" aria-label="Filter posts">{filters.map((item) => <button key={item} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}</div>

    <div className="post-stream" aria-live="polite">
      {visible("Live") && <article className="post live-post">
        <PostHeader initials="NS" name="Nightshift collective" meta="Warehouse 04 · Sample post" kind="LIVE POSTER" />
        <div className="live-art"><div className="live-top"><span className="live-badge"><i /> LIVE NOW</span><span className="live-time">THE NIGHT IS YOUNG ↗</span></div><div className="live-title"><span>Meet you</span><span>on the <em>floor.</em></span></div><div className="sound-bars" aria-hidden="true">{[24, 45, 32, 66, 43, 84, 60, 96, 73, 100, 68, 86, 52, 72, 38, 57, 27, 41].map((height, i) => <i key={i} style={{ height: `${height}%` }} />)}</div><div className="attendance"><div><strong>128<span>↗</span></strong><span>currently here</span></div><span className="avatar-stack" aria-hidden="true"><i>J</i><i>M</i><i>A</i><i>+125</i></span></div></div>
        <div className="post-footer"><span><strong>House music. Good company.</strong><small>Live attendee count · Demo data</small></span><span className="post-index">01 / NOW</span></div>
      </article>}

      {visible("Events") && <article className="post event-post">
        <PostHeader initials="SC" name="Sunday club" meta="Posted 2h ago · Sample post" kind="EVENT POSTER" />
        <div className="event-ticket"><div className="ticket-date"><strong>12</strong><span>OCT</span><span className="ticket-day">SAT</span></div><div className="ticket-main"><span className="ticket-eyebrow">A LITTLE ABOVE THE ORDINARY</span><h3>ROOFTOP<br /><em>RENDEZVOUS</em><span aria-hidden="true">✷</span></h3><p>Golden hour into after hours.</p><div className="ticket-meta"><span>6 PM — LATE</span><span>THE TERRACE ↗</span></div></div></div>
        <div className="post-footer"><span><strong>Your next “you had to be there.”</strong><small>Event details + poster</small></span><button className="save-button" aria-pressed={saved} onClick={() => setSaved(!saved)}>{saved ? "Saved ✓" : "Save +"}</button></div>
      </article>}

      {visible("Locations") && <article className="post location-post">
        <PostHeader initials="JL" name="Jamie L." meta="Found a good spot · Sample post" kind="LOCATION POSTER" />
        <div className="location-layout"><div className="map-art" role="img" aria-label="Illustrative map snapshot with a pin at The Courtyard; not a real map"><div className="map-park" /><div className="map-river" /><span className="map-road road-one" /><span className="map-road road-two" /><span className="map-road road-three" /><span className="map-street">WEST AVENUE</span><span className="map-pin">✳</span><span className="map-caption">MAP SNAPSHOT</span></div><div className="location-copy"><span className="location-coordinate">THE MEETING POINT</span><h3>A little<br />off the grid.</h3><p>The Courtyard</p><span className="location-tag">Outdoor hangout</span><span className="location-note">Location + map preview</span></div></div>
        <div className="post-footer"><span><strong>Save a spot for your people.</strong><small>Illustrative location</small></span><span className="post-index">03 / HERE</span></div>
      </article>}

      {visible("After photos") && <article className="post after-post">
        <PostHeader initials="AM" name="Ava M." meta="Last night, still smiling · Sample post" kind="AFTER PHOTOS" />
        <div className="after-layout"><div className="photo-placeholder photo-main"><span className="photo-frame-label">PHOTO 01</span><span className="photo-star" aria-hidden="true">✴</span><h3>Wish we could<br /><em>rewind.</em></h3><span className="photo-placeholder-note">Event photo goes here</span></div><div className="photo-side"><div className="photo-placeholder photo-second"><span className="photo-frame-label">PHOTO 02</span><span aria-hidden="true">☻</span></div><div className="photo-placeholder photo-third"><span className="photo-frame-label">PHOTO 03</span><strong>+8</strong><small>more memories</small></div></div></div>
        <div className="post-footer"><span><strong>The night ends. The memories stay.</strong><small>After-party photo collection</small></span><button className="save-button" aria-label={liked ? "Unlike photo collection" : "Like photo collection"} aria-pressed={liked} onClick={() => setLiked(!liked)}>{liked ? "♥ 25" : "♡ 24"}</button></div>
      </article>}
      {filter === "Stories" && <div className="story-explanation"><span aria-hidden="true">◷</span><h3>A little fleeting. A lot of fun.</h3><p>Open a party story above to preview it. Stories are designed to disappear 24 hours after posting.</p></div>}
    </div>
    <p className="feed-end">✦ &nbsp; A little of what BUZZ could look like.<span>Sample posts · Layout preview</span></p>
    {story !== null && <dialog ref={storyDialog} className="story-modal" onCancel={() => setStory(null)} onClick={(event) => { if (event.target === event.currentTarget) setStory(null); }}><section className={`story-preview ${stories[story].style}`} aria-label={stories[story].name}><button autoFocus className="story-close" onClick={() => setStory(null)} aria-label="Close story">✕</button><span className="story-preview-label">PARTY STORY · {stories[story].time}</span><span className="story-preview-art" aria-hidden="true">{stories[story].mark.replace(" / ", " ")}</span><h2>{stories[story].name}</h2><p>{stories[story].who} · 24-hour story preview</p><small>Photo or video will appear here.</small></section></dialog>}
  </main>;
}