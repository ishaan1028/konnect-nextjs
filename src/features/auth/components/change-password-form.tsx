"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useHookFormAction } from "@next-safe-action/adapter-react-hook-form/hooks";
import { useWatch } from "react-hook-form";
import { toast } from "sonner";

import { FormAlert } from "@/components/forms/form-alert";
import { PasswordChecklist } from "@/components/forms/password-checklist";
import { PasswordInput } from "@/components/forms/password-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import { FieldGroup } from "@/components/ui/field";

import { changePasswordAction } from "../actions";
import { changePasswordSchema } from "../schemas";

/** Current password, then the new one twice. */
export function ChangePasswordForm() {
  const { form, action, handleSubmitWithAction } = useHookFormAction(
    changePasswordAction,
    zodResolver(changePasswordSchema),
    {
      formProps: { mode: "onTouched" },
      actionProps: {
        onSuccess() {
          form.reset();
          toast.success("Password changed");
        },
      },
    },
  );

  const password = useWatch({ control: form.control, name: "password" }) ?? "";

  return (
    <form onSubmit={handleSubmitWithAction} noValidate className="space-y-6">
      <FormAlert message={action.result.serverError} />
      <FieldGroup>
        <TextField
          form={form}
          name="currentPassword"
          label="Current password"
          autoComplete="current-password"
          renderInput={(props) => <PasswordInput {...props} />}
        />
        <TextField
          form={form}
          name="password"
          label="New password"
          autoComplete="new-password"
          description={<PasswordChecklist password={password} />}
          renderInput={(props) => <PasswordInput {...props} />}
        />
        <TextField
          form={form}
          name="confirmPassword"
          label="Confirm new password"
          autoComplete="new-password"
          renderInput={(props) => <PasswordInput {...props} />}
        />
      </FieldGroup>
      <SubmitButton pending={action.isPending} pendingLabel="Saving…">
        Change password
      </SubmitButton>
    </form>
  );
}
