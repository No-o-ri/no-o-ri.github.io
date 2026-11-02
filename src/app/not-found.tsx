import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-x grid min-h-[70vh] place-items-center pt-24 text-center">
      <div>
        <p className="eyebrow">Error 404</p>
        <h1 className="display mt-4">Signal lost.</h1>
        <p className="mx-auto mt-6 max-w-md text-muted">
          This trace doesn&apos;t lead anywhere. Head back to a route that does.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-md border border-accent px-5 py-2.5 text-accent transition-colors hover:bg-accent hover:text-bg"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}
