import React from 'react';
import { Drawer, List, ListItem, ListItemText, Typography, Toolbar, ListItemIcon } from '@mui/material';
import { Home } from '@mui/icons-material';
import { Link } from 'react-router-dom';

function Menu() {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 240, 
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 240, 
          boxSizing: 'border-box',
        },
      }}
    >
      <Toolbar />
      <Typography variant="h6" component="div" sx={{ p: 2 }}>
        SNS 메뉴
      </Typography>
      <List>
        <ListItem button component={Link} to="/sub">
          <ListItemIcon>
            <Home />
          </ListItemIcon>
          <ListItemText primary="서브" />
        </ListItem>
      </List>
      
    </Drawer>
  );
};

export default Menu;