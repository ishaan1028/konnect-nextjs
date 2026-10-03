"use client";

import { MailCheck } from "lucide-react";
import { useEffect, useRef } from "react";

import { ResendConfirmation } from "./resend-confirmation";

type CheckEmailProps = {
  email: string;
  title: string;
  children: React.ReactNode;
  /** Offer to resend the sign-up confirmation (not for password resets). */
  resend?: boolean;
};

/** Shown after sign-up / reset requests: "We sent you a link". */
export function CheckEmail({ email, title, children, resend = false }: CheckEmailProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // The form was just replaced by this panel; move focus to its heading so
  // keyboard and screen-reader users aren't left on a node that vanished.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="space-y-6">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-primary/20">
        <MailCheck aria-hidden className="size-7" />
      </span>
      <div className="space-y-2">
        <h1 ref={headingRef} tabIndex={-1} className="text-4xl font-extrabold outline-none">
          {title}
        </h1>
        <p className="text-muted-foreground">
          {children} <span className="font-medium break-all text-foreground">{email}</span>.
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        Can&apos;t find it? Check your spam folder. The link expires in 1 hour.
      </p>
      {resend && <ResendConfirmation email={email} />}
    </div>
  );
}
