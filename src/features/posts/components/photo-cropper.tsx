"use client";

import Cropper, { type CropperProps } from "react-easy-crop";

export type PhotoCropperProps = Pick<
  CropperProps,
  "image" | "crop" | "zoom" | "aspect" | "onCropChange" | "onZoomChange" | "onCropComplete"
>;

/**
 * react-easy-crop with the few props we use. Its own module so /create can
 * load it on demand (next/dynamic) only once a photo has been picked.
 */
export default function PhotoCropper(props: PhotoCropperProps) {
  return <Cropper {...props} showGrid />;
}
