"use client";

import { useActiveProject } from "@/app/_features/project/active-project-provider.client";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@workspace/ui/components/sidebar";
import { Inbox, LayoutDashboard, Plus, Settings2, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreateProjectDialog } from "./create/create-project-dialog.client";
import { NoProjectsCard } from "./no-projects-card.client";

export function ProjectNavigation() {
  const { activeProject, projects, isPending } = useActiveProject();
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  if (isPending) return null;

  const overview = (
    <SidebarGroup>
      <SidebarGroupLabel>Organization</SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            isActive={pathname === "/overview"}
            tooltip="Overview"
          >
            <Link href="/overview" onClick={() => setOpenMobile(false)}>
              <LayoutDashboard />
              <span>Overview</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );

  if (projects.length === 0) {
    return (
      <>
        {overview}
        <NoProjectsCard />
      </>
    );
  }

  if (!activeProject) return overview;

  const items = [
    { label: "Inbox", href: "/inbox" as const, icon: Inbox },
    { label: "Reviewers", href: "/reviewers" as const, icon: Users },
    { label: "Settings", href: "/settings" as const, icon: Settings2 },
  ];

  return (
    <>
      {overview}
      <SidebarGroup>
        <SidebarGroupLabel className="truncate" title={activeProject.name}>
          Project · {activeProject.name}
        </SidebarGroupLabel>
        <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={pathname === item.href}
              tooltip={item.label}
            >
              <Link href={item.href} onClick={() => setOpenMobile(false)}>
                <item.icon />
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
        <SidebarMenuItem>
          <CreateProjectDialog>
            <SidebarMenuButton tooltip="Create project">
              <Plus />
              <span>Create project</span>
            </SidebarMenuButton>
          </CreateProjectDialog>
        </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </>
  );
}
