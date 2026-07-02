import StudentNavbar from './StudentNavbar'

export default function StudentLayout({ user, children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <StudentNavbar user={user} />
      <main>{children}</main>
    </div>
  )
}
