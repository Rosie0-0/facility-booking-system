
//Start to implement UI
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/student/Dashboard'
import Facilities from './pages/student/Facilities'
import BookingForm from './pages/student/BookingForm'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/facilities" element={<Facilities />} />
        <Route path="/bookings/new" element={<BookingForm/>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
