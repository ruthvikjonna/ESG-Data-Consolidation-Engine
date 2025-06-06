'use client'

import { useState } from 'react'
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSuccess(false)

    const { error } = await supabase.from('esg_data').insert([
      {
        ...form,
        user_id: '9cd82ced-076a-4d17-a027-7d25878bbe0b',
      },
    ])

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
    try {
      const res = await fetch('/api/ingest/sap-mock', { method: 'POST' })
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

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Submit ESG Data</h1>
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
    </main>
  )
}
