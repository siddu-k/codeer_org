// Test file to debug Supabase connection
// Add this to src/pages/test-supabase.tsx temporarily

import { supabase } from '../lib/supabase'
import { useEffect, useState } from 'react'

export default function TestSupabase() {
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<any>(null)
  const [urlTests, setUrlTests] = useState<any>({})

  useEffect(() => {
    async function testConnection() {
      const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      console.log('Testing Supabase connection...')
      console.log('Base URL:', baseUrl)
      
      // Test different endpoints
      const tests = {
        base: `${baseUrl}/`,
        rest: `${baseUrl}/rest/v1/`,
        auth: `${baseUrl}/auth/v1/`,
        teamup: `${baseUrl}/rest/v1/teamup_posts`
      }
      
      const testResults: any = {}
      
      for (const [name, url] of Object.entries(tests)) {
        try {
          console.log(`Testing ${name}: ${url}`)
          const response = await fetch(url)
          testResults[name] = {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            headers: {
              'content-type': response.headers.get('content-type'),
              'access-control-allow-origin': response.headers.get('access-control-allow-origin')
            }
          }
          
          if (name === 'rest') {
            const text = await response.text()
            testResults[name].preview = text.substring(0, 200)
          }
        } catch (err: any) {
          testResults[name] = {
            error: err.message,
            type: err.name
          }
        }
      }
      
      setUrlTests(testResults)
      
      // Test Supabase client
      try {
        const { data, error } = await supabase
          .from('teamup_posts')
          .select('count')
          .limit(1)
        
        if (error) {
          console.error('Supabase Error:', error)
          setError(error)
        } else {
          console.log('Success:', data)
          setResult(data)
        }
      } catch (err) {
        console.error('Network Error:', err)
        setError(err)
      }
    }
    
    testConnection()
  }, [])

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Supabase Connection Test</h1>
      <p><strong>URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
      
      <h2>URL Endpoint Tests:</h2>
      {Object.entries(urlTests).map(([name, test]: [string, any]) => (
        <div key={name} style={{ 
          background: test.error ? '#ffebee' : test.ok ? '#e8f5e8' : '#fff3e0', 
          padding: '10px', 
          margin: '5px 0',
          border: '1px solid #ccc'
        }}>
          <h4>{name.toUpperCase()}</h4>
          <pre style={{ fontSize: '12px' }}>{JSON.stringify(test, null, 2)}</pre>
        </div>
      ))}
      
      <h2>Supabase Client Test:</h2>
      {error && (
        <div style={{ background: '#ffebee', padding: '10px', marginTop: '10px' }}>
          <h3>Error:</h3>
          <pre>{JSON.stringify(error, null, 2)}</pre>
        </div>
      )}
      
      {result && (
        <div style={{ background: '#e8f5e8', padding: '10px', marginTop: '10px' }}>
          <h3>Success:</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
      
      <h2>Diagnosis:</h2>
      <div style={{ background: '#f5f5f5', padding: '15px', marginTop: '10px' }}>
        <h4>🔍 Issues Found:</h4>
        <ul>
          <li><strong>Blank Page at db.codeer.org:</strong> Your Supabase instance is not running properly</li>
          <li><strong>Missing PostgREST API:</strong> The /rest/v1/ endpoint should return API documentation</li>
          <li><strong>Self-Hosted Setup Issue:</strong> Your Supabase stack needs configuration</li>
        </ul>
        
        <h4>🛠️ Solutions:</h4>
        <ol>
          <li><strong>Check Docker containers:</strong> Ensure all Supabase services are running</li>
          <li><strong>Verify domain configuration:</strong> db.codeer.org should point to your Supabase instance</li>
          <li><strong>Check reverse proxy:</strong> Nginx/Apache should route to Supabase services</li>
          <li><strong>Review logs:</strong> Check Supabase, PostgREST, and web server logs</li>
        </ol>
      </div>
    </div>
  )
}
