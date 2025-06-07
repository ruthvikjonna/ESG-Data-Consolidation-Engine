'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
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
  const [workdayIngestLoading, setWorkdayIngestLoading] = useState(false)
  const [workdayIngestResult, setWorkdayIngestResult] = useState<string | null>(null)

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

  const handleSapIngest = async () => {
    setSapLoading(true)
    setSapResult(null)
    const session = (await supabase.auth.getSession()).data.session
    const accessToken = session?.access_token
    try {
      const res = await fetch('/api/ingest/sap', {
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

  const handleWorkdayIngest = async () => {
    setWorkdayIngestLoading(true)
    setWorkdayIngestResult(null)
    const session = (await supabase.auth.getSession()).data.session
    const accessToken = session?.access_token
    try {
      const res = await fetch('/api/ingest/workday', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      const data = await res.json()
      if (res.ok) {
        setWorkdayIngestResult(`Workday data ingested successfully! Rows: ${data.rows}`)
      } else {
        setWorkdayIngestResult(`Error: ${data.error || 'Unknown error'}`)
      }
    } catch (err: any) {
      setWorkdayIngestResult(`Error: ${err.message}`)
    } finally {
      setWorkdayIngestLoading(false)
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
        <h1 className="text-2xl font-bold">ESG Data Dashboard</h1>
        <button onClick={handleSignOut} className="text-sm text-gray-600 underline">Sign Out</button>
      </div>
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
        <button
          onClick={handleWorkdayIngest}
          disabled={workdayIngestLoading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 w-full mt-4"
        >
          {workdayIngestLoading ? 'Connecting Workday...' : 'Connect Workday (Demo)'}
        </button>
        {workdayIngestResult && (
          <p className={workdayIngestResult.startsWith('Error') ? 'text-red-600 mt-2' : 'text-green-700 mt-2'}>
            {workdayIngestResult}
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

function normalizeWorkdayRecord(record: any) {
  const rec = Array.isArray(record.data) ? record.data[0] : record;
  return {
    employee_id: rec.Worker_Reference_Employee_ID || null,
    first_name: rec.Worker_Data?.Personal_Data?.Name_Data?.Legal_Name_Data?.Name_Detail_Data?.First_Name || null,
    last_name: rec.Worker_Data?.Personal_Data?.Name_Data?.Legal_Name_Data?.Name_Detail_Data?.Last_Name || null,
    email: rec.Worker_Data?.Personal_Data?.Contact_Data?.Email_Address_Data?.[0]?.Email_Address || null,
    title: rec.Worker_Data?.Employment_Data?.Worker_Job_Data?.[0]?.Position_Data?.Position_Title || null,
    salary: rec.Worker_Data?.Compensation_Data?.Salary_and_Hourly_Data?.[0]?.Amount || null,
    currency: rec.Worker_Data?.Compensation_Data?.Salary_and_Hourly_Data?.[0]?.Currency_Reference_Currency_ID || null,
    frequency: rec.Worker_Data?.Compensation_Data?.Salary_and_Hourly_Data?.[0]?.Frequency_Reference_Frequency_ID || null,
    hire_date: rec.Worker_Data?.Employment_Data?.Worker_Status_Data?.Hire_Date || null,
    birth_date: rec.Worker_Data?.Personal_Data?.Birth_Date || null,
    gender: rec.Worker_Data?.Personal_Data?.Gender_Reference_Gender_Code || null,
    original_data: record,
  };
}
