import { AppBar, Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { Article, Gauge, Lightbulb, PaperPlaneTilt, Tag } from '@phosphor-icons/react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@api';
import MuiButton from '@components/MuiButton/MuiButton';
import { QK } from '@shared/constant/queryKeys';
import { ROUTE_PATHS } from '@shared/constant/route-paths';

const WIDTH = 220;
const ITEMS = [
  { to: ROUTE_PATHS.dashboard, key: 'nav.dashboard', Icon: Gauge, end: true },
  { to: ROUTE_PATHS.themes, key: 'nav.themes', Icon: Tag },
  { to: ROUTE_PATHS.topics, key: 'nav.topics', Icon: Lightbulb },
  { to: ROUTE_PATHS.articles, key: 'nav.articles', Icon: Article },
  { to: ROUTE_PATHS.publications, key: 'nav.publications', Icon: PaperPlaneTilt },
];

export default function MainLayout() {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const qc = useQueryClient();
  const session = useQuery({ queryKey: QK.authSession, queryFn: api.getAuthSession, staleTime: Infinity });
  const logout = useMutation({ mutationFn: api.logout, onSuccess: () => qc.invalidateQueries({ queryKey: QK.authSession }) });
  const active = (item) => (item.end ? pathname === item.to : pathname.startsWith(item.to));

  return (
    <Box sx={{ display: 'flex', minHeight: '100%' }}>
      <AppBar position="fixed" color="inherit" elevation={0} sx={{ zIndex: (th) => th.zIndex.drawer + 1, borderBottom: '1px solid rgba(0,0,0,.08)' }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight={800} color="primary">{t('app.title')}</Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {session.data?.authRequired && <MuiButton variant="text" size="sm" loading={logout.isPending} onClick={() => logout.mutate()}>{t('auth.logout')}</MuiButton>}
          <ToggleButtonGroup size="small" exclusive value={i18n.language?.slice(0, 2)} onChange={(_, v) => v && i18n.changeLanguage(v)}>
            <ToggleButton value="tr">TR</ToggleButton>
            <ToggleButton value="en">EN</ToggleButton>
          </ToggleButtonGroup>
          </Box>
        </Toolbar>
      </AppBar>
      <Drawer variant="permanent" sx={{ width: WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: WIDTH, boxSizing: 'border-box' } }}>
        <Toolbar />
        <List sx={{ px: 1 }}>
          {ITEMS.map((item) => (
            <ListItemButton key={item.to} component={NavLink} to={item.to} end={item.end} selected={active(item)} sx={{ borderRadius: 2, mb: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 36 }}><item.Icon size={20} /></ListItemIcon>
              <ListItemText primary={t(item.key)} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3, minWidth: 0 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
