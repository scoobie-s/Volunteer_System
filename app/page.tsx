import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getAuthenticatedUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getAuthenticatedUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(144,154,255,0.28),transparent_22%),radial-gradient(circle_at_18%_72%,rgba(156,214,255,0.35),transparent_20%),radial-gradient(circle_at_78%_80%,rgba(180,171,255,0.22),transparent_22%),linear-gradient(135deg,#f8f7f3,#edf1f8_42%,#f8f7f3)]" />
      <div className="absolute inset-0 backdrop-blur-[80px]" />
      <LoginForm />
    </main>
  );
}
