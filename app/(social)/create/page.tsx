"use client";

import { useState } from "react";
import { Composer } from "@/app/components/social/posts";

export default function CreatePage() {
  const [created, setCreated] = useState(false);
  return <main className="real-page">
    <p className="real-eyebrow">MAKE SOMETHING HAPPEN</p>
    <h1>Create a buzz.</h1>
    {created ? <section className="real-card real-notice"><h2>Published</h2><p>Your post is live. Share the plan and get people moving.</p><a href="/home">Back to Home</a></section> : <Composer onDone={async () => setCreated(true)} onCancel={() => window.history.back()} />}
  </main>;
}
