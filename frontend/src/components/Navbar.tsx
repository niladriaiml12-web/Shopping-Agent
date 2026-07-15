"use client";

import React from "react";
import { Zap, Sun, Moon, User } from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onProfileClick?: () => void;
}

export default function Navbar({ activeTab, setActiveTab, onProfileClick }: NavbarProps) {
  const [isDark, setIsDark] = React.useState(false);

  const tabs = [
    { id: "discover", label: "Discover" },
    { id: "image", label: "Shop by Image" },
    { id: "assistant", label: "AI Assistant" },
    { id: "orders", label: "Orders" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#E5E7EB] bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Left Logo */}
        <div 
          className="flex items-center gap-2 cursor-pointer select-none"
          onClick={() => setActiveTab("discover")}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-500/30">
            <Zap className="h-5 w-5 fill-current" />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#1E293B]">
            Buy<span className="text-blue-600">ForYou</span>
          </span>
        </div>

        {/* Center Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-blue-50 text-blue-600"
                  : "text-[#64748B] hover:text-[#1E293B] hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDark(!isDark)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-[#64748B] hover:text-[#1E293B] hover:bg-gray-50 transition-all"
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
          </button>
          
          <button
            onClick={onProfileClick}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 border border-blue-100 text-blue-600 hover:bg-blue-100 transition-all"
            aria-label="User profile"
          >
            <User className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
