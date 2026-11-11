"use client";

import { useHookFormAction } from "@next-safe-action/adapter-react-hook-form/hooks";

import { FormAlert } from "@/components/forms/form-alert";
import { lazyZodResolver } from "@/components/forms/lazy-zod-resolver";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import { FieldGroup } from "@/components/ui/field";

import { requestPasswordResetAction } from "../actions";
import { CheckEmail } from "./check-email";

const resolver = lazyZodResolver(() => import("../schemas").then((m) => m.emailOnlySchema));

export function ForgotPasswordForm() {
  const { form, action, handleSubmitWithAction } = useHookFormAction(
    requestPasswordResetAction,
    resolver,
    { formProps: { mode: "onTouched" } },
  );

  if (action.result.data) {
    return (
      // Same answer whether or not the account exists (no user enumeration).
      <CheckEmail email={action.result.data.email}>
        If there&apos;s a Konnect account for this address, we sent a reset link to
      </CheckEmail>
    );
  }

  return (
    <form onSubmit={handleSubmitWithAction} noValidate className="space-y-6">
      <FormAlert message={action.result.serverError} />
      <FieldGroup>
        <TextField
          form={form}
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
        />
      </FieldGroup>
      <SubmitButton pending={action.isPending} pendingLabel="Sending link…">
        Send reset link
      </SubmitButton>
    </form>
  );
}
