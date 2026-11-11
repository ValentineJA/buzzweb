"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccount } from "@/app/components/auth/account-provider";
import { Empty, ErrorNote, mutate, time, useAction, useData } from "@/app/components/social/common";
import type { Message, Person, Room } from "@/app/lib/social/types";

type RoomFilter = "all" | "direct" | "group" | "events";

function Initial({ name, large = false }: { name: string; large?: boolean }) {
  return <span className={large ? "message-avatar message-avatar-large" : "message-avatar"}>{name.slice(0, 1).toUpperCase()}</span>;
}

function RoomRow({ room, active, accountId, onSelect }: { room: Room; active: boolean; accountId: string; onSelect: () => void }) {
  const latest = useData<{ messages: Message[] }>("messages", { id: room._id });
  const person = room.kind === "direct" ? room.people.find(item => item.id !== accountId) : undefined;
  const title = person?.name || room.name || "Conversation";
  const preview = latest.data?.messages.at(-1);
  return <button className={`message-room ${active ? "selected" : ""}`} onClick={onSelect}>
    <Initial name={title} />
    <span className="message-room-copy"><strong>{title}</strong><small>{preview?.text || `${room.kind === "party" ? "Event group" : room.kind} conversation`}</small></span>
    <span className="message-room-meta"><time>{preview ? time(preview.createdAt) : time(room.updatedAt)}</time>{room.unread > 0 && <b>{room.unread}</b>}</span>
  </button>;
}

function Messages() {
  const account = useAccount();
  const router = useRouter();
  const search = useSearchParams();
  const rooms = useData<{ rooms: Room[] }>("rooms", {}, 7000);
  const id = search.get("room");
  const active = rooms.data?.rooms.find(room => room._id === id);
  const [term, setTerm] = useState("");
  const [filter, setFilter] = useState<RoomFilter>("all");
  const [newRoom, setNewRoom] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [personSearch, setPersonSearch] = useState("");
  const people = useData<{ people: Person[] }>("users", { q: personSearch });
  const action = useAction(rooms.refresh);
  const createRoom = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await mutate<{ id: string }>("room-create", { kind: form.get("kind") || "direct", members: selectedMembers, name: form.get("name") || "" });
    setNewRoom(false); setSelectedMembers([]); await rooms.refresh(); router.push(`/message?room=${encodeURIComponent(result.id)}`);
  };
  const visibleRooms = rooms.data?.rooms.filter(room => {
    const matchesFilter = filter === "all" || (filter === "events" ? Boolean(room.eventId) || room.kind === "party" : room.kind === filter);
    return matchesFilter && `${room.name} ${room.people.map(person => person.name).join(" ")}`.toLowerCase().includes(term.toLowerCase());
  }) || [];

  return <main className="messages-dashboard">
    <aside className="message-sidebar">
      <div className="message-sidebar-heading"><div><p className="real-eyebrow">YOUR PEOPLE</p><h1>Messages</h1></div><button className="real-primary message-new" onClick={() => setNewRoom(!newRoom)} aria-label="New message">＋</button></div>
      <label className="message-search"><span>⌕</span><input value={term} onChange={event => setTerm(event.target.value)} placeholder="Search messages, people, or groups…" /></label>
      <div className="message-filters" role="tablist" aria-label="Message filters">{(["all", "direct", "group", "events"] as RoomFilter[]).map(value => <button role="tab" key={value} aria-selected={filter === value} onClick={() => setFilter(value)}>{value === "all" ? "All" : value === "direct" ? "Direct" : value === "group" ? "Groups" : "Events"}</button>)}</div>
      {newRoom && <form className="message-new-room" onSubmit={event => void action.run(() => createRoom(event))}><div className="message-new-heading"><h2>Start a conversation</h2><button type="button" onClick={() => setNewRoom(false)}>×</button></div><select name="kind" defaultValue="direct"><option value="direct">Direct message</option><option value="group">Group chat</option><option value="party">Event group</option></select><input name="name" placeholder="Group name (optional)" maxLength={80}/><input value={personSearch} onChange={event => setPersonSearch(event.target.value)} placeholder="Find people"/><div className="message-picker">{people.data?.people.map(person => <label key={person.id}><input type="checkbox" checked={selectedMembers.includes(person.id)} onChange={event => setSelectedMembers(event.target.checked ? [...selectedMembers, person.id] : selectedMembers.filter(member => member !== person.id))}/><span>{person.name}</span><small>@{person.handle}</small></label>)}</div><button className="real-primary" disabled={!selectedMembers.length}>Create chat</button></form>}
      <div className="message-room-list">{rooms.loading && <p>Loading conversations…</p>}{!rooms.loading && !visibleRooms.length && <Empty>No conversations yet.</Empty>}{visibleRooms.map(room => <RoomRow key={room._id} room={room} accountId={account.uid} active={room._id === id} onSelect={() => router.push(`/message?room=${encodeURIComponent(room._id)}`)} />)}</div>
    </aside>
    <section className="message-conversation">{active ? <Conversation room={active} refreshRooms={rooms.refresh} /> : <div className="message-welcome"><span>✦</span><h2>Good conversations start here.</h2><p>Choose a chat or start a new one with your BUZZ people.</p><button className="real-primary" onClick={() => setNewRoom(true)}>Start a conversation</button></div>}</section>
    <aside className="message-details">{active ? <ConversationDetails room={active} accountId={account.uid} /> : <p>Select a conversation to see details.</p>}</aside>
  </main>;
}

function ConversationDetails({ room, accountId }: { room: Room; accountId: string }) {
  const person = room.kind === "direct" ? room.people.find(item => item.id !== accountId) : undefined;
  const title = person?.name || room.name || "Conversation";
  return <><Initial name={title} large /><h2>{title}</h2><p>{room.kind === "party" ? "Event group" : room.kind} · {room.people.length} members</p><div className="message-detail-actions"><button>☎<small>Audio</small></button><button>▣<small>Video</small></button><button>▦<small>Event</small></button></div><div className="message-detail-list"><button>ⓘ <span>Group info</span><b>›</b></button><button>♧ <span>Members ({room.people.length})</span><b>›</b></button><button>▧ <span>Shared media</span><b>›</b></button><button>▣ <span>Events</span><b>›</b></button><button>⌁ <span>Pinned messages</span><b>›</b></button><button>◔ <span>Mute notifications</span><i className="message-toggle" /></button><button className="leave-chat">↪ <span>Leave conversation</span></button></div><div className="message-member-list">{room.people.slice(0, 6).map(member => <span key={member.id}><Initial name={member.name}/><small>{member.name}</small></span>)}</div></>;
}

function Conversation({ room, refreshRooms }: { room: Room; refreshRooms: () => Promise<void> }) {
  const account = useAccount();
  const messages = useData<{ messages: Message[]; closed: boolean }>("messages", { id: room._id }, 5000);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<Message | null>(null);
  const action = useAction(async () => { await messages.refresh(); await refreshRooms(); });
  const latest = messages.data?.messages.at(-1)?._id;
  useEffect(() => { if (latest) void mutate("read", { id: room._id }).then(refreshRooms).catch(() => {}); }, [latest, refreshRooms, room._id]);
  const send = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); await mutate(editing ? "message-edit" : "message-send", { id: editing ? editing._id : room._id, text }); setText(""); setEditing(null); await messages.refresh(); };
  const person = room.kind === "direct" ? room.people.find(item => item.id !== account.uid) : undefined;
  const title = person?.name || room.name || "Conversation";
  return <><header className="conversation-header"><button className="conversation-back" onClick={() => window.history.back()} aria-label="Back">‹</button><Initial name={title}/><div><h2>{title}</h2><p>{room.kind === "party" ? "Event group" : room.kind} · {room.people.length} members</p></div><div className="conversation-actions"><button aria-label="Start video call">▣</button><button aria-label="Start audio call">☎</button><button aria-label="Search chat">⌕</button><button aria-label="More actions">⋮</button></div></header><ErrorNote text={messages.error || action.error}/><div className="conversation-messages">{messages.data?.messages.length ? <div className="message-day-pill">Today</div> : null}{!messages.loading && !messages.data?.messages.length && <Empty>It starts with a hello.</Empty>}{messages.data?.messages.map(message => <article className={`chat-bubble ${message.ownerId === account.uid ? "mine" : ""}`} key={message._id}><div className="chat-sender"><Initial name={message.author.name}/><strong>{message.author.name}</strong><small>{time(message.createdAt)}</small></div><p>{message.text}</p><small className="chat-time">{message.editedAt ? "Edited · " : ""}{message.ownerId === account.uid ? "Delivered" : ""}</small>{message.ownerId === account.uid && <div className="chat-message-actions"><button onClick={() => { setEditing(message); setText(message.text); }}>Edit</button><button onClick={() => void action.run(() => mutate("message-delete", { id: message._id }))}>Delete</button></div>}</article>)}</div>{messages.data?.closed ? <Empty>This room is closed.</Empty> : <form className="message-composer" onSubmit={event => void action.run(() => send(event))}>{editing && <button type="button" className="editing-pill" onClick={() => { setEditing(null); setText(""); }}>Editing · cancel</button>}<button type="button" className="composer-tool" aria-label="Add attachment">＋</button><input value={text} onChange={event => setText(event.target.value)} placeholder={editing ? "Edit your message…" : "Type a message…"} required maxLength={2000}/><button type="button" className="composer-tool" aria-label="Add emoji">☺</button><button type="button" className="composer-tool composer-secondary" aria-label="Add image">▧</button><button type="button" className="composer-tool composer-secondary" aria-label="Add file">⌕</button><button className="real-primary send-message" disabled={action.busy} aria-label="Send message">➤</button></form>}</>;
}

export default function Screen() { return <Suspense fallback={<p className="real-page">Loading messages…</p>}><Messages /></Suspense>; }
