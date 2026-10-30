"use client";

import React from "react";
import { cn } from "@/lib/utils";

// ---------- Button ----------
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all cursor-pointer",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        {
          "bg-brand text-white hover:bg-brand-hover active:bg-brand-active":
            variant === "primary",
          "bg-surface text-ink border border-border hover:bg-sidebar active:bg-surface-soft":
            variant === "secondary",
          "text-ink-light hover:bg-sidebar active:bg-surface-soft":
            variant === "ghost",
          "bg-red-600 text-white hover:bg-red-700 active:bg-red-800":
            variant === "danger",
        },
        {
          "text-sm px-3 py-1.5": size === "sm",
          "text-sm px-4 py-2": size === "md",
          "text-base px-6 py-2.5": size === "lg",
        },
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// ---------- Input ----------
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-ink-light mb-1"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "w-full px-3 py-2 rounded-lg border border-border bg-surface text-ink",
            "placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent",
            "transition-all text-sm",
            error && "border-red-400 focus:ring-red-300",
            className,
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  },
);
Input.displayName = "Input";

// ---------- Textarea ----------
interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-ink-light mb-1"
          >
            {label}
          </label>
        )}
        <textarea
          id={inputId}
          ref={ref}
          className={cn(
            "w-full px-3 py-2 rounded-lg border border-border bg-surface text-ink",
            "placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent",
            "transition-all text-sm resize-y min-h-[80px]",
            error && "border-red-400 focus:ring-red-300",
            className,
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";

// ---------- Select ----------
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-ink-light mb-1"
          >
            {label}
          </label>
        )}
        <select
          id={inputId}
          ref={ref}
          className={cn(
            "w-full px-3 py-2 rounded-lg border border-border bg-surface text-ink",
            "focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent",
            "transition-all text-sm",
            className,
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  },
);
Select.displayName = "Select";

// ---------- Card ----------
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  highlight?: string;
  noPadding?: boolean;
}

export function Card({
  className,
  highlight,
  noPadding,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "bg-surface rounded-xl border border-border shadow-sm",
        !noPadding && "p-4",
        highlight && `border-l-4`,
        highlight === "yellow" && "border-l-yellow-400",
        highlight === "mint" && "border-l-emerald-400",
        highlight === "pink" && "border-l-pink-400",
        highlight === "sky" && "border-l-sky-400",
        highlight === "violet" && "border-l-violet-400",
        highlight === "orange" && "border-l-orange-400",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ---------- Modal ----------
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "max-w-lg",
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Content */}
      <div
        className={cn(
          "relative bg-surface rounded-xl shadow-xl w-full animate-slide-up",
          maxWidth,
          "max-h-[85vh] flex flex-col",
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-sidebar text-ink-faint hover:text-ink transition-colors"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// ---------- Badge ----------
interface BadgeProps {
  children: React.ReactNode;
  color?: "yellow" | "mint" | "pink" | "sky" | "violet" | "orange" | "gray" | "red" | "green";
  className?: string;
}

export function Badge({ children, color = "gray", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        {
          "bg-yellow-100 text-yellow-800": color === "yellow",
          "bg-emerald-100 text-emerald-800": color === "mint",
          "bg-pink-100 text-pink-800": color === "pink",
          "bg-sky-100 text-sky-800": color === "sky",
          "bg-violet-100 text-violet-800": color === "violet",
          "bg-orange-100 text-orange-800": color === "orange",
          "bg-gray-100 text-gray-700": color === "gray",
          "bg-red-100 text-red-700": color === "red",
          "bg-green-100 text-green-700": color === "green",
        },
        className,
      )}
    >
      {children}
    </span>
  );
}

// ---------- EmptyState ----------
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <div className="mb-3 text-ink-faint">{icon}</div>}
      <h3 className="text-lg font-semibold text-ink mb-1">{title}</h3>
      <p className="text-sm text-ink-faint max-w-sm mb-4">{description}</p>
      {action}
    </div>
  );
}

// ---------- ProgressBar ----------
interface ProgressBarProps {
  value: number; // 0–100
  color?: string;
  size?: "sm" | "md";
  showLabel?: boolean;
}

export function ProgressBar({
  value,
  color = "bg-sky-500",
  size = "sm",
  showLabel = false,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "flex-1 bg-border rounded-full overflow-hidden",
          size === "sm" ? "h-1.5" : "h-2.5",
        )}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-ink-light min-w-[3ch] text-right">
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
}

// ---------- Tabs ----------
interface TabsProps {
  tabs: { id: string; label: string; icon?: React.ReactNode }[];
  activeTab: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="flex gap-1 border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors cursor-pointer",
            activeTab === tab.id
              ? "text-ink bg-surface border border-b-0 border-border -mb-px"
              : "text-ink-faint hover:text-ink-light hover:bg-sidebar",
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ---------- Confirm Dialog ----------
interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  danger = false,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-sm">
      <p className="text-sm text-ink-light mb-4">{message}</p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant={danger ? "danger" : "primary"}
          size="sm"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
