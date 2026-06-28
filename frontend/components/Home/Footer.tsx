export default function Footer() {
  return (
    <footer className="bg-[#111111] text-white">

      <div className="mx-auto max-w-7xl px-6 py-15">

        {/* Brand */}

        <div className="text-center">

          <h2 className="text-4xl font-bold">
            LAHI
          </h2>

          <p className="mt-4 text-lg text-gray-300">
            See Before You Buy.
          </p>

          <p className="mx-auto mt-6 max-w-2xl text-gray-400 leading-8">
            Experience fashion before you buy using intelligent
            virtual try-on technology designed to make online
            shopping more confident and personalized.
          </p>

        </div>

        {/* Links */}

        <div className="mt-20 grid gap-12 text-center md:grid-cols-4 md:text-left">

          <div>

            <h3 className="mb-5 text-lg font-semibold">
              Explore
            </h3>

            <ul className="space-y-3 text-gray-400">

              <li>Home</li>
              <li>Products</li>
              <li>Categories</li>

            </ul>

          </div>

          <div>

            <h3 className="mb-5 text-lg font-semibold">
              Company
            </h3>

            <ul className="space-y-3 text-gray-400">

              <li>About</li>
              <li>Careers</li>
              <li>Contact</li>

            </ul>

          </div>

          <div>

            <h3 className="mb-5 text-lg font-semibold">
              Resources
            </h3>

            <ul className="space-y-3 text-gray-400">

              <li>Documentation</li>
              <li>Privacy Policy</li>
              <li>Terms of Service</li>

            </ul>

          </div>

          <div>

            <h3 className="mb-5 text-lg font-semibold">
              Connect
            </h3>

            <ul className="space-y-3 text-gray-400">

              <li>GitHub</li>
              <li>LinkedIn</li>
              <li>Email</li>

            </ul>

          </div>

        </div>

        {/* Bottom */}

        <div className="mt-10 border-t border-gray-800 pt-8 text-center text-sm text-gray-500">

          © 2026 LAHI. Built with ❤️ using Next.js & TypeScript.

        </div>

      </div>

    </footer>
  );
}