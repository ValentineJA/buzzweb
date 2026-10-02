export type Settings = {
    privateProfile: boolean;
    discoverable: boolean;
    messages: "everyone" | "following" | "nobody";
    groupInvites: "everyone" | "following" | "nobody";
    comments: "everyone" | "followers" | "nobody";
    notifications: boolean;
    readReceipts: boolean;
    theme: "light" | "dark";
    reducedMotion: boolean;
    radius: number;
    category: string;
    freeOnly: boolean;
    partyHours: number;
};
export const defaults: Settings = { privateProfile: false, discoverable: true, messages: "everyone", groupInvites: "following", comments: "everyone", notifications: true, readReceipts: true, theme: "light", reducedMotion: false, radius: 25, category: "", freeOnly: false, partyHours: 24 };
export const kinds = ["post", "event", "location", "after", "live", "story"] as const;
export type Kind = typeof kinds[number];
export type Person = {
    id: string;
    name: string;
    handle: string;
    bio: string;
    city: string;
    mood: string;
    interests: string[];
    following: boolean;
    requested: boolean;
    private: boolean;
};
export type Post = {
    _id: string;
    ownerId: string;
    kind: Kind;
    title: string;
    text: string;
    mediaId: string;
    location: string;
    latitude: number | null;
    longitude: number | null;
    startsAt: string | null;
    endsAt: string | null;
    category: string;
    price: number;
    audience: "public" | "followers";
    createdAt: string;
    expiresAt: string | null;
    author: Person;
    likes: number;
    liked: boolean;
    saved: boolean;
    going: number;
    here: number;
    attendance: string;
    comments: number;
};
export type Room = {
    _id: string;
    ownerId: string;
    name: string;
    kind: "direct" | "group" | "party";
    members: string[];
    people: Person[];
    eventId: string;
    expiresAt: string | null;
    updatedAt: string;
    unread: number;
    closed: boolean;
};
export type Message = {
    _id: string;
    roomId: string;
    ownerId: string;
    text: string;
    createdAt: string;
    editedAt?: string;
    author: Person;
    readBy: string[];
};
export type Comment = {
    _id: string;
    ownerId: string;
    text: string;
    createdAt: string;
    author: Person;
};
export function canEdit(ownerId: string, uid: string) { return ownerId === uid; }
export function expired(expiresAt: string | null | undefined, now = Date.now()) { return !!expiresAt && new Date(expiresAt).getTime() <= now; }
export function distanceKm(a: number, b: number, c: number, d: number) {
    const rad = Math.PI / 180;
    const x = Math.sin((c - a) * rad / 2) ** 2 + Math.cos(a * rad) * Math.cos(c * rad) * Math.sin((d - b) * rad / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(Math.max(0, 1 - x)));
}
