'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import path from 'path'

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
      const filePath = path.join(process.cwd(), 'data', 'sap-profitcenter-sample.csv')
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
    <main className="max-w-4xl mx-auto p-2">
      <div className="flex flex-col items-center mb-2">
        <h1 className="text-2xl font-bold text-center">ESG Data Dashboard</h1>
        <button onClick={handleSignOut} className="text-sm text-gray-600 underline self-end mt-1">Sign Out</button>
      </div>
      <div className="flex flex-col items-center gap-1 mt-2 mb-2">
        <button
          onClick={handleWorkdayIngest}
          disabled={workdayIngestLoading}
          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 w-64"
        >
          {workdayIngestLoading ? 'Connecting Workday...' : 'Connect Workday (Demo)'}
        </button>
        <button
          onClick={handleSapIngest}
          disabled={sapLoading}
          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 w-64"
        >
          {sapLoading ? 'Connecting SAP...' : 'Connect SAP (Demo)'}
        </button>
        {sapResult && (
          <p className={sapResult.startsWith('Error') ? 'text-red-600 mt-1 text-center' : 'text-green-700 mt-1 text-center'}>
            {sapResult}
          </p>
        )}
        {workdayIngestResult && (
          <p className={workdayIngestResult.startsWith('Error') ? 'text-red-600 mt-1 text-center' : 'text-green-700 mt-1 text-center'}>
            {workdayIngestResult}
          </p>
        )}
      </div>
      <div className="flex flex-col md:flex-row gap-2">
        {/* Workday Table */}
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold mb-1">Normalized Workday Employee Data</h2>
          <button onClick={fetchWorkdayData} className="mb-1 px-2 py-1 bg-gray-200 rounded text-xs">Refresh</button>
          {workdayLoading && <p>Loading...</p>}
          {workdayError && <p className="text-red-600">{workdayError}</p>}
          <div className="overflow-x-auto">
            <table className="min-w-full border text-xs">
              <thead>
                <tr>
                  <th className="border px-1 py-1">Employee ID</th>
                  <th className="border px-1 py-1">First Name</th>
                  <th className="border px-1 py-1">Last Name</th>
                  <th className="border px-1 py-1">Email</th>
                  <th className="border px-1 py-1">Title</th>
                  <th className="border px-1 py-1">Salary</th>
                  <th className="border px-1 py-1">Currency</th>
                  <th className="border px-1 py-1">Frequency</th>
                  <th className="border px-1 py-1">Hire Date</th>
                  <th className="border px-1 py-1">Birth Date</th>
                  <th className="border px-1 py-1">Gender</th>
                </tr>
              </thead>
              <tbody>
                {workdayData.map((row, i) => (
                  <tr key={row.id || i}>
                    <td className="border px-1 py-1">{row.employee_id}</td>
                    <td className="border px-1 py-1">{row.first_name}</td>
                    <td className="border px-1 py-1">{row.last_name}</td>
                    <td className="border px-1 py-1">{row.email}</td>
                    <td className="border px-1 py-1">{row.title}</td>
                    <td className="border px-1 py-1">{row.salary}</td>
                    <td className="border px-1 py-1">{row.currency}</td>
                    <td className="border px-1 py-1">{row.frequency}</td>
                    <td className="border px-1 py-1">{row.hire_date}</td>
                    <td className="border px-1 py-1">{row.birth_date}</td>
                    <td className="border px-1 py-1">{row.gender}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {/* SAP Table */}
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold mb-1">Normalized SAP Profit Center Data</h2>
          <button onClick={fetchNormalizedData} className="mb-1 px-2 py-1 bg-gray-200 rounded text-xs">Refresh</button>
          {normalizedLoading && <p>Loading...</p>}
          {normalizedError && <p className="text-red-600">{normalizedError}</p>}
          <div className="overflow-x-auto">
            <table className="min-w-full border text-xs">
              <thead>
                <tr>
                  <th className="border px-1 py-1">Profit Center ID</th>
                  <th className="border px-1 py-1">Language</th>
                  <th className="border px-1 py-1">Created By</th>
                  <th className="border px-1 py-1">Created At</th>
                  <th className="border px-1 py-1">Changed By</th>
                  <th className="border px-1 py-1">Changed At</th>
                </tr>
              </thead>
              <tbody>
                {normalizedData.map((row, i) => (
                  <tr key={row.id || i}>
                    <td className="border px-1 py-1">{row.profit_center_id || row.PROFITCENTERID}</td>
                    <td className="border px-1 py-1">{row.language}</td>
                    <td className="border px-1 py-1">{row.created_by}</td>
                    <td className="border px-1 py-1">{row.created_at}</td>
                    <td className="border px-1 py-1">{row.changed_by}</td>
                    <td className="border px-1 py-1">{row.changed_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
