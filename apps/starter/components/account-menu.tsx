"use client";
import * as Menu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import {
  UserRound,
  Settings2,
  CreditCard,
  Laptop,
  ShieldCheck,
  Cookie,
  LogOut,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { openCookiePreferences } from "./consent";
export function AccountMenu({
  go,
  demo = false,
}: {
  go: (view: string) => void;
  demo?: boolean;
}) {
  return (
    <Menu.Root>
      <Menu.Trigger className="account-trigger" aria-label="Account menu">
        <span className="account-avatar">
          <UserRound size={18} />
        </span>
        <span>Account</span>
        <ChevronDown size={15} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          className="account-menu"
          sideOffset={8}
          align="end"
          collisionPadding={12}
        >
          <Menu.Item className="menu-item" onSelect={() => go("menu")}>
            <UserRound size={17} />
            Account and appearance
          </Menu.Item>
          <Menu.Item className="menu-item" onSelect={() => go("usage")}>
            <Settings2 size={17} />
            Usage
          </Menu.Item>
          <Menu.Item className="menu-item" onSelect={() => go("billing")}>
            <CreditCard size={17} />
            Billing
          </Menu.Item>
          <Menu.Item className="menu-item" onSelect={() => go("runners")}>
            <Laptop size={17} />
            Computers
          </Menu.Item>
          <Menu.Item className="menu-item" onSelect={() => go("privacy")}>
            <ShieldCheck size={17} />
            Privacy
          </Menu.Item>
          <Menu.Item className="menu-item" onSelect={openCookiePreferences}>
            <Cookie size={17} />
            Cookie preferences
          </Menu.Item>
          <Menu.Separator className="menu-separator" />
          <Menu.Label
            className="version-label"
            title={process.env.NEXT_PUBLIC_APP_COMMIT}
          >
            Alpha · {process.env.NEXT_PUBLIC_APP_VERSION}
          </Menu.Label>
          <Menu.Item asChild className="menu-item">
            <Link href={demo ? "/app" : "/account"}>
              <LogOut size={17} />
              {demo ? "Open your library" : "Account & sign out"}
            </Link>
          </Menu.Item>
          <Menu.Item asChild className="menu-item">
            <Link href="/">
              <ExternalLink size={17} />
              Website
            </Link>
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
