import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

function App() {
  const [status, setStatus] = useState("Checking connection...")
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    async function checkConnection() {
      try {
        // 1. Check if the URL/Key format is valid by asking for the current session
        // This doesn't need any tables to exist.
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          throw error
        }

        setStatus("Connected to Supabase! 🟢")
        
      } catch (err) {
        console.error(err)
        setStatus("Connection Failed 🔴")
        setErrorMsg(err.message || "Unknown error")
      }
    }
    checkConnection()
  }, [])

  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>CircuitSimWeb</h1>
      
      <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h3>System Status:</h3>
        <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{status}</p>
        
        {errorMsg && (
          <div style={{ backgroundColor: '#fee', color: '#c00', padding: '10px', borderRadius: '4px' }}>
            <strong>Error Details:</strong> {errorMsg}
          </div>
        )}
      </div>

      <p style={{ marginTop: '20px', color: '#666' }}>
        Current Step: Configuring Database Connection
      </p>
    </div>
  )
}

export default App