import { Suspense } from "react";
import CompleteAccount from "@/app/components/auth/complete-account";
export default function Page() { return <Suspense fallback={<p className="auth-page">Loading…</p>}><CompleteAccount mode="verify" /></Suspense>; }