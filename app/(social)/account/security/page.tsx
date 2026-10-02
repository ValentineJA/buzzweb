import { requireAccount } from "@/app/lib/auth/session";
import AccountSecurity from "@/app/components/auth/account-security";
export default async function Page() {
  await requireAccount();
  return <AccountSecurity />;
}