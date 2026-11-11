"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount, useProfile } from "@/app/components/auth/account-provider";
import { ErrorNote, useAction, useData } from "@/app/components/social/common";
import { Feed } from "@/app/components/social/posts";
import type { Person } from "@/app/lib/social/types";

export default function Profile() {
  const account = useAccount();
  const [profile, save] = useProfile();
  const stats = useData<{ person: Person; followers: number; following: number }>("profile", { id: account.uid });
  const posts = useData<{ posts: unknown[] }>("feed", { id: account.uid });
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState("posts");
  const action = useAction();

  return <main className="profile-dashboard">
    <section className="profile-cover"><div className="cover-art"><span>CALGARY</span><i>✦</i></div><button className="cover-action">Edit cover</button></section>
    <section className="profile-identity">
      <div className="profile-avatar">{profile.name.slice(0, 1).toUpperCase()}<button aria-label="Change profile picture">⌾</button></div>
      <div className="profile-heading"><div><h1>{profile.name}</h1><p>@{profile.handle} <span className="verified-mark">✓</span></p></div><div className="profile-actions"><button onClick={() => setEditing(!editing)}>{editing ? "Cancel" : "Edit profile"}</button><Link href="/settings">⚙</Link></div></div>
      <p className="profile-bio">{profile.bio || "Tell people what you are about."}</p>
      <div className="profile-meta"><span>⌖ {profile.city || "Calgary, AB"}</span><span>◉ {profile.mood || "Making memories"}</span></div>
      <div className="profile-stats"><div><strong>{posts.data?.posts.length ?? 0}</strong><span>Posts</span></div><div><strong>{stats.data?.followers ?? 0}</strong><span>Followers</span></div><div><strong>{stats.data?.following ?? 0}</strong><span>Following</span></div><div><strong>{profile.interests.length}</strong><span>Interests</span></div></div>
    </section>
    {editing && <form className="profile-edit-panel" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void action.run(async () => { await save({ name: String(form.get("name")), handle: String(form.get("handle")).replace(/^@/, ""), bio: String(form.get("bio")), city: String(form.get("city")), mood: String(form.get("mood")), interests: String(form.get("interests")).split(",").map(value => value.trim()).filter(Boolean) }); setEditing(false); }); }}><div className="profile-edit-heading"><h2>Edit your profile</h2><span>Changes show on your public profile.</span></div><div className="real-two"><label>Name<input name="name" required defaultValue={profile.name} /></label><label>Username<input name="handle" required defaultValue={profile.handle} /></label></div><label>Bio<textarea name="bio" maxLength={160} defaultValue={profile.bio} /></label><div className="real-two"><label>City<input name="city" defaultValue={profile.city} /></label><label>Currently feeling<input name="mood" defaultValue={profile.mood} /></label></div><label>Interests<input name="interests" defaultValue={profile.interests.join(", ")} placeholder="Music, food, outdoors" /></label><ErrorNote text={action.error}/><button className="real-primary" disabled={action.busy}>{action.busy ? "Saving…" : "Save profile"}</button></form>}
    <section className="profile-content"><div className="profile-tabs">{[["posts", "My feed"], ["events", "Events"], ["activity", "Activity"], ["saved", "Saved"]].map(([key, label]) => <button key={key} aria-pressed={tab === key} onClick={() => setTab(key)}>{label}</button>)}</div><div className="profile-content-heading"><div><p className="real-eyebrow">{tab === "posts" ? "YOUR MOMENTS" : tab.toUpperCase()}</p><h2>{tab === "posts" ? "Things you have shared" : `Your ${tab}`}</h2></div><Link href="/create" className="profile-create">＋ Create</Link></div>{tab === "posts" ? <div className="profile-post-grid"><Feed key={account.uid} params={{ id: account.uid }} /></div> : <div className="profile-empty"><span>✦</span><h3>Nothing here yet</h3><p>As you create and save moments, they will collect here.</p></div>}</section>
  </main>;
}
