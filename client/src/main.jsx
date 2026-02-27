import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css'
import TeacherDashboard from './pages/TeacherDashboard.jsx';
import StudentView from './pages/StudentView.jsx';
import Home from './pages/Home.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/teacher" element={<TeacherDashboard />} />
        <Route path="/student" element={<StudentView />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
