"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useLocalState } from "@/app/lib/local-state";
import { useAccount, useProfile, accountStorageKey } from "@/app/components/auth/account-provider";
import { logOut } from "@/app/lib/auth/flow";
import { defaultSettings, sections, type Setting } from "@/app/lib/settings-data";

export default function Settings() {
  const router = useRouter();
  const [settings, setSettings] = useLocalState("buzz-settings-v1", defaultSettings);
  const [profile] = useProfile();
  const account = useAccount();
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string[]>(["privacy"]);
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<Setting | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const visible = sections.map((section) => ({ ...section, items: section.title.toLowerCase().includes(search.toLowerCase()) ? section.items : section.items.filter((item) => `${item.title} ${item.description}`.toLowerCase().includes(search.toLowerCase())) })).filter((section) => section.items.length);
  const update = (id: string, value: string | boolean) => { setSettings((current) => ({ ...current, [id]: value })); setNotice("Preference saved on this device."); };
  const runAction = async (item: Setting) => {
    if (["email", "password", "connected", "sessions"].includes(item.id)) { router.push("/account/security"); return; }
    if (item.id === "logout") { try { await logOut(); } catch { setNotice("Sign-out failed. Please try again."); } return; }
    if (item.id === "export") {
      try {
        const keys = ["buzz-chats-v1", "buzz-settings-v1", "buzz-featured-memory"];
        const data = Object.fromEntries(keys.map((key) => [key, JSON.parse(localStorage.getItem(accountStorageKey(account.uid, key)) || "null")]));
        const url = URL.createObjectURL(new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), profile, ...data }, null, 2)], { type: "application/json" }));
        const anchor = document.createElement("a"); anchor.href = url; anchor.download = "buzz-local-data.json"; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setNotice("Your local data export has been downloaded.");
      } catch { setNotice("Couldn’t export local data. Browser storage may be unavailable."); }
      return;
    }
    setSelected(item); setConfirmReset(false); dialog.current?.showModal();
  };
  return <main className="social-page settings-page"><div className="social-heading"><div><p className="social-kicker">YOUR SPACE. YOUR SAY.</p><h1>On your terms<span>.</span></h1></div><span className="settings-flower" aria-hidden="true">✳</span></div><p className="social-subtitle">Turn up the good. Turn down everything else.</p><Link className="settings-identity" href="/profile"><span className="mini-avatar">{profile.name[0]}</span><span><strong>{profile.name}</strong><small>@{profile.handle} · View your passport</small></span><span>↗</span></Link><label className="social-search"><span aria-hidden="true">⌕</span><input type="search" aria-label="Search settings" placeholder="Find a setting, make it yours…" value={search} onChange={(event) => setSearch(event.target.value)} /></label><aside className="settings-preview-notice"><span aria-hidden="true">◈</span><p><strong>Preferences, in preview.</strong> Controls save locally. Privacy, security, notifications, appearance, and other service preferences aren’t enforced yet.</p></aside>
    <div className="settings-shortcuts"><button onClick={() => { setSearch(""); setExpanded(["privacy"]); document.getElementById("settings-privacy")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>◈ Privacy</button><button onClick={() => { setSearch(""); setExpanded(["notifications"]); document.getElementById("settings-notifications")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>✦ Notifications</button><button onClick={() => { setSearch(""); setExpanded(["data"]); document.getElementById("settings-data")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>↓ Your data</button></div>
    <p className="settings-save-status" role="status">{notice || "Your preferences are stored in this browser."}</p>
    <div className="settings-sections">{visible.map((section) => { const open = !!search || expanded.includes(section.id); return <section id={`settings-${section.id}`} className={`settings-section ${section.id === "account-actions" ? "settings-danger" : ""}`} key={section.id}><button className="settings-section-heading" aria-expanded={open} aria-controls={`settings-panel-${section.id}`} onClick={() => setExpanded((current) => current.includes(section.id) ? current.filter((id) => id !== section.id) : [...current, section.id])}><span className="settings-section-symbol">{section.symbol}</span><span><strong>{section.title}</strong><small>{section.description}</small></span><span className="section-chevron" aria-hidden="true">{open ? "−" : "+"}</span></button><div id={`settings-panel-${section.id}`} hidden={!open} className="settings-panel">{section.items.map((item) => <div className="settings-control-row" key={item.id}>{item.kind === "action" ? item.id === "edit-profile" ? <Link href="/profile" className="settings-action"><span><strong>{item.title}</strong><small>{item.description}</small></span><span aria-hidden="true">↗</span></Link> : <button className="settings-action" onClick={() => runAction(item)}><span><strong>{item.title}</strong><small>{item.description}</small></span><span aria-hidden="true">↗</span></button> : <><label htmlFor={`setting-${item.id}`}><strong>{item.title}</strong><small>{item.description}</small></label>{item.kind === "toggle" ? <button id={`setting-${item.id}`} className="settings-switch" role="switch" aria-label={item.title} aria-checked={Boolean(settings[item.id] ?? item.initial)} onClick={() => update(item.id, !Boolean(settings[item.id] ?? item.initial))}><span /></button> : <select id={`setting-${item.id}`} value={String(settings[item.id] ?? item.initial)} onChange={(event) => update(item.id, event.target.value)}>{item.options?.map((option) => <option key={option}>{option}</option>)}</select>}</>}</div>)}</div></section>; })}</div>
    {!visible.length && <div className="social-empty"><h2>No matching settings.</h2><p>Try “privacy”, “messages”, or “data”.</p><button className="social-primary" onClick={() => setSearch("")}>Show all settings</button></div>}<div className="settings-end"><strong>BUZZ</strong><span>Made for good company.</span><small>VERSION 0.1.0 · LOCAL PROTOTYPE</small></div>
    <dialog ref={dialog} className="social-dialog" aria-labelledby="setting-detail-title"><div className="social-dialog-content"><div className="dialog-title-row"><h2 id="setting-detail-title">{selected?.title}</h2><button className="round-action" onClick={() => dialog.current?.close()} aria-label="Close setting details">✕</button></div>{selected?.id === "clear-demo" ? <><p className="social-subtitle">This removes your demo conversations, featured memory, and local settings for this account from this browser. Your account profile is kept. Sample content returns. This cannot be undone unless you export your data first.</p><label className="reset-confirm"><input type="checkbox" checked={confirmReset} onChange={(event) => setConfirmReset(event.target.checked)} />I understand my local changes will be removed.</label><button className="social-primary destructive" disabled={!confirmReset} onClick={() => { try { for (const key of ["buzz-chats-v1", "buzz-settings-v1", "buzz-featured-memory"]) localStorage.removeItem(accountStorageKey(account.uid, key)); window.location.reload(); } catch { setNotice("Browser storage could not be cleared."); dialog.current?.close(); } }}>Reset local demo data</button></> : <><p className="setting-detail-copy">{selected?.detail}</p><span className="backend-label">{selected?.id === "about" || selected?.id === "help-center" ? "LOCAL PROTOTYPE" : "NOT CONNECTED YET"}</span></>}</div></dialog>
  </main>;
}