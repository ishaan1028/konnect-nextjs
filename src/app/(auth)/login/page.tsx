import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AuthNotice } from "@/features/auth/components/auth-notice";
import { DemoLogin } from "@/features/auth/components/demo-login";
import { LoginForm } from "@/features/auth/components/login-form";

import { AuthHeader } from "../auth-header";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="space-y-8">
      <AuthHeader title="Welcome back" description="Log in to see what your friends are sharing." />
      {/* Only the notice depends on the URL; everything else is prerendered. */}
      <Suspense fallback={null}>
        <AuthNotice searchParams={searchParams} />
      </Suspense>
      <LoginForm />
      <DemoLogin />
      <p className="text-sm text-muted-foreground">
        New to Konnect?{" "}
        <Link
          href="/signup"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
