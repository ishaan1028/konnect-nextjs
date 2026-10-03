"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useHookFormAction } from "@next-safe-action/adapter-react-hook-form/hooks";

import { FormAlert } from "@/components/forms/form-alert";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import { FieldGroup } from "@/components/ui/field";

import { requestPasswordResetAction } from "../actions";
import { emailOnlySchema } from "../schemas";
import { CheckEmail } from "./check-email";

export function ForgotPasswordForm() {
  const { form, action, handleSubmitWithAction } = useHookFormAction(
    requestPasswordResetAction,
    zodResolver(emailOnlySchema),
    { formProps: { mode: "onTouched" } },
  );

  if (action.result.data) {
    return (
      // Same answer whether or not the account exists (no user enumeration).
      <CheckEmail email={action.result.data.email} title="Check your inbox">
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
