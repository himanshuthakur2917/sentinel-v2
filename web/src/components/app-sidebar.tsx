"use client";

import * as React from "react";
import {
  IconChartBar,
  IconFolder,
  IconHome,
  IconListDetails,
  IconUsers,
} from "@tabler/icons-react";

import { NavMain } from "@/components/nav-main";

import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Image from "next/image";

import { useParams } from "next/navigation";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const params = useParams();
  const userId = params.id as string;

  const navMain = [
    {
      title: "Home",
      url: `/dashboard/${userId}`,
      icon: IconHome,
    },
    {
      title: "Reminders",
      url: `/dashboard/${userId}/reminders`,
      icon: IconListDetails,
    },
    {
      title: "Analytics",
      url: "#",
      icon: IconChartBar,
    },
    {
      title: "Projects",
      url: "#",
      icon: IconFolder,
    },
    {
      title: "Team",
      url: "#",
      icon: IconUsers,
    },
  ];

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <div className="flex items-center">
                <Image
                  src="/icon/sentinel-logo.png"
                  alt="Sentinel Logo"
                  className="lighth:invert"
                  width={40}
                  height={40}
                />
                <span className="text-xl tracking-[.4rem] font-bold font-logo z-10 translate-x-[-.5rem]">
                  ENTINEL
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
