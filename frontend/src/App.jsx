import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import ViewContent from './pages/ViewContent'
import Login from './pages/Login'
import Signup from './pages/Signup'
import MyLinks from './pages/MyLinks'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/content/:id" element={<ViewContent />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/my-links" element={<MyLinks />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
