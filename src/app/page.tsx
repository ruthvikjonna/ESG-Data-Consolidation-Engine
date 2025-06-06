'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [form, setForm] = useState({
    company_name: '',
    metric_type: '',
    value: '',
    source_system: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [sapLoading, setSapLoading] = useState(false)
  const [sapResult, setSapResult] = useState<string | null>(null)
  const [authMode, setAuthMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [normalizedData, setNormalizedData] = useState<any[]>([])
  const [normalizedLoading, setNormalizedLoading] = useState(false)
  const [normalizedError, setNormalizedError] = useState<string | null>(null)
  const [workdayData, setWorkdayData] = useState<any[]>([])
  const [workdayLoading, setWorkdayLoading] = useState(false)
  const [workdayError, setWorkdayError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => {
      listener?.subscription.unsubscribe()
    }
  }, [])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError(null)
    if (authMode === 'sign-in') {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
      if (error) setAuthError(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword })
      if (error) setAuthError(error.message)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSuccess(false)
    const session = (await supabase.auth.getSession()).data.session
    const accessToken = session?.access_token
    const { error } = await fetch('/api/ingest', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ ...form }),
    }).then(res => res.json())
    setLoading(false)
    if (error) {
      console.error('Submission Error:', error)
      return
    }
    setForm({
      company_name: '',
      metric_type: '',
      value: '',
      source_system: '',
    })
    setSuccess(true)
  }

  const handleSapIngest = async () => {
    setSapLoading(true)
    setSapResult(null)
    const session = (await supabase.auth.getSession()).data.session
    const accessToken = session?.access_token
    try {
      const res = await fetch('/api/ingest/sap-mock', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      const data = await res.json()
      if (res.ok) {
        setSapResult(`SAP data ingested successfully! Rows: ${data.rows}`)
      } else {
        setSapResult(`Error: ${data.error || 'Unknown error'}`)
      }
    } catch (err: any) {
      setSapResult(`Error: ${err.message}`)
    } finally {
      setSapLoading(false)
    }
  }

  const fetchNormalizedData = async () => {
    setNormalizedLoading(true)
    setNormalizedError(null)
    try {
      const res = await fetch('/api/data/sap')
      const json = await res.json()
      if (res.ok) {
        setNormalizedData(json.data)
      } else {
        setNormalizedError(json.error || 'Failed to fetch normalized data')
      }
    } catch (err: any) {
      setNormalizedError(err.message)
    } finally {
      setNormalizedLoading(false)
    }
  }

  const fetchWorkdayData = async () => {
    setWorkdayLoading(true)
    setWorkdayError(null)
    try {
      const res = await fetch('/api/data/workday')
      const json = await res.json()
      if (res.ok) {
        setWorkdayData(json.data)
      } else {
        setWorkdayError(json.error || 'Failed to fetch Workday data')
      }
    } catch (err: any) {
      setWorkdayError(err.message)
    } finally {
      setWorkdayLoading(false)
    }
  }

  useEffect(() => {
    fetchNormalizedData()
    fetchWorkdayData()
  }, [])

  if (!user) {
    return (
      <main className="max-w-md mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">{authMode === 'sign-in' ? 'Sign In' : 'Sign Up'}</h1>
        <form onSubmit={handleAuth} className="space-y-4">
          <input type="email" placeholder="Email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full border p-2 rounded" required />
          <input type="password" placeholder="Password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full border p-2 rounded" required />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full">
            {authMode === 'sign-in' ? 'Sign In' : 'Sign Up'}
          </button>
          <button type="button" onClick={() => setAuthMode(authMode === 'sign-in' ? 'sign-up' : 'sign-in')} className="text-blue-600 underline w-full">
            {authMode === 'sign-in' ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}
          </button>
          {authError && <p className="text-red-600">{authError}</p>}
        </form>
      </main>
    )
  }

  return (
    <main className="max-w-md mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Submit ESG Data</h1>
        <button onClick={handleSignOut} className="text-sm text-gray-600 underline">Sign Out</button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {['company_name', 'metric_type', 'value', 'source_system'].map((field) => (
          <input
            key={field}
            type="text"
            name={field}
            placeholder={field.replace('_', ' ')}
            value={(form as any)[field]}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          />
        ))}
        <button
          type="submit"
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          {loading ? 'Submitting...' : 'Submit'}
        </button>
        {success && <p className="text-green-700">Data submitted successfully!</p>}
      </form>
      <div className="mt-8">
        <button
          onClick={handleSapIngest}
          disabled={sapLoading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
        >
          {sapLoading ? 'Connecting SAP...' : 'Connect SAP (Demo)'}
        </button>
        {sapResult && (
          <p className={sapResult.startsWith('Error') ? 'text-red-600 mt-2' : 'text-green-700 mt-2'}>
            {sapResult}
          </p>
        )}
      </div>
      <div className="mt-12">
        <h2 className="text-xl font-bold mb-2">Normalized Workday Employee Data</h2>
        <button onClick={fetchWorkdayData} className="mb-2 px-3 py-1 bg-gray-200 rounded">Refresh</button>
        {workdayLoading && <p>Loading...</p>}
        {workdayError && <p className="text-red-600">{workdayError}</p>}
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead>
              <tr>
                <th className="border px-2 py-1">Employee ID</th>
                <th className="border px-2 py-1">First Name</th>
                <th className="border px-2 py-1">Last Name</th>
                <th className="border px-2 py-1">Email</th>
                <th className="border px-2 py-1">Title</th>
                <th className="border px-2 py-1">Salary</th>
                <th className="border px-2 py-1">Currency</th>
                <th className="border px-2 py-1">Frequency</th>
                <th className="border px-2 py-1">Hire Date</th>
                <th className="border px-2 py-1">Birth Date</th>
                <th className="border px-2 py-1">Gender</th>
              </tr>
            </thead>
            <tbody>
              {workdayData.map((row, i) => (
                <tr key={row.id || i}>
                  <td className="border px-2 py-1">{row.employee_id}</td>
                  <td className="border px-2 py-1">{row.first_name}</td>
                  <td className="border px-2 py-1">{row.last_name}</td>
                  <td className="border px-2 py-1">{row.email}</td>
                  <td className="border px-2 py-1">{row.title}</td>
                  <td className="border px-2 py-1">{row.salary}</td>
                  <td className="border px-2 py-1">{row.currency}</td>
                  <td className="border px-2 py-1">{row.frequency}</td>
                  <td className="border px-2 py-1">{row.hire_date}</td>
                  <td className="border px-2 py-1">{row.birth_date}</td>
                  <td className="border px-2 py-1">{row.gender}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
