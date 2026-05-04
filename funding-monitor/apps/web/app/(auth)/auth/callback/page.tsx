import { Suspense } from "react";
import GoogleAuth from "./googleAuth";
export const dynamic = "force-dynamic";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div>Завантаження...</div>}>
      <GoogleAuth />
    </Suspense>
  );
}
