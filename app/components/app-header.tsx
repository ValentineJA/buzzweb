"use client";

import Link from "next/link";

export default function AppHeader() {
  return <header className="app-header"><Link className="brand" href="/" aria-label="Buzz home"><span className="brand-word">BUZZ</span><svg className="brand-swoosh" viewBox="0 0 90 34" fill="none" aria-hidden="true"><path d="M5 24C23 22 29 9 44 9c11 0 13 9 5 15-6 5-15 5-23 4 11 1 28-3 45-12 8-4 14-7 19-5" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/><path d="M58 28c10-1 18-5 25-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></Link></header>;
}
