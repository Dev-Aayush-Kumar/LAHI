export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#F8F6F2] flex items-center justify-center px-6">

      <div className="w-full max-w-md rounded-3xl bg-white p-10 shadow-xl">

        <div className="text-center">

          <h1 className="text-4xl font-bold text-[#111111]">
            Welcome Back
          </h1>

          <p className="mt-3 text-gray-600">
            Sign in to continue your personalized shopping experience.
          </p>

        </div>

        <form className="mt-10 space-y-6">

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Email
            </label>

            <input
              type="email"
              placeholder="Enter your email"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-black"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Password
            </label>

            <input
              type="password"
              placeholder="Enter your password"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-black"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-black py-3 font-semibold text-white transition hover:opacity-90"
          >
            Login
          </button>

        </form>

        <p className="mt-8 text-center text-sm text-gray-600">
          Don't have an account?
          <span className="ml-2 cursor-pointer font-semibold text-black hover:underline">
            Sign Up
          </span>
        </p>

      </div>

    </main>
  );
}