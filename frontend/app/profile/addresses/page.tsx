import Link from "next/link";

import {
  deleteAddress,
  getAddresses,
  setDefaultAddress,
} from "@/lib/actions/address";

export default async function AddressesPage() {
  const addresses = await getAddresses();

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">

      <div className="flex items-center justify-between">

        <div>

          <h1 className="text-4xl font-bold">
            My Addresses
          </h1>

          <p className="mt-3 text-gray-500">
            Manage your delivery addresses.
          </p>

        </div>

        <Link
          href="/profile/addresses/new"
          className="
            rounded-xl
            bg-black
            px-6
            py-3
            font-semibold
            text-white
            transition
            hover:bg-gray-800
          "
        >
          + Add Address
        </Link>

      </div>

      {addresses.length === 0 ? (

        <div className="mt-16 rounded-2xl border p-10 text-center">

          <p className="text-lg text-gray-500">
            No saved addresses yet.
          </p>

        </div>

      ) : (

        <div className="mt-10 space-y-6">

          {addresses.map((address) => (

            <div
              key={address.id}
              className="rounded-2xl border p-6"
            >

              <div className="flex items-start justify-between">

                <div>

                  <h2 className="text-xl font-semibold">
                    {address.fullName}
                  </h2>

                  <p className="mt-2 text-gray-600">
                    {address.phone}
                  </p>

                  <p className="mt-3">
                    {address.addressLine1}
                  </p>

                  {address.addressLine2 && (
                    <p>{address.addressLine2}</p>
                  )}

                  <p>
                    {address.city}, {address.state}
                  </p>

                  <p>
                    {address.postalCode}
                  </p>

                  <p>{address.country}</p>

                  {address.isDefault && (
                    <span
                      className="
                        mt-4
                        inline-block
                        rounded-full
                        bg-green-100
                        px-3
                        py-1
                        text-sm
                        font-medium
                        text-green-700
                      "
                    >
                      Default Address
                    </span>
                  )}

                </div>

                <div className="flex flex-col gap-3">

                  {!address.isDefault && (

                    <form
                      action={async () => {
                        "use server";
                        await setDefaultAddress(address.id);
                      }}
                    >
                      <button
                        className="
                          rounded-lg
                          border
                          px-4
                          py-2
                          transition
                          hover:bg-gray-100
                        "
                      >
                        Make Default
                      </button>
                    </form>

                  )}

                  <form
                    action={async () => {
                      "use server";
                      await deleteAddress(address.id);
                    }}
                  >
                    <button
                      className="
                        rounded-lg
                        border
                        border-red-500
                        px-4
                        py-2
                        text-red-600
                        transition
                        hover:bg-red-50
                      "
                    >
                      Delete
                    </button>
                  </form>

                </div>

              </div>

            </div>

          ))}

        </div>

      )}

    </main>
  );
}