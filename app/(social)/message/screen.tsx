"use client";

import { useEffect, useRef, useState } from "react";
import { useLocalState } from "@/app/lib/local-state";

type ChatMessage = { id: string; author: string; text: string; time: string; mine?: boolean; reply?: string; heart?: boolean };
type Chat = { id: string; name: string; initials: string; type: "Direct" | "Group" | "Party"; members: string[]; unread: number; pinned?: boolean; muted?: boolean; archived?: boolean; request?: boolean; organizer?: boolean; expiresAt: number | null; spot?: string; plan?: string; messages: ChatMessage[] };
const initialChats: Chat[] = [
  { id: "party", name: "Rooftop rendezvous", initials: "↗", type: "Party", members: ["You", "Maya", "Jamie", "Leo"], unread: 3, pinned: true, organizer: true, expiresAt: null, spot: "The Terrace · west entrance", plan: "Golden hour at 6. Bring a layer for later.", messages: [{ id: "p1", author: "Maya", text: "Found the perfect spot for sunset 🌅", time: "6:02 PM" }, { id: "p2", author: "Jamie", text: "Meet at the west entrance?", time: "6:04 PM" }, { id: "p3", author: "Leo", text: "On my way. Saving you a spot!", time: "6:05 PM" }] },
  { id: "maya", name: "Maya Chen", initials: "MC", type: "Direct", members: ["You", "Maya"], unread: 2, expiresAt: null, messages: [{ id: "a1", author: "Maya", text: "That last song is still stuck in my head.", time: "5:40 PM" }, { id: "a2", author: "You", text: "Same! We need to do that again.", time: "5:41 PM", mine: true }, { id: "a3", author: "Maya", text: "Send me those photos when you get a chance ✨", time: "5:44 PM" }] },
  { id: "crew", name: "The usual suspects", initials: "US", type: "Group", members: ["You", "Maya", "Leo", "Ava", "Jamie"], unread: 0, expiresAt: null, messages: [{ id: "g1", author: "Ava", text: "Sunday brunch? I know a place.", time: "4:12 PM" }, { id: "g2", author: "You", text: "Say less. I'm in.", time: "4:15 PM", mine: true }] },
  { id: "after", name: "After the afterparty", initials: "✳", type: "Party", members: ["You", "Leo", "Ava"], unread: 0, organizer: false, expiresAt: null, spot: "Warehouse 04", plan: "A place for the photos and the next plan.", messages: [{ id: "f1", author: "Leo", text: "You had to be there. Luckily, we were.", time: "Yesterday" }] },
  { id: "jamie", name: "Jamie L.", initials: "JL", type: "Direct", members: ["You", "Jamie"], unread: 0, expiresAt: null, messages: [{ id: "j1", author: "Jamie", text: "Thanks for the invite! See you Saturday.", time: "Yesterday" }] },
  { id: "request", name: "Sunday club", initials: "SC", type: "Direct", members: ["You", "Sunday club"], unread: 1, request: true, expiresAt: null, messages: [{ id: "r1", author: "Sunday club", text: "Hey! Want to join our next open-deck night?", time: "Yesterday" }] },
];
const contacts = ["Maya Chen", "Jamie L.", "Leo Rivera", "Ava M."];
const categories = ["All", "Unread", "Direct", "Groups", "Parties", "Requests", "Archived"];

function remaining(expiresAt: number | null, now: number) {
  if (!expiresAt) return "Stays open";
  const minutes = Math.max(0, Math.ceil((expiresAt - now) / 60000));
  if (!minutes) return "Party closed";
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m left` : `${minutes}m left`;
}

export default function Messages() {
  const [chats, setChats] = useLocalState<Chat[]>("buzz-chats-v1", initialChats);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [reply, setReply] = useState("");
  const [now, setNow] = useState(0);
  const [newType, setNewType] = useState<Chat["type"]>("Direct");
  const [newName, setNewName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [newExpiry, setNewExpiry] = useState("0");
  const thread = useRef<HTMLDialogElement>(null);
  const create = useRef<HTMLDialogElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const active = chats.find((chat) => chat.id === activeId);
  const closed = !!active?.expiresAt && now > 0 && active.expiresAt <= now;
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => { if (activeId) thread.current?.showModal(); }, [activeId]);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [activeId, active?.messages.length]);
  const update = (id: string, patch: Partial<Chat>) => setChats((current) => current.map((chat) => chat.id === id ? { ...chat, ...patch } : chat));
  const openChat = (chat: Chat) => { setActiveId(chat.id); setText(""); setReply(""); update(chat.id, { unread: 0 }); };
  const closeChat = () => { thread.current?.close(); setActiveId(null); };
  const send = () => {
    if (!active || !text.trim() || active.request || (active.expiresAt && active.expiresAt <= Date.now())) return;
    const message: ChatMessage = { id: crypto.randomUUID(), author: "You", text: text.trim(), time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), mine: true, reply: reply || undefined };
    setChats((current) => current.map((chat) => chat.id === active.id ? { ...chat, messages: [...chat.messages, message] } : chat));
    setText(""); setReply("");
  };
  const visible = chats.filter((chat) => {
    if (category === "Archived" ? !chat.archived : chat.archived) return false;
    if (category !== "Archived" && (category === "Requests" ? !chat.request : chat.request)) return false;
    if (category === "Unread" && !chat.unread) return false;
    if (category === "Direct" && chat.type !== "Direct") return false;
    if (category === "Groups" && chat.type !== "Group") return false;
    if (category === "Parties" && chat.type !== "Party") return false;
    return `${chat.name} ${chat.messages.map((message) => message.text).join(" ")}`.toLowerCase().includes(search.toLowerCase());
  }).sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
  const unread = chats.filter((chat) => !chat.archived && !chat.request).reduce((total, chat) => total + chat.unread, 0);

  return <main className="social-page messages-page">
    <div className="social-heading"><div><p className="social-kicker">GOOD NIGHTS START WITH A MESSAGE</p><h1>The inner circle<span>.</span></h1></div><button className="round-action" aria-label="Start a conversation" onClick={() => { setSelected([]); setNewName(""); setNewType("Direct"); setNewExpiry("0"); create.current?.showModal(); }}>＋</button></div>
    <p className="social-subtitle">Your people. Your plans. The occasional “you up?”</p>
    <div className="inbox-pulse"><span className="pulse-symbol" aria-hidden="true">✳</span><div><strong>Some chats belong to a night.</strong><p>Party rooms can close when the organizer calls it.</p></div><span className="pulse-badge">NIGHT<br />BOARD</span></div>
    <label className="social-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="Find people, plans, or a message" aria-label="Search conversations and messages" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
    <div className="social-filters" role="group" aria-label="Conversation filters">{categories.map((item) => <button key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}{item === "Unread" && unread > 0 ? ` ${unread}` : ""}{item === "Requests" ? ` ${chats.filter((chat) => chat.request && !chat.archived).length}` : ""}</button>)}</div>
    <div className="list-caption"><span>{category === "All" ? "YOUR CONVERSATIONS" : category.toUpperCase()}</span><span>{visible.length} rooms</span></div>
    <div className="conversation-list">{visible.map((chat) => <button className={`conversation-row ${chat.type.toLowerCase()}`} key={chat.id} onClick={() => openChat(chat)}><span className="conversation-avatar">{chat.initials}{chat.type === "Party" && <i aria-hidden="true">✦</i>}</span><span className="conversation-copy"><span className="conversation-name">{chat.name}{chat.pinned && <small>PINNED</small>}</span><span className="conversation-preview">{chat.messages.at(-1)?.mine ? "You: " : ""}{chat.messages.at(-1)?.text || "A new conversation starts here."}</span><span className="conversation-meta">{chat.type === "Party" ? `◷ ${now ? remaining(chat.expiresAt, now) : "Party room"}` : chat.type === "Group" ? `${chat.members.length} people · Group` : "Direct message"}{chat.muted ? " · Muted" : ""}</span></span><span className="conversation-trailing"><time>{chat.messages.at(-1)?.time || "Now"}</time>{chat.unread > 0 && <b aria-label={`${chat.unread} unread messages`}>{chat.unread}</b>}<span aria-hidden="true">↗</span></span></button>)}</div>
    {visible.length === 0 && <div className="social-empty"><span>☏</span><h2>No conversations here.</h2><p>Try another filter or start something good.</p></div>}
    <p className="prototype-note">Interactive demo · Messages stay on this device and aren’t sent to anyone.</p>

    <dialog ref={thread} className="thread-dialog" aria-label={active ? `Conversation with ${active.name}` : "Conversation"} onCancel={() => setActiveId(null)}>
      {active && <div className="thread-shell"><header className="thread-header"><button className="round-action" onClick={closeChat} aria-label="Back to conversations">←</button><div><h2>{active.name}</h2><p>{active.type === "Direct" ? "Direct message" : `${active.members.length} people · ${active.type} room`}{active.muted ? " · Muted" : ""}</p></div><details className="thread-menu"><summary aria-label="Conversation options">•••</summary><div><button onClick={() => update(active.id, { pinned: !active.pinned })}>{active.pinned ? "Unpin" : "Pin"} conversation</button><button onClick={() => update(active.id, { muted: !active.muted })}>{active.muted ? "Unmute" : "Mute"} conversation</button><button onClick={() => { update(active.id, { unread: 1 }); closeChat(); }}>Mark unread</button><button onClick={() => { update(active.id, { archived: !active.archived }); closeChat(); }}>{active.archived ? "Restore" : "Archive"} conversation</button></div></details></header>
      <div className="thread-scroll">
        {active.type === "Party" && <section className="night-board"><div className="night-board-label"><span>✦ THE NIGHT BOARD</span><span>{now ? remaining(active.expiresAt, now) : "Party room"}</span></div><h3>The chat has a home base.</h3><div className="night-board-grid"><div><small>MEET HERE</small><strong>{active.spot}</strong></div><div><small>THE PLAN</small><strong>{active.plan}</strong></div></div><details><summary>{active.organizer ? "Organizer controls" : "Room details"} <span>⌄</span></summary>{active.organizer ? <div className="organizer-controls"><label>Meetup spot<input maxLength={100} value={active.spot || ""} onChange={(event) => update(active.id, { spot: event.target.value })} /></label><label>Pinned plan<input maxLength={180} value={active.plan || ""} onChange={(event) => update(active.id, { plan: event.target.value })} /></label><label>Close this party chat<select value="" onChange={(event) => { const hours = Number(event.target.value); update(active.id, { expiresAt: hours ? Date.now() + hours * 3600000 : null }); setNow(Date.now()); }}><option value="" disabled>Choose a new expiry…</option><option value="0">Keep open</option><option value="1">In 1 hour</option><option value="24">In 24 hours</option><option value="168">In 7 days</option><option value="-1">Close now (read-only)</option></select></label><p>When time runs out, sending stops. The room stays readable.</p></div> : <p>Only the organizer can change expiry or the pinned plan.</p>}<p className="room-members">{active.members.join(" · ")}</p></details></section>}
        {active.type === "Group" && <div className="group-members">THE CREW <span>{active.members.join(" · ")}</span></div>}
        <p className="thread-date">SAMPLE CONVERSATION · LOCAL DEMO</p>
        <div className="message-log" role="log" aria-label="Messages" aria-live="polite">{active.messages.map((message) => <div className={`message-wrap ${message.mine ? "mine" : ""}`} key={message.id}>{!message.mine && <span className="bubble-author">{message.author}</span>}<div className="message-bubble">{message.reply && <blockquote>{message.reply}</blockquote>}<p>{message.text}</p></div><div className="bubble-meta"><time>{message.time}</time>{message.mine && <span>Saved locally</span>}<button aria-label={`Reply to ${message.author}`} disabled={closed || active.request} onClick={() => setReply(`${message.author}: ${message.text.slice(0, 100)}`)}>Reply</button><button aria-label={message.heart ? "Remove heart reaction" : "React with heart"} aria-pressed={!!message.heart} disabled={closed || active.request} onClick={() => update(active.id, { messages: active.messages.map((item) => item.id === message.id ? { ...item, heart: !item.heart } : item) })}>{message.heart ? "♥" : "♡"}</button></div></div>)}</div><div ref={end} />
      </div>
      {active.request ? <div className="request-panel"><p>Accept this request to start chatting.</p><button onClick={() => update(active.id, { request: false })}>Accept request</button><button onClick={() => { update(active.id, { archived: true, request: false }); closeChat(); }}>Dismiss</button></div> : closed ? <div className="closed-chat"><strong>This night is a wrap.</strong><p>The organizer’s timer has ended. You can still read the memories.</p></div> : <form className="message-composer" onSubmit={(event) => { event.preventDefault(); send(); }}>{reply && <div className="reply-preview"><span>Replying to {reply}</span><button type="button" onClick={() => setReply("")} aria-label="Cancel reply">✕</button></div>}<div className="composer-input"><button type="button" aria-label="Add a celebration emoji" onClick={() => setText((value) => value + " 🎉")}>☺</button><textarea aria-label="Message" rows={1} maxLength={2000} placeholder="Keep the good going…" value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(); } }} /><button className="send-message" type="submit" aria-label="Send message locally" disabled={!text.trim()}>↑</button></div><p>Demo conversation · Only visible on this device</p></form>}
      </div>}
    </dialog>

    <dialog ref={create} className="social-dialog" aria-labelledby="create-chat-title"><form className="social-dialog-content" onSubmit={(event) => { event.preventDefault(); if (!selected.length || (newType !== "Direct" && (!newName.trim() || selected.length < 2))) return; const name = newType === "Direct" ? selected[0] : newName.trim(); const chat: Chat = { id: crypto.randomUUID(), name, initials: newType === "Party" ? "✦" : name.split(" ").map((part) => part[0]).join("").slice(0, 2), type: newType, members: ["You", ...selected], unread: 0, organizer: newType === "Party", expiresAt: newType === "Party" && Number(newExpiry) ? Date.now() + Number(newExpiry) * 3600000 : null, spot: "Choose a meetup spot", plan: "Make a plan together", messages: [] }; setChats((current) => [chat, ...current]); create.current?.close(); setActiveId(chat.id); setText(""); setReply(""); }}><div className="dialog-title-row"><div><p className="social-kicker">MAKE THE FIRST MOVE</p><h2 id="create-chat-title">Start something good.</h2></div><button className="round-action" type="button" onClick={() => create.current?.close()} aria-label="Close new conversation">✕</button></div><div className="social-filters">{(["Direct", "Group", "Party"] as const).map((type) => <button type="button" key={type} aria-pressed={newType === type} onClick={() => { setNewType(type); setSelected([]); }}>{type}</button>)}</div>{newType !== "Direct" && <label className="form-label">Room name<input required maxLength={50} placeholder="Give your crew a name" value={newName} onChange={(event) => setNewName(event.target.value)} /></label>}<fieldset className="contact-picker"><legend>{newType === "Direct" ? "Pick a person" : "Pick at least two people"} <small>DEMO CONTACTS</small></legend>{contacts.map((name) => <label key={name}><span className="mini-avatar">{name[0]}</span><span>{name}</span><input type={newType === "Direct" ? "radio" : "checkbox"} name="contact" checked={selected.includes(name)} onChange={() => setSelected((current) => newType === "Direct" ? [name] : current.includes(name) ? current.filter((item) => item !== name) : [...current, name])} /></label>)}</fieldset>{newType === "Party" && <label className="form-label">Party chat expiry<select value={newExpiry} onChange={(event) => setNewExpiry(event.target.value)}><option value="0">Keep open</option><option value="1">In 1 hour</option><option value="24">In 24 hours</option><option value="168">In 7 days</option></select><small>You’re the organizer. You can change this later.</small></label>}<button className="social-primary" disabled={!selected.length || (newType !== "Direct" && (!newName.trim() || selected.length < 2))}>Create {newType.toLowerCase()} chat ↗</button></form></dialog>
  </main>;
}