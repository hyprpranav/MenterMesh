"use client";

// ============================================================
// MentorMesh — Tabs v2
// ============================================================
import React from "react";
import { cn } from "@/lib/utils";

export interface Tab {
  id: string;
  label: string;
  count?: number;
  className?: string;
}

export interface TabsProps {
  tabs: Tab[];
  active?: string;
  activeTab?: string;
  onChange?: (id: string) => void;
  onTabChange?: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, active, activeTab, onChange, onTabChange, className }: TabsProps) {
  const currentActive = active ?? activeTab ?? (tabs[0]?.id || "");
  const handleChange = onChange ?? onTabChange ?? (() => {});

  return (
    <div className={cn("mm-tabs", className)} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={currentActive === tab.id}
          className={cn("mm-tab", currentActive === tab.id && "active", tab.className)}
          onClick={() => handleChange(tab.id)}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="mm-tab-count">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
