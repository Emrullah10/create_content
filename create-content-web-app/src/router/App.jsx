import { Suspense } from 'react';
import { useRoutes } from 'react-router-dom';
import LoadingBlock from '@components/LoadingBlock/LoadingBlock';
import { routes } from './routes';

export default function App() {
  return <Suspense fallback={<LoadingBlock />}>{useRoutes(routes)}</Suspense>;
}
