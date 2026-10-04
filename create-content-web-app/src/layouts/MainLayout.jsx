import { Outlet, NavLink } from 'react-router-dom';
import { Box, Drawer, List, ListItemButton, ListItemText, Toolbar, AppBar, Typography } from '@mui/material';

const NAV_ITEMS = [
  { to: '/', label: 'Panel' },
  { to: '/themes', label: 'Temalar' },
  { to: '/topics', label: 'Konu Kuyrugu' },
  { to: '/articles', label: 'Makaleler' },
  { to: '/publications', label: 'Yayinlar' },
];

const DRAWER_WIDTH = 220;

const MainLayout = () => (
  <Box sx={{ display: 'flex' }}>
    <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
      <Toolbar>
        <Typography variant="h6">create-content</Typography>
      </Toolbar>
    </AppBar>
    <Drawer variant="permanent" sx={{ width: DRAWER_WIDTH, [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH } }}>
      <Toolbar />
      <List>
        {NAV_ITEMS.map((item) => (
          <ListItemButton key={item.to} component={NavLink} to={item.to} end={item.to === '/'}>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Drawer>
    <Box component="main" sx={{ flexGrow: 1, mt: 8 }}>
      <Outlet />
    </Box>
  </Box>
);

export default MainLayout;
