export type NavItem = {
  href: string;
  label: string;
  section: "must" | "should" | "could";
};

export const dashboardNavItems: NavItem[] = [
  { href: "/dashboard/profile", label: "Profile", section: "must" },
  { href: "/dashboard/schedule", label: "Schedule", section: "must" },
  { href: "/dashboard/grades", label: "Grades", section: "must" },
  { href: "/dashboard/gradebook", label: "Gradebook", section: "must" },
  { href: "/dashboard/news", label: "News", section: "should" },
  { href: "/dashboard/teachers", label: "Teachers", section: "should" },
  { href: "/dashboard/canteen", label: "Canteen", section: "should" },
  { href: "/dashboard/events", label: "Events", section: "should" },
  { href: "/dashboard/documents", label: "Documents", section: "should" },
  { href: "/dashboard/notifications", label: "Notifications", section: "should" },
  { href: "/dashboard/bulletin", label: "Bulletin Board", section: "could" },
  {
    href: "/dashboard/event-registration",
    label: "Event Registration",
    section: "could",
  },
  { href: "/dashboard/portfolio", label: "Portfolio", section: "could" },
  { href: "/dashboard/lost-found", label: "Lost & Found", section: "could" },
  {
    href: "/dashboard/sports-schedule",
    label: "Club Schedule",
    section: "could",
  },
  {
    href: "/dashboard/sports-registration",
    label: "Club Registration",
    section: "could",
  },
  { href: "/dashboard/dark-mode", label: "Dark Mode", section: "could" },
];
