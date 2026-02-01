"use client";
import { Button } from "../ui/button";
import { LiquidGlass } from "@creativoma/liquid-glass";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: "Home", href: "#home" },
    { name: "Features", href: "#features" },
    { name: "About", href: "#about" },
    { name: "Contact", href: "#contact" },
  ];

  return (
    <LiquidGlass
      backdropBlur={4}
      tintColor="rgba(255, 255, 255, 0.1)"
      className="rounded-2xl overflow-hidden"
    >
      <nav className="container mx-auto flex items-center justify-between py-4">
        {/* Logo Section */}
        <div className="flex items-center gap-3 group cursor-pointer">
          <span className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent transition-all duration-300 group-hover:from-primary group-hover:to-foreground">
            Sentinel
          </span>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="relative px-4 py-2 text-sm font-medium text-foreground/80 transition-all duration-300 hover:text-foreground group"
            >
              <span className="relative z-10">{link.name}</span>
              <span className="absolute inset-0 bg-accent rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-primary group-hover:w-3/4 transition-all duration-300" />
            </a>
          ))}
        </div>

        {/* Desktop Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Button
            variant="ghost"
            className="text-sm font-medium hover:bg-accent transition-all duration-300 hover:scale-105"
          >
            Login
          </Button>
          <Button className="text-sm font-medium bg-primary hover:bg-primary/90 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/20">
            Sign Up
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <Button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-foreground hover:bg-accent rounded-md transition-colors duration-200"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </Button>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 w-full bg-background/95 backdrop-blur-lg border-b border-border/50 shadow-lg animate-in slide-in-from-top-2 duration-300">
            <div className="flex flex-col p-4 space-y-1">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-accent rounded-md transition-all duration-200"
                >
                  {link.name}
                </a>
              ))}
              <div className="pt-3 space-y-2 border-t border-border/50 mt-2">
                <Button
                  variant="ghost"
                  className="w-full text-sm font-medium justify-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Button>
                <Button
                  className="w-full text-sm font-medium bg-primary hover:bg-primary/90 justify-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign Up
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>
    </LiquidGlass>
  );
};

export default Navbar;
