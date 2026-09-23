import Home from '../page';
import { exampleProjects } from '@/lib/network/exampleProjects';

export function generateStaticParams() {
  const projects = exampleProjects('en');
  return projects.map((p) => ({ id: p.id }));
}

interface DynamicPageProps {
  params: Promise<{ id: string }>;
}

export default async function DynamicPage({ params }: DynamicPageProps) {
  const { id } = await params;
  return <Home initialProjectId={id} />;
}

