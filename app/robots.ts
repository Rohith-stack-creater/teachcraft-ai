import type { MetadataRoute } from 'next';

const siteUrl = 'https://teachcraft-ai-deploy-1.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/dashboard', '/lesson/', '/api/'] }],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
