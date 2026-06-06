import React from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Box, CssBaseline } from '@mui/material';
import Main from './components/Main';
import Sub from './components/Sub';
import Menu from './components/Menu'; 
import Login from './components/Login'; 
import SignUp from './components/SignUp'; 
import PhotoPage from './components/PhotoPage'; 
import PhotoDetail from './components/PhotoDetail';
import PostPage from './components/PostPage';
import PostDetail from './components/PostDetail';
import Upload from './components/Upload';
import Follow from './components/Follow';
import Photog from './components/Photog';


function App() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/signup';

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Routes>
          <Route path="/" element={<Main />} />
          <Route path="/sub" element={<Sub />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/photo" element={<PhotoPage />} />
          <Route path="/photo/:id" element={<PhotoDetail />} />
          <Route path="/post" element={<PostPage />} />
          <Route path="/post/:id" element={<PostDetail />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/follow" element={<Follow />} />
          <Route path="/photograper" element={<Photog />} />
        </Routes>
      </Box>
    </Box>
  );
}

export default App;
