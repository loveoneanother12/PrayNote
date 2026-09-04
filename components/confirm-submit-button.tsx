"use client";

import type { MouseEvent, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

type ConfirmSubmitButtonProps = {
  children: ReactNode;
  className?: string;
  message: string;
};

export function ConfirmSubmitButton({ children, className, message }: ConfirmSubmitButtonProps) {
  const { pending } = useFormStatus();
  function confirmAction(event: MouseEvent<HTMLButtonElement>) {
    if (!window.confirm(message)) event.preventDefault();
  }

  return <button className={`${className ?? ""} ${pending ? "button-pending" : ""}`.trim()} type="submit" onClick={confirmAction} disabled={pending} aria-busy={pending}>{pending ? <><LoaderCircle className="button-spinner" size={15} />처리 중…</> : children}</button>;
}
