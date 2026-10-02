import AppHeader from "@/app/components/app-header";
import BottomNav from "@/app/components/bottom-nav";
import AccountProvider from "@/app/components/auth/account-provider";
import { requireAccount } from "@/app/lib/auth/session";
export const dynamic = "force-dynamic";
export default async function SocialLayout({ children }: { children: React.ReactNode }) {
  const account = await requireAccount();
  return <AccountProvider initialAccount={account}><div className="app-shell"><AppHeader />{children}<BottomNav /></div></AccountProvider>;
}