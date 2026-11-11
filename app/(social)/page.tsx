import { redirect } from "next/navigation";
import { requireAccount } from "@/app/lib/auth/session";
export default async function Page() {
  await requireAccount();
  redirect("/map");
}
