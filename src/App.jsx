
//Start to implement UI
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/student/Dashboard'
import Facilities from './pages/student/Facilities'
import BookingForm from './pages/student/BookingForm'
import BookingDetail from './pages/student/BookingDetail'
import MyBookings from './pages/student/MyBookings'
import Notifications from './pages/student/Notifications'
import Profile from './pages/student/Profile'
import AdminDashboard from './pages/admin/Dashboard'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/facilities" element={<Facilities />} />
        <Route path="/bookings/new" element={<BookingForm />} />
        <Route path="/bookings/:bookingId" element={<BookingDetail />} />
        <Route path="/bookings" element={<MyBookings />}/>
        <Route path="notifications" element={<Notifications />}/>
        <Route path="/profile" element={<Profile />}/>
        <Route path="/admin/dashboard" element={<AdminDashboard/>}/>
      </Routes>
    </BrowserRouter>
  )
}

export default App
