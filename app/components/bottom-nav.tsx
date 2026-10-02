"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Home", href: "/", path: "m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" },
  { label: "Explore", href: "/explore", path: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM16 8l-3 5-5 3 3-5Z" },
  { label: "Message", href: "/message", path: "M21 11.5a8.5 8.5 0 0 1-8.5 8.5 10 10 0 0 1-4-.8L3 21l1.8-5.5a10 10 0 0 1-.8-4A8.5 8.5 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5Z" },
  { label: "Profile", href: "/profile", path: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2" },
  { label: "Settings", href: "/settings", path: "m9 3-.6 2.4-2 .9L4 5.6 2 9l1.8 1.7v2.6L2 15l2 3.4 2.4-.7 2 .9L9 21h4l.6-2.4 2-.9 2.4.7 2-3.4-1.8-1.7v-2.6L20 9l-2-3.4-2.4.7-2-.9L13 3ZM14 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" },
];

export default function BottomNav() {
  const pathname = usePathname();
  return <nav className="bottom-nav" aria-label="Main navigation">
    {tabs.map((tab) => <Link key={tab.href} href={tab.href} aria-current={pathname === tab.href ? "page" : undefined} className={pathname === tab.href ? "nav-item active" : "nav-item"}>
      <span className="nav-icon"><svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={tab.path} /></svg></span>
      <span>{tab.label}</span>
    </Link>)}
  </nav>;
}
