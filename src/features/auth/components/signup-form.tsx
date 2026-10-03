"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useHookFormAction } from "@next-safe-action/adapter-react-hook-form/hooks";
import { useWatch } from "react-hook-form";

import { FormAlert } from "@/components/forms/form-alert";
import { PasswordChecklist } from "@/components/forms/password-checklist";
import { PasswordInput } from "@/components/forms/password-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import { FieldGroup } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";

import { signUpAction } from "../actions";
import { signUpSchema } from "../schemas";
import { CheckEmail } from "./check-email";
import { useUsernameAvailability } from "./use-username-availability";
import { UsernameStatus } from "./username-status";

export function SignupForm() {
  // One hook wires React Hook Form to the Server Action: the same Zod schema
  // validates in the browser, and server-side field errors (e.g. "username
  // taken") are mapped back onto the matching inputs automatically.
  const { form, action, handleSubmitWithAction } = useHookFormAction(
    signUpAction,
    zodResolver(signUpSchema),
    {
      // No defaultValues: inputs are uncontrolled and RHF reads them from the DOM.
      formProps: { mode: "onTouched" },
    },
  );

  // useWatch (not form.watch) re-renders only this component and plays well
  // with the React Compiler.
  // Undefined until first input (uncontrolled fields have no default value).
  const [username = "", password = ""] = useWatch({
    control: form.control,
    name: ["username", "password"],
  });
  const usernameStatus = useUsernameAvailability(username);

  if (action.result.data) {
    return (
      <CheckEmail email={action.result.data.email} title="Check your inbox" resend>
        We sent a confirmation link to
      </CheckEmail>
    );
  }

  return (
    <form onSubmit={handleSubmitWithAction} noValidate className="space-y-6">
      <FormAlert message={action.result.serverError} />
      <FieldGroup>
        <TextField
          form={form}
          name="fullName"
          label="Full name"
          autoComplete="name"
          maxLength={50}
        />
        <TextField
          form={form}
          name="username"
          label="Username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={20}
          description={<UsernameStatus status={usernameStatus} />}
          renderInput={(props) => (
            <InputGroup>
              <InputGroupAddon>
                <InputGroupText>@</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput {...props} />
            </InputGroup>
          )}
        />
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
          autoComplete="new-password"
          description={<PasswordChecklist password={password} />}
          renderInput={(props) => <PasswordInput {...props} />}
        />
      </FieldGroup>
      <SubmitButton pending={action.isPending} pendingLabel="Creating your account…">
        Create account
      </SubmitButton>
    </form>
  );
}
