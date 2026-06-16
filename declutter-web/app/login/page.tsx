import { Suspense } from "react";
import { LoginFlow } from "./login-flow";
import { SiteFooter } from "@/components/site-footer";

export default function LoginPage() {
  return (
    <>
      <Suspense fallback={<main className="min-h-screen bg-zinc-50" />}>
        <LoginFlow />
      </Suspense>
      <SiteFooter />
    </>
  );
}
