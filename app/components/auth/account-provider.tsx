"use client";
import { createContext, useContext, useState } from "react";
import type { Account } from "@/app/lib/auth/types";
import type { Profile } from "@/app/lib/profile-data";
import { requestJson } from "@/app/lib/auth/flow";
const AccountContext = createContext<{ account: Account; saveProfile: (profile: Profile) => Promise<void> } | null>(null);
export default function AccountProvider({ initialAccount, children }: { initialAccount: Account; children: React.ReactNode }) {
  const [account, setAccount] = useState(initialAccount);
  const saveProfile = async (profile: Profile) => {
    const result = await requestJson<{ profile: Profile }>("/api/account/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) });
    setAccount((current) => ({ ...current, profile: result.profile }));
  };
  return <AccountContext.Provider value={{ account, saveProfile }}>{children}</AccountContext.Provider>;
}
export function useAccount() {
  const value = useContext(AccountContext);
  if (!value) throw new Error("AccountProvider is required.");
  return value.account;
}
export function useProfile(): [Profile, (profile: Profile) => Promise<void>] {
  const value = useContext(AccountContext);
  if (!value) throw new Error("AccountProvider is required.");
  return [value.account.profile, value.saveProfile];
}
export function accountStorageKey(uid: string, key: string) { return `buzz-user:${uid}:${key}`; }