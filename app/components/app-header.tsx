"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppHeader() {
  const isExplore = usePathname() === "/explore";
  return (
    <header className={`app-header${isExplore ? " floating-header" : ""}`}>
      <Link className="brand" href="/" aria-label="Buzz home">
        <span className="brand-spark spark-left" aria-hidden="true">✦</span>
        <span className="brand-word">BUZZ</span>
        <span className="brand-spark spark-right" aria-hidden="true">✳</span>
      </Link>
    </header>
  );
}