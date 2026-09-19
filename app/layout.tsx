import './globals.css';
import './phase3.css';
import './reliability.css';

export const metadata = {
  metadataBase: new URL('https://teachcraft-ai-deploy-1.vercel.app'),
  title: 'TeachCraft AI — Lesson Planner for University Lecturers',
  description: 'Turn your expertise into clear, level-appropriate lesson plans, activities, and assessments with TeachCraft AI.',
  keywords: ['AI lesson planner', 'university lesson planning', 'lesson plan generator', 'teaching activities', 'assessment rubric generator'],
  verification: { google: 'eYY4fGRqDtznc-VMaRDk3fmAbFKSV1X8Y-o5srgqLyw' },
  openGraph: {
    title: 'TeachCraft AI — Lesson Planner for University Lecturers',
    description: 'Create teachable lesson plans, activities, and assessments from your expertise.',
    url: 'https://teachcraft-ai-deploy-1.vercel.app',
    siteName: 'TeachCraft AI',
    type: 'website',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
