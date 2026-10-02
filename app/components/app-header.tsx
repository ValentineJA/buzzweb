"use client";

import Link from "next/link";


export default function AppHeader() {

  return (
    <header className="app-header">
      <Link className="brand" href="/" aria-label="Buzz home">
        <span className="brand-spark spark-left" aria-hidden="true">✦</span>
        <span className="brand-word">BUZZ</span>
        <span className="brand-spark spark-right" aria-hidden="true">✳</span>
      </Link>
    </header>
  );
}