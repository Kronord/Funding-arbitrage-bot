import { Suspense } from "react";
import LoginForm from "./loginForm";
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Завантаження...</div>}>
      <LoginForm />
    </Suspense>
  );
};
