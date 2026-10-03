"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useHookFormAction } from "@next-safe-action/adapter-react-hook-form/hooks";
import { useRouter } from "next/navigation";
import { useWatch } from "react-hook-form";
import { toast } from "sonner";

import { FormAlert } from "@/components/forms/form-alert";
import { PasswordChecklist } from "@/components/forms/password-checklist";
import { PasswordInput } from "@/components/forms/password-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import { FieldGroup } from "@/components/ui/field";

import { updatePasswordAction } from "../actions";
import { resetPasswordSchema } from "../schemas";

export function ResetPasswordForm() {
  const router = useRouter();
  const { form, action, handleSubmitWithAction } = useHookFormAction(
    updatePasswordAction,
    zodResolver(resetPasswordSchema),
    {
      formProps: { mode: "onTouched" },
      actionProps: {
        onSuccess() {
          toast.success("Password updated. You're all set!");
          router.replace("/");
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
        Update password
      </SubmitButton>
    </form>
  );
}
