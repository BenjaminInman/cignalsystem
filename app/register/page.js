import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

export const metadata = { title: "Request clearance · Cignal System" };

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
