"use client";

import { type ComponentProps, type ReactNode, useId } from "react";
import {
  type FieldPath,
  type FieldValues,
  get,
  useFormState,
  type UseFormReturn,
} from "react-hook-form";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type TextFieldProps<TValues extends FieldValues> = {
  form: UseFormReturn<TValues>;
  name: FieldPath<TValues>;
  label: string;
  description?: ReactNode;
  /**
   * Render a custom control (e.g. a password input). Receives the props to
   * spread so registration, label, error and description stay wired.
   */
  renderInput?: (inputProps: ComponentProps<"input">) => ReactNode;
} & Omit<ComponentProps<"input">, "name" | "form" | "children">;

/**
 * A labelled, validated text input bound to React Hook Form.
 *
 * - Uncontrolled (`register`): the DOM owns the value. Text typed before
 *   hydration finishes (slow phones, fast typers) is kept, because React never
 *   overwrites an uncontrolled input. It also avoids a re-render per keystroke.
 *   Leave the field out of `defaultValues` so RHF reads the DOM on hydration.
 * - `useFormState` subscribes this field to its own error, so it updates even
 *   when the React Compiler memoizes the parent form.
 * - Accessible: the <label> targets the input, and the description and error
 *   are linked with aria-describedby ("Email, invalid entry, Enter a valid…").
 */
export function TextField<TValues extends FieldValues>({
  form,
  name,
  label,
  description,
  renderInput,
  ...inputProps
}: TextFieldProps<TValues>) {
  const id = useId();
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;

  const { errors } = useFormState({ control: form.control, name });
  const error = get(errors, name) as { message?: string } | undefined;

  const describedBy =
    [description && descriptionId, error && errorId].filter(Boolean).join(" ") || undefined;

  const props: ComponentProps<"input"> = {
    ...inputProps,
    ...form.register(name),
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
  };

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {renderInput ? renderInput(props) : <Input {...props} />}
      {typeof description === "string" ? (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      ) : (
        // Rich descriptions (a checklist, a live status) may contain block
        // elements like <ul>, which are invalid inside FieldDescription's <p>:
        // the browser would "fix" the HTML, the server and client trees would
        // differ, and React would throw a hydration error and re-render the
        // form, wiping anything already typed.
        description && (
          <div id={descriptionId} className="text-sm text-muted-foreground">
            {description}
          </div>
        )
      )}
      <FieldError id={errorId} errors={[error]} />
    </Field>
  );
}
