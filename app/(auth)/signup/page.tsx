import { Suspense } from "react";
import AuthForm from "@/app/components/auth/auth-form";
export default function Page() { return <Suspense fallback={<p className="auth-page">Loading…</p>}><AuthForm mode="signup" /></Suspense>; }