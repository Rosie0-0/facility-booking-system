
//Start to implement UI
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
//Users
import Dashboard from './pages/student/Dashboard'
import BookingForm from './pages/student/BookingForm'
import BookingDetail from './pages/student/BookingDetail'
import MyBookings from './pages/student/MyBookings'
import Notifications from './pages/student/Notifications'
import UserAnnouncements from './pages/student/Announcements'
import Profile from './pages/student/Profile'
//Admin
import AdminDashboard from './pages/admin/Dashboard'
import ManageBookings from './pages/admin/ManageBookings'
import AdminFacilities from './pages/admin/ManageFacilities'
import AdminPenalties from './pages/admin/ManagePenalties'
import AdminAnnouncements from './pages/admin/Announcements'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Users */}
        <Route path="/"                    element={<Login />} />
        <Route path="/dashboard"           element={<Dashboard />} />
        <Route path="/bookings/new"        element={<BookingForm />} />
        <Route path="/bookings/:bookingId" element={<BookingDetail />} />
        <Route path="/bookings"            element={<MyBookings />}/>
        <Route path="/notifications"       element={<Notifications />}/>
        <Route path="/announcements"       element={<UserAnnouncements />}/>
        <Route path="/profile"             element={<Profile />}/>
        {/* Admin  */}
        <Route path="/admin/dashboard"     element={<AdminDashboard/>}/>
        <Route path="/admin/bookings"      element={<ManageBookings/>}/>
        <Route path="/admin/facilities"    element={<AdminFacilities />} />
        <Route path="/admin/penalties"     element={<AdminPenalties />} />
        <Route path="/admin/announcements" element={<AdminAnnouncements />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
