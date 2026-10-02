export type Profile = { name: string; handle: string; bio: string; city: string; mood: string; interests: string[] };
export const defaultProfile: Profile = {
  name: "Alex Morgan", handle: "alexafterhours", bio: "Collecting good people, great music, and stories worth staying up for.", city: "Edmonton", mood: "One more song", interests: ["House music", "Rooftops", "Late-night food"],
};
export type Memory = { id: string; title: string; date: string; place: string; kind: "Hosted" | "Went" | "Saved"; color: string; symbol: string };
export const memories: Memory[] = [
  { id: "m1", title: "Golden hour club", date: "SEP 21", place: "The Terrace", kind: "Hosted", color: "peach", symbol: "☀" },
  { id: "m2", title: "Lost in the music", date: "SEP 14", place: "Warehouse 04", kind: "Went", color: "lilac", symbol: "✳" },
  { id: "m3", title: "The slow Sunday", date: "SEP 08", place: "River valley", kind: "Went", color: "sage", symbol: "≈" },
  { id: "m4", title: "Rooftop rendezvous", date: "OCT 12", place: "The Terrace", kind: "Saved", color: "butter", symbol: "✷" },
];