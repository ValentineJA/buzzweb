export type Setting = { id: string; title: string; description: string; kind: "toggle" | "select" | "action"; initial?: boolean | string; options?: string[]; detail?: string };
export type SettingSection = { id: string; title: string; symbol: string; description: string; items: Setting[] };
const toggle = (id: string, title: string, description: string, initial = true): Setting => ({ id, title, description, kind: "toggle", initial });
const select = (id: string, title: string, description: string, options: string[]): Setting => ({ id, title, description, kind: "select", initial: options[0], options });
const action = (id: string, title: string, description: string, detail: string): Setting => ({ id, title, description, kind: "action", detail });
export const sections: SettingSection[] = [
  { id: "account", title: "Account & security", symbol: "◎", description: "The essentials. Keep them yours.", items: [
    action("edit-profile", "Personal details", "Name, handle, bio, and your scene", ""),
    action("email", "Email & phone", "Contact information and verification", "Email and phone verification will be available when accounts are connected. No email or phone number is currently stored."),
    action("password", "Password & passkeys", "Sign-in methods and password changes", "This prototype has no sign-in system. Password changes and passkeys will require an authenticated account."),
    action("2fa", "Two-factor authentication", "An extra layer of account protection", "Two-factor enrollment is not implemented yet. Password and linked-provider management are available under Account security."),
    action("sessions", "Devices & sessions", "See where you’re signed in", "There are no authenticated sessions yet. This device only contains local demo data."),
    action("connected", "Connected accounts", "Manage linked apps and services", "No external accounts or apps are connected."),
  ]},
  { id: "privacy", title: "Privacy & visibility", symbol: "◈", description: "Decide who gets a little closer.", items: [
    toggle("private", "Private profile", "Approve followers before they see your posts", false),
    select("discoverable", "Who can find me", "Profile discoverability", ["Everyone", "Friends of friends", "Nobody"]),
    toggle("activity", "Show activity status", "Let your connections see when you’re active", false),
    select("stories", "Story audience", "Default audience for your 24-hour stories", ["Friends", "Everyone", "Close friends"]),
    select("tags", "Mentions & tags", "Who can tag or mention you", ["People I follow", "Everyone", "Nobody"]),
    toggle("tag-review", "Review tags first", "Approve tags before they appear on your profile"),
    toggle("attendance", "Show event attendance", "Let others see the events you’re going to", false),
    toggle("contact-discovery", "Find me by contact info", "Let others discover you by email or phone", false),
  ]},
  { id: "safety", title: "Safety & boundaries", symbol: "◇", description: "Good vibes need good boundaries.", items: [
    action("blocked", "Blocked accounts", "Manage people who can’t interact with you", "No accounts are blocked in this demo. Blocking will require account identities and server-side enforcement."),
    action("muted", "Muted accounts & words", "Quiet the people or topics you don’t want", "Account and keyword filtering will be available once a live feed is connected. Individual demo chats can already be muted in Messages."),
    toggle("sensitive", "Reduce sensitive content", "Limit potentially upsetting recommendations"),
    toggle("offensive", "Filter offensive messages", "Move potentially harmful messages out of your inbox"),
    select("comments", "Who can comment", "Control replies on your posts", ["Everyone", "Followers", "People I follow", "Nobody"]),
    action("reports", "Report history", "Track reports and moderation updates", "You haven’t submitted any reports. Reporting and moderation are not connected in this prototype."),
  ]},
  { id: "notifications", title: "Notifications", symbol: "✦", description: "Only the pings worth picking up.", items: [
    toggle("push", "Push notifications", "Messages and activity on your device"),
    toggle("dm-alerts", "Direct messages", "A heads-up when someone reaches out"),
    toggle("group-alerts", "Group conversations", "Keep up with your crew"),
    toggle("party-alerts", "Party updates", "Changes, pinned plans, and chat expiry"),
    toggle("event-reminders", "Event reminders", "A nudge before your saved events"),
    toggle("social-alerts", "Likes, follows & mentions", "Activity around your profile"),
    toggle("email-updates", "Email updates", "Occasional news from BUZZ", false),
    select("quiet", "Quiet hours", "A little space to switch off", ["Off", "10 PM – 8 AM", "Midnight – 9 AM", "Always quiet"]),
  ]},
  { id: "messaging", title: "Messages & party rooms", symbol: "☏", description: "Make your inbox feel like your people.", items: [
    select("message-requests", "Who can message me", "New conversations from other users", ["Everyone via requests", "People I follow", "Nobody new"]),
    toggle("read-receipts", "Read receipts", "Let people know you’ve seen a message"),
    toggle("typing", "Typing indicators", "Show when you’re writing a reply"),
    select("group-invites", "Who can add me to groups", "Control unsolicited group invitations", ["People I follow", "Everyone", "Nobody"]),
    select("party-default", "Default party chat expiry", "Suggested timer for rooms you organize", ["Keep open", "1 hour", "24 hours", "7 days"]),
    toggle("expiry-reminders", "Chat expiry reminders", "A heads-up before a party room closes"),
  ]},
  { id: "discovery", title: "Explore & location", symbol: "↗", description: "Less searching. More your scene.", items: [
    select("radius", "Preferred radius", "How far you’re happy to go", ["10 km", "5 km", "25 km", "50 km", "100 km"]),
    select("explore-mode", "Default Explore view", "How you prefer to find events", ["Map", "Scroll"]),
    select("price", "Event budget", "Your starting price filter", ["Any price", "Free", "Paid"]),
    toggle("personalized", "Personalized suggestions", "Recommendations based on your interests"),
    toggle("precise-location", "Use precise location", "Opt in to more accurate nearby suggestions", false),
    action("location-permission", "Device location permission", "Understand location access", "BUZZ has not requested your location. When maps are connected, location access will require a separate browser permission. Preferences here do not grant that permission."),
  ]},
  { id: "events", title: "Events & hosting", symbol: "✷", description: "Set the tone before the first guest.", items: [
    select("event-visibility", "Default event visibility", "Audience for newly created events", ["Friends", "Public", "Invite only"]),
    toggle("approve-guests", "Approve guest requests", "Review requests before people join"),
    toggle("guest-list", "Show guest list", "Let attendees see who else is coming", false),
    toggle("live-count", "Show live attendee count", "Display the current crowd on your event"),
    select("event-photos", "Who can add event photos", "Keep your event memories collaborative", ["Attendees", "Organizer only"]),
  ]},
  { id: "appearance", title: "Appearance & accessibility", symbol: "◐", description: "Comfortable by design.", items: [
    select("theme", "Color theme", "Your preferred app appearance", ["Light", "Dark", "Match device"]),
    select("text-size", "Text size", "Make reading more comfortable", ["Standard", "Larger", "Largest"]),
    toggle("reduced-motion", "Reduce motion", "Prefer fewer animated effects", false),
    toggle("high-contrast", "Higher contrast", "Prefer stronger text and control contrast", false),
    toggle("captions", "Show video captions", "Display captions when available"),
    select("language", "Language", "Your preferred interface language", ["English", "Français", "Español"]),
  ]},
  { id: "media", title: "Media & data usage", symbol: "▧", description: "Good memories. Less mobile data.", items: [
    select("autoplay", "Video autoplay", "When videos should start playing", ["Wi-Fi only", "Always", "Never"]),
    toggle("data-saver", "Data saver", "Prefer smaller media downloads", false),
    select("upload-quality", "Upload quality", "Balance detail and file size", ["Automatic", "High quality", "Data saver"]),
    toggle("save-originals", "Save original photos", "Keep a copy when sharing media", false),
  ]},
  { id: "data", title: "Your data", symbol: "↓", description: "Your information should stay in your hands.", items: [
    action("export", "Export local demo data", "Download this device’s BUZZ data as JSON", ""),
    toggle("analytics", "Optional analytics", "Your preference for anonymous usage insights", false),
    toggle("ads", "Personalized advertising", "Your preference for interest-based advertising", false),
    action("clear-demo", "Reset local demo data", "Remove local demo messages and preferences", ""),
  ]},
  { id: "help", title: "Help & about", symbol: "?", description: "A little guidance, whenever you need it.", items: [
    action("help-center", "Help center", "How this prototype works", "Authentication uses Firebase and profiles are saved in MongoDB. Demo chats and preference switches are still local to your account on this browser. Demo messages are not delivered to real people. Party expiry makes a local chat read-only. Explore currently has a blank map."),
    action("feedback", "Feedback & bug reports", "Help shape the next version", "A feedback inbox isn’t connected yet. Share feedback with the app’s developer directly; this screen does not send a report."),
    action("guidelines", "Community guidelines", "Build a welcoming community", "Community guidelines are still being prepared. This prototype has no public posting or moderation service."),
    action("privacy-policy", "Privacy policy", "How information will be handled", "A published privacy policy is not available yet. Your account identity is stored in Firebase, and your profile and private date of birth are stored in MongoDB. Demo chats and preferences remain on this browser. Use Export or Reset local demo data to manage it."),
    action("terms", "Terms of service", "The details behind the app", "Terms of service will be added before the app supports public accounts and live services."),
    action("about", "About BUZZ", "Version 0.1.0 · Made for good company", "BUZZ brings together events, people, and the memories in between. This is a local interactive design prototype, version 0.1.0."),
  ]},
  { id: "account-actions", title: "Account actions", symbol: "↪", description: "Take a break, or start a new chapter.", items: [
    action("logout", "Log out", "End your account session", "There is no authenticated account to log out of yet. To remove data from this browser, use Reset local demo data."),
    action("deactivate", "Deactivate account", "Take a break without deleting your account", "Account deactivation is not implemented yet. No account has been deactivated. You can sign out from Account security."),
    action("delete", "Delete account", "Permanently remove your account", "There is no server account to delete in this prototype. You can remove this device’s prototype data using Reset local demo data."),
  ]},
];
export const defaultSettings: Record<string, string | boolean> = Object.fromEntries(sections.flatMap((section) => section.items.filter((item) => item.kind !== "action").map((item) => [item.id, item.initial ?? false])));