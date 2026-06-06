import { useNavigate } from 'react-router-dom'

export default function Footer() {
  const navigate = useNavigate()

  return (
    <footer id="footer" className="bg-gray-900 text-white mt-16 py-10">
      <div className="max-w-7xl mx-auto px-12 grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* Logo */}
        <div>
          <p className="text-gray-400 text-sm">
            Campus Facility Booking & Management System
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="font-semibold mb-4 text-sm">Quick Links</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li
              className="hover:text-white cursor-pointer"
              onClick={() => navigate('/facilities')}
            >
              Facilities
            </li>
            <li
              className="hover:text-white cursor-pointer"
              onClick={() => navigate('/bookings')}
            >
              My Bookings
            </li>
            <li
              className="hover:text-white cursor-pointer"
              onClick={() => navigate('/notifications')}
            >
              Notifications
            </li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-semibold mb-4 text-sm">Contact Us</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li>📍 Lebuh Bukit Jambul, 11900 Penang</li>
            <li>📞 +604-630 8888</li>
            <li>✉️ info@newinti.edu.my</li>
          </ul>
        </div>

      </div>

      <div className="border-t border-gray-700 mt-8 pt-6 text-center text-xs text-gray-500">
        © 2026 INTI International College Penang. All Rights Reserved.
      </div>
    </footer>
  )
}