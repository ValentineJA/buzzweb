"use client";

import { useState } from "react";
import Link from "next/link";
import { Composer, Feed } from "@/app/components/social/posts";
import { ErrorNote, mutate, useAction, useData } from "@/app/components/social/common";
import type { Person, Post } from "@/app/lib/social/types";

type Tab = "all" | "following" | "nearby" | "events";

function Avatar({ person, size = "small" }: { person: Pick<Person, "name">; size?: "small" | "large" }) {
  return <span className={`buzz-avatar buzz-avatar-${size}`} aria-hidden="true">{person.name.slice(0, 1).toUpperCase()}</span>;
}

function EventRail({ events }: { events: Post[] }) {
  return <section className="dashboard-panel nearby-panel">
    <div className="panel-heading"><div><p className="panel-kicker">DISCOVER AROUND YOU</p><h2>What&apos;s happening near you</h2></div><Link href="/map">See map</Link></div>
    <Link href="/map" className="mini-map-preview" aria-label="Open nearby events map"><span className="mini-map-glow" /><span className="mini-map-pin">⌖</span><small>Explore your neighborhood</small></Link>
    {events.length ? <div className="nearby-list">{events.slice(0, 3).map(event => <Link href="/map" className="nearby-event" key={event._id}><span className="event-thumb">{event.category?.slice(0, 1) || "✦"}</span><span><strong>{event.title}</strong><small>{event.startsAt ? new Date(event.startsAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric" }) : "Upcoming"} · {event.location || "Location to be announced"}</small></span><b>›</b></Link>)}</div> : <p className="panel-empty">Your local event board will fill up as the community grows.</p>}
  </section>;
}

export default function Home() {
  const [compose, setCompose] = useState(false);
  const [filter, setFilter] = useState<Tab>("all");
  const [revision, setRevision] = useState(0);
  const [activity, setActivity] = useState(false);
  const notifications = useData<{ notifications: { _id: string; text: string; href: string; read: boolean }[] }>("notifications", {}, 20000);
  const feed = useData<{ posts: Post[] }>("feed", { page: "0" }, 20000);
  const eventFeed = useData<{ posts: Post[] }>("feed", { events: "1", page: "0" }, 30000);
  const people = useData<{ people: Person[] }>("users", { q: "" }, 30000);
  const activityAction = useAction(notifications.refresh);
  const unread = notifications.data?.notifications.filter(item => !item.read).length || 0;
  const storyPeople = Array.from(new Map((feed.data?.posts || []).map(post => [post.ownerId, post.author])).values()).slice(0, 7);
  const events = eventFeed.data?.posts || [];
  const stats = {
    going: events.filter(event => event.attendance === "going" || event.attendance === "here").length,
    saved: events.filter(event => event.saved).length,
    planned: events.length,
  };
  const feedParams: Record<string, string> = filter === "all" ? {} : filter === "events" || filter === "nearby" ? { events: "1" } : { following: "1" };

  return <main className="home-dashboard">
    <section className="home-topbar">
      <div><p className="real-eyebrow">GOOD PEOPLE. REAL PLANS.</p><h1>What&apos;s happening?</h1></div>
      <div className="home-top-actions"><button className="notification-button" onClick={() => setActivity(!activity)} aria-label={`${unread} notifications`}>♢<span>{unread}</span></button><button className="real-primary create-button" onClick={() => setCompose(!compose)}>＋ <span>Create</span></button></div>
    </section>

    <section className="story-strip modern-stories" aria-label="Stories">
      <button className="modern-story story-add" onClick={() => setCompose(true)}><strong>＋</strong><span>Your story</span></button>
      {storyPeople.map((person, index) => <Link className={`modern-story story-${index}`} href={`/explore?person=${encodeURIComponent(person.id)}`} key={person.id}><Avatar person={person} /><small>{person.name}</small></Link>)}
    </section>

    {activity && <section className="real-card home-activity"><div className="panel-heading"><h2>Your activity</h2><button onClick={() => setActivity(false)}>×</button></div><ErrorNote text={notifications.error || activityAction.error}/>{notifications.data?.notifications.length === 0 && <p>No activity yet.</p>}{notifications.data?.notifications.map(item => <p key={item._id}><Link href={item.href}>{item.text}</Link>{!item.read && " •"}</p>)}<button disabled={activityAction.busy} onClick={() => void activityAction.run(() => mutate("notifications-read"))}>Mark all read</button></section>}
    {compose && <Composer onDone={async () => setRevision(value => value + 1)} onCancel={() => setCompose(false)} />}

    <div className="home-layout">
      <section className="home-main">
        <div className="real-tabs home-filters" role="tablist" aria-label="Home feed filters">{(["all", "following", "nearby", "events"] as Tab[]).map(value => <button role="tab" key={value} aria-selected={filter === value} onClick={() => setFilter(value)}>{value === "all" ? "For you" : value === "following" ? "Following" : value === "nearby" ? "Nearby" : "Events"}</button>)}<button className="filter-icon" aria-label="Open feed filters">☷</button></div>
        <Feed key={`${revision}:${filter}`} params={feedParams} />
      </section>
      <aside className="home-sidebar">
        <EventRail events={events} />
        <section className="dashboard-panel event-summary"><div className="panel-heading"><h2>Your events</h2><Link href="/map">See all</Link></div><Link href="/map"><span>▣</span><strong>Going</strong><b>{stats.going}</b></Link><Link href="/map"><span>♡</span><strong>Saved</strong><b>{stats.saved}</b></Link><Link href="/map"><span>◷</span><strong>Planned</strong><b>{stats.planned}</b></Link></section>
        <section className="dashboard-panel buddy-panel"><div className="panel-heading"><h2>Buzz buddies</h2><Link href="/explore">See all</Link></div><div className="buddy-row">{storyPeople.slice(0, 4).map(person => <Link href={`/explore?person=${encodeURIComponent(person.id)}`} key={person.id} aria-label={person.name}><Avatar person={person} size="large" /></Link>)}<Link href="/explore" className="buddy-add" aria-label="Find more buddies">＋</Link></div></section>
        <section className="dashboard-panel connect-panel"><div className="panel-heading"><h2>People you may connect with</h2><Link href="/explore">See all</Link></div>{(people.data?.people || []).slice(0, 3).map(person => <Link className="connection-row" href={`/explore?person=${encodeURIComponent(person.id)}`} key={person.id}><Avatar person={person}/><span><strong>{person.name}</strong><small>@{person.handle}</small></span><b>＋</b></Link>)}{!people.data?.people.length && <p className="panel-empty">New people will appear here as more neighbors join.</p>}</section>
      </aside>
    </div>
  </main>;
}
