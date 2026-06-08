import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // 👈 이 줄이 누락되어 있다면 변수가 프로젝트에 주입되지 않습니다!
import { BrowserRouter } from 'react-router-dom';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
