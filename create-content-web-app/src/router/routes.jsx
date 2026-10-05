import { lazy } from 'react';
import { ROUTE_PATHS } from '@shared/constant/route-paths';
import MainLayout from '@layouts/MainLayout';

const DashboardPage = lazy(() => import('@features/dashboard/DashboardPage'));
const ThemesPage = lazy(() => import('@features/themes/ThemesPage'));
const TopicsPage = lazy(() => import('@features/topics/TopicsPage'));
const ArticlesPage = lazy(() => import('@features/articles/ArticlesPage'));
const ArticleDetailPage = lazy(() => import('@features/articles/ArticleDetailPage'));
const PublicationsPage = lazy(() => import('@features/publications/PublicationsPage'));

export const routes = [
  {
    element: <MainLayout />,
    children: [
      { path: ROUTE_PATHS.dashboard, element: <DashboardPage /> },
      { path: ROUTE_PATHS.themes, element: <ThemesPage /> },
      { path: ROUTE_PATHS.topics, element: <TopicsPage /> },
      { path: ROUTE_PATHS.articles, element: <ArticlesPage /> },
      { path: ROUTE_PATHS.article(), element: <ArticleDetailPage /> },
      { path: ROUTE_PATHS.publications, element: <PublicationsPage /> },
      { path: '*', element: <DashboardPage /> },
    ],
  },
];
