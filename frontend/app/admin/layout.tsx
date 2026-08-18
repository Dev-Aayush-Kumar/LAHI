import { redirect } from "next/navigation";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <nav className="mb-8 flex flex-wrap gap-4 text-sm">
        <Link href="/admin">Overview</Link>
        <Link href="/admin/products">Products</Link>
        <Link href="/admin/inventory">Inventory</Link>
        <Link href="/admin/orders">Orders</Link>
        <Link href="/admin/customers">Customers</Link>
        <Link href="/admin/jobs">AI jobs</Link>
      </nav>
      {children}
    </div>
  );
}
