"use client";

import { useState, type FormEvent } from "react";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSignup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    console.log("Signup button clicked");

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          email,
          password,
        }),
      });

      const data = await response.json();

      console.log("API Response:", data);

      if (!response.ok) {
        alert(data.message ?? "Signup failed.");
        return;
      }

      alert(data.message ?? "Account created successfully!");
    } catch (error) {
      console.error("Signup Error:", error);
      alert("Unable to connect to the server.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8F6F2] px-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-10 shadow-xl">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-[#111111]">
            Create Your Account
          </h1>

          <p className="mt-3 text-gray-600">
            Join LAHI and experience personalized virtual fashion.
          </p>
        </div>

        <form onSubmit={handleSignup} className="mt-10 space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Full Name
            </label>

            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-black"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-black"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-black"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-black py-3 font-semibold text-white transition hover:opacity-90"
          >
            Create Account
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <a
            href="/login"
            className="font-semibold text-black hover:underline"
          >
            Login
          </a>
        </p>
      </div>
    </main>
  );
}