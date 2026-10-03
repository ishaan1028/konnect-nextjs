"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useHookFormAction } from "@next-safe-action/adapter-react-hook-form/hooks";
import Link from "next/link";
import type { FormEvent } from "react";

import { FormAlert } from "@/components/forms/form-alert";
import { PasswordInput } from "@/components/forms/password-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FieldGroup } from "@/components/ui/field";

import { signInAction } from "../actions";
import { signInSchema } from "../schemas";
import { ResendConfirmation } from "./resend-confirmation";

export function LoginForm() {
  const { form, action, handleSubmitWithAction } = useHookFormAction(
    signInAction,
    zodResolver(signInSchema),
    { formProps: { mode: "onTouched" } },
  );

  // Read ?next= at submit time instead of with useSearchParams(): the form then
  // needs no <Suspense> boundary and stays in the prerendered static shell.
  // The server sanitizes it with safeNextPath(), so it's never trusted as-is.
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    form.setValue("next", new URLSearchParams(window.location.search).get("next") ?? "");
    return handleSubmitWithAction(event);
  };

  const unconfirmed = action.result.data?.needsConfirmation ? action.result.data.email : null;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormAlert message={action.result.serverError} />
      {unconfirmed && (
        <Alert role="alert">
          <AlertTitle>Confirm your email first</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>Open the link we sent to {unconfirmed} to activate your account.</p>
            <ResendConfirmation email={unconfirmed} />
          </AlertDescription>
        </Alert>
      )}
      <FieldGroup>
        <TextField
          form={form}
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
        />
        <TextField
          form={form}
          name="password"
          label="Password"
          autoComplete="current-password"
          renderInput={(props) => <PasswordInput {...props} />}
        />
      </FieldGroup>
      <div className="flex justify-end text-sm">
        <Link
          href="/forgot-password"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Forgot password?
        </Link>
      </div>
      <SubmitButton pending={action.isPending} pendingLabel="Logging in…">
        Log in
      </SubmitButton>
    </form>
  );
}
