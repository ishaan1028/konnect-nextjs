"use client";

import { type UseFormReturn, useWatch } from "react-hook-form";

import { TextField } from "@/components/forms/text-field";
import { FieldGroup } from "@/components/ui/field";

import {
  ALT_TEXT_MAX_LENGTH,
  CAPTION_MAX_LENGTH,
  LOCATION_MAX_LENGTH,
  type PostDetailsInput,
} from "../schemas";

type PostDetailsFieldsProps = {
  form: UseFormReturn<PostDetailsInput>;
  /** Starting values (in the server HTML too); omit for a new post. */
  initial?: PostDetailsInput;
  disabled?: boolean;
};

/** Caption, location and alt text: shared by the composer and the edit dialog. */
export function PostDetailsFields({ form, initial, disabled }: PostDetailsFieldsProps) {
  const [caption = "", altText = ""] = useWatch({
    control: form.control,
    name: ["caption", "altText"],
  });

  return (
    <FieldGroup>
      <TextField
        form={form}
        name="caption"
        label="Caption"
        multiline
        rows={4}
        maxLength={CAPTION_MAX_LENGTH}
        placeholder="Write a caption…"
        defaultValue={initial?.caption}
        description={`${caption.length.toLocaleString("en")}/${CAPTION_MAX_LENGTH.toLocaleString("en")}`}
        disabled={disabled}
      />
      <TextField
        form={form}
        name="location"
        label="Location"
        autoComplete="off"
        maxLength={LOCATION_MAX_LENGTH}
        placeholder="Add a location"
        defaultValue={initial?.location}
        disabled={disabled}
      />
      <TextField
        form={form}
        name="altText"
        label="Alt text"
        multiline
        rows={2}
        maxLength={ALT_TEXT_MAX_LENGTH}
        placeholder="Describe the photo"
        defaultValue={initial?.altText}
        description={`Read aloud by screen readers for people who can't see the photo. ${altText.length}/${ALT_TEXT_MAX_LENGTH}`}
        disabled={disabled}
      />
    </FieldGroup>
  );
}
