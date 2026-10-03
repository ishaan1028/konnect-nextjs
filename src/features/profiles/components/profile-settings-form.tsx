"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useHookFormAction } from "@next-safe-action/adapter-react-hook-form/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useFormState, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { FormAlert } from "@/components/forms/form-alert";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import { FieldGroup } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { useUsernameAvailability } from "@/features/auth/components/use-username-availability";
import { UsernameStatus } from "@/features/auth/components/username-status";
import { queryKeys } from "@/lib/query/keys";

import { updateProfileAction } from "../actions";
import { BIO_MAX_LENGTH, type UpdateProfileInput, updateProfileSchema } from "../schemas";

export function ProfileSettingsForm({ initial }: { initial: UpdateProfileInput }) {
  const queryClient = useQueryClient();
  // A default value is a *starting* value: set it once, at mount. After a save,
  // the Server Action re-renders this page with the new values as `initial`;
  // passing those to the inputs' defaultValue would change the default of an
  // already-initialized uncontrolled input (Base UI warns; React ignores it).
  // The saved state lives in React Hook Form instead (form.reset below).
  const [startingValues] = useState(initial);

  const { form, action, handleSubmitWithAction } = useHookFormAction(
    updateProfileAction,
    zodResolver(updateProfileSchema),
    {
      formProps: { mode: "onTouched", defaultValues: startingValues },
      actionProps: {
        onSuccess({ data, input }) {
          // Update the cached current user so the nav (avatar, profile link)
          // reflects the change instantly, without refetching.
          if (data) queryClient.setQueryData(queryKeys.currentUser, data.profile);
          // The saved values become the new baseline for "has anything changed?".
          form.reset(input);
          toast.success("Profile updated");
        },
      },
    },
  );

  // defaultValues is the last *saved* state (form.reset moves it after a save).
  const { isDirty, defaultValues } = useFormState({ control: form.control });
  const [username = "", bio = ""] = useWatch({ control: form.control, name: ["username", "bio"] });
  const usernameStatus = useUsernameAvailability(username, defaultValues?.username);

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
          // In the server-rendered HTML too, so fields are never empty before hydration.
          defaultValue={startingValues.fullName}
        />
        <TextField
          form={form}
          name="username"
          label="Username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={20}
          defaultValue={startingValues.username}
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
          name="bio"
          label="Bio"
          multiline
          rows={3}
          maxLength={BIO_MAX_LENGTH}
          defaultValue={startingValues.bio}
          description={`${bio.length}/${BIO_MAX_LENGTH}`}
        />
      </FieldGroup>
      <SubmitButton
        pending={action.isPending}
        pendingLabel="Saving…"
        disabled={!isDirty || action.isPending}
        className="w-full sm:w-auto"
      >
        Save changes
      </SubmitButton>
    </form>
  );
}
