/**
 * Sign in, register, recover a password, and the one-time first-run setup.
 *
 * Centred on a plain background with the company's logo above the card, the
 * way the current login page is laid out.
 */
import { getBranding } from "@/lib/auth/session";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const branding = await getBranding();

  return (
    <div className="min-h-dvh grid place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          {branding.logoUrl === null ? (
            <span className="font-[family-name:var(--font-chakra)] text-2xl font-bold tracking-tight">
              {branding.companyName}
            </span>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element --
               the logo is user-uploaded and served from our own API, whose
               dimensions we do not know ahead of time. */
            <img
              src={branding.logoUrl}
              alt={branding.companyName}
              className="h-12 w-auto object-contain"
            />
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
