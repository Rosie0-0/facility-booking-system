
//Start to implement UI
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/student/Dashboard'
import Facilities from './pages/student/Facilities'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/facilities" element={<Facilities />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
