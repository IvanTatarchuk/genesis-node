import { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://agents-dev.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/marketplace", "/agents/", "/pricing", "/leaderboard", "/become-developer", "/dev/"],
        disallow: ["/dashboard", "/api/", "/trinity", "/trinity-watch", "/tasks/", "/pipelines/"],
      },
      {
        userAgent: "GPTBot",
        disallow: ["/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host:    BASE_URL,
  };
}
