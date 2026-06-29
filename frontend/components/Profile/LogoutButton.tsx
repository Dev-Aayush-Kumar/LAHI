"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const response = await fetch("/api/logout", {
      method: "POST",
    });

    if (!response.ok) {
      alert("Unable to logout.");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-xl bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-700"
    >
      Logout
    </button>
  );
}