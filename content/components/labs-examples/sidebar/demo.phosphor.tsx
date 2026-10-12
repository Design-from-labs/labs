import {
  ChartBarIcon,
  FolderIcon,
  GearIcon,
  HouseIcon,
  QuestionIcon,
  TrayIcon,
  UsersIcon,
} from "@phosphor-icons/react/ssr";

import { Sidebar, SidebarGroup, SidebarItem } from "@/components/ui/sidebar";

export default function SidebarDemo() {
  return (
    <Sidebar
      title="Studio"
      label="Studio"
      footer={
        <SidebarItem href="#settings" icon={<GearIcon />}>
          Settings
        </SidebarItem>
      }
    >
      <SidebarGroup>
        <SidebarItem href="#home" icon={<HouseIcon />} active>
          Home
        </SidebarItem>
        <SidebarItem href="#inbox" icon={<TrayIcon />}>
          Inbox
        </SidebarItem>
        <SidebarItem href="#reports" icon={<ChartBarIcon />}>
          Reports
        </SidebarItem>
      </SidebarGroup>
      <SidebarGroup label="Workspace">
        <SidebarItem href="#projects" icon={<FolderIcon />}>
          Projects
        </SidebarItem>
        <SidebarItem href="#people" icon={<UsersIcon />}>
          People
        </SidebarItem>
        <SidebarItem href="#help" icon={<QuestionIcon />}>
          Help
        </SidebarItem>
      </SidebarGroup>
    </Sidebar>
  );
}
