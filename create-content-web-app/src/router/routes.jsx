import MainLayout from '@layouts/MainLayout';
import DashboardPage from '@features/dashboard/DashboardPage';
import ThemesPage from '@features/themes/ThemesPage';
import TopicsPage from '@features/topics/TopicsPage';
import ArticlesListPage from '@features/articles/ArticlesListPage';
import ArticleDetailPage from '@features/articles/ArticleDetailPage';
import PublicationsPage from '@features/publications/PublicationsPage';

export const routes = [
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'themes', element: <ThemesPage /> },
      { path: 'topics', element: <TopicsPage /> },
      { path: 'articles', element: <ArticlesListPage /> },
      { path: 'articles/:id', element: <ArticleDetailPage /> },
      { path: 'publications', element: <PublicationsPage /> },
    ],
  },
];
