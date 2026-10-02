import { requireAccount } from "@/app/lib/auth/session";
import Screen from "./screen";
export default async function Page() {
  await requireAccount();
  return <Screen />;
}