import { prisma } from "@/lib/prisma";

export default async function AdminJobsPage() {
  const jobs = await prisma.tryOnJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: { select: { email: true } },
      product: { select: { name: true } },
    },
  });

  return (
    <main>
      <h1 className="text-3xl font-bold">AI jobs</h1>
      <ul className="mt-6 space-y-3">
        {jobs.map((job) => (
          <li key={job.id} className="rounded-xl border bg-white p-4">
            {job.status} · {job.operation} · {job.user.email}
            {job.product ? ` · ${job.product.name}` : ""}
          </li>
        ))}
      </ul>
    </main>
  );
}
