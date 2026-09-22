import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-muted-foreground">
          The link may be out of date, or the record may have been deleted.
        </p>
        <Link href="/" className="mt-6 inline-block text-primary underline">
          Go back
        </Link>
      </div>
    </div>
  );
}
