"use client";

// ============================================================
// MentorMesh — PageHeader v2
// ============================================================
import React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  iconClass?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, icon, iconClass, actions }: PageHeaderProps) {
  return (
    <div className="mm-page-header">
      <div style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "1rem",
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", minWidth: 0, flex: 1 }}>
          {icon && (
            <div
              className={`mm-section-icon ${iconClass ?? ""}`}
              style={{ width: "40px", height: "40px", borderRadius: "10px", marginTop: "2px", flexShrink: 0 }}
            >
              {icon}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <h1 className="mm-page-title">{title}</h1>
            {subtitle && <p className="mm-page-subtitle">{subtitle}</p>}
          </div>
        </div>
        {actions && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0, flexWrap: "wrap" }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
