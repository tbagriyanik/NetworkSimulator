'use client';

import { useParams } from 'next/navigation';
import Home from '../page';

export default function DynamicPage() {
  const params = useParams();
  const id = params.id as string;

  return <Home initialProjectId={id} />;
}
