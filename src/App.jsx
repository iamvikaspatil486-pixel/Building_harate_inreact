import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './components/Login'
import Home from './pages/home'
import Chat from './pages/chat.jsx'
import Navigation from './components/navigation.jsx'


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
         <Route path="/home" element={<Home/>}/>
        <Route path="/chat" element={<Chat/>}/>
      </Routes>
     <Navigation/>
    </BrowserRouter>
  )
}
