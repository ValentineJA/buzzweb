import { Suspense } from "react";
import EmailAction from "@/app/components/auth/email-action";
export default function Page() { return <Suspense fallback={<p className="auth-page">Loading…</p>}><EmailAction /></Suspense>; }