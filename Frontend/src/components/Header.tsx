"use client";

import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
  NavbarLogo,
  NavbarButton,
} from "../components/ui/resizable-navbar";
import { useState } from "react";
import { useBackendAuth } from "@/hooks/useBackendAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, signOut } = useBackendAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };
  const navItems = [
    {
      name: "Home",
      link: "#",
    },
    {
      name: "Features",
      link: "#features",
    },
    {
      name: "Pricing",
      link: "#pricing",
    },
    {
      name: "About",
      link: "#faq",
    },
  ];
  return (
    <Navbar>
      <NavBody>
        <NavbarLogo />
        <NavItems
          items={navItems}
        />
<div className="flex items-center justify-center gap-7 w-[30%]">
  {user ? (
    <div className="flex items-center space-x-3">
      {/* Dashboard / Avatar Button */}
      <Button
        onClick={() => navigate("/dashboard")}
        variant="ghost"
        className="text-white hover:bg-white/10 h-8 w-8 p-0"
        aria-label="Go to dashboard"
      >
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.avatar || ""} />
          <AvatarFallback className="bg-blue-600 text-white text-sm">
            {user.name ? getInitials(user.name) : "U"}
          </AvatarFallback>
        </Avatar>
      </Button>

      {/* Sign Out Button */}
      <Button
        onClick={handleSignOut}
        size="icon"
        className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8 p-0 relative z-10"
        aria-label="Sign out"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  ) : (
    <div className="flex items-center gap-3">
      <NavbarButton variant="secondary" href="/signin">
        Sign In
      </NavbarButton>
      <NavbarButton variant="primary" href="/signup">
        Sign Up
      </NavbarButton>
    </div>
  )}
</div>

        
      </NavBody>

      <MobileNav>
          <MobileNavHeader>
            <NavbarLogo />
            <MobileNavToggle
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />
          </MobileNavHeader>

          <MobileNavMenu
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
            className=" dark:bg-oxford_blue-500"
          >
            {navItems.map((item, idx) => (
              <a
                key={`mobile-link-${idx}`}
                href={item.link}
                onClick={() => setIsMobileMenuOpen(false)}
                className="relative text-neutral-600 dark:text-white"
              >
                <span className="block">{item.name}</span>
              </a>
            ))}
            <div className="flex w-full justify-center flex-col gap-4">
              {user ? (
                <>
                  <Button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      navigate("/dashboard");
                    }}
                    variant="outline"
                    className="w-full border-white/20 text-white hover:bg-white/10"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                  <Button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleSignOut();
                    }}
                    variant="outline"
                    className="w-full border-white/20 text-white hover:bg-white/10"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <div className="flex flex-col gap-3 w-full">
                  <NavbarButton
                    onClick={() => setIsMobileMenuOpen(false)}
                    variant="secondary"
                    className="w-full"
                    href="/signin"
                  >
                    Sign In
                  </NavbarButton>
                  <NavbarButton
                    onClick={() => setIsMobileMenuOpen(false)}
                    variant="primary"
                    className="w-full"
                    href="/signup"
                  >
                    Sign Up
                  </NavbarButton>
                </div>
              )}
            </div>
          </MobileNavMenu>
        </MobileNav>
    </Navbar>
  );
};
