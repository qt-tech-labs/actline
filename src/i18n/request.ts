import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { PROJECT_TZ } from "@/lib/day";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "./config";

// No locale in the URL: the locale comes from a cookie, so routes stay stable for every language.
export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;
  return {
    locale,
    timeZone: PROJECT_TZ,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
