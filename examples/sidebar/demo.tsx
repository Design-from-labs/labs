import {
  ChartColumn,
  CircleHelp,
  Folder,
  House,
  Inbox,
  Settings,
  Users,
} from "lucide-react";

import { Sidebar, SidebarGroup, SidebarItem } from "@/components/ui/sidebar";

export default function SidebarDemo() {
  return (
    <Sidebar
      title="Studio"
      label="Studio"
      footer={
        <SidebarItem href="#settings" icon={<Settings />}>
          Settings
        </SidebarItem>
      }
    >
      <SidebarGroup>
        <SidebarItem href="#home" icon={<House />} active>
          Home
        </SidebarItem>
        <SidebarItem href="#inbox" icon={<Inbox />}>
          Inbox
        </SidebarItem>
        <SidebarItem href="#reports" icon={<ChartColumn />}>
          Reports
        </SidebarItem>
      </SidebarGroup>
      <SidebarGroup label="Workspace">
        <SidebarItem href="#projects" icon={<Folder />}>
          Projects
        </SidebarItem>
        <SidebarItem href="#people" icon={<Users />}>
          People
        </SidebarItem>
        <SidebarItem href="#help" icon={<CircleHelp />}>
          Help
        </SidebarItem>
      </SidebarGroup>
    </Sidebar>
  );
}
