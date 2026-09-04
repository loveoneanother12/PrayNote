"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

type PendingSubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  pendingText?: string;
};

export function PendingSubmitButton({ children, pendingText = "처리 중…", disabled, className = "", ...props }: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      {...props}
      className={`${className} ${pending ? "button-pending" : ""}`.trim()}
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
    >
      {pending ? <><LoaderCircle className="button-spinner" size={15} />{pendingText}</> : children}
    </button>
  );
}
