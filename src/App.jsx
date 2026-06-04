
// import { useEffect } from 'react'
// import { supabase } from './lib/supabase'

// function App() {
//   useEffect(() => {
//     testConnection()
//   }, [])

//   async function testConnection() {
//     const { data, error } = await supabase
//       .from('campus_members')
//       .select('*')

//     console.log('DATA:', data)

//     if(error){
//       console.log('ERROR CODE:', error.code)
//       console.log('ERROR MESSAGE:', error.message)
//       console.log('ERROR DETAILS:', error.details)
//       console.log('FULL ERROR:', error)
//     }
//   }

//   return (
//     <div className="min-h-screen flex items-center justify-center">
//       <h1 className="text-3xl font-bold">
//         Testing Supabase Connection...
//       </h1>
//     </div>
//   )
// }

// export default App

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
