// Add the logs link to the sidebar items
import { ActivityLogIcon } from "@/components/icons/ActivityLogIcon";

const sidebarItems = [
  // ... existing items ...
  {
    title: "Logs",
    href: "/admin/logs",
    icon: <ActivityLogIcon className="h-5 w-5" />,
  },
  // ... existing items ...
]; 