"use client"

import React, { useState } from 'react'

export default function Home() {
  const [input, setInput] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [response, setResponse] = useState<string>('')
  const [error, setError] = useState<string>('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setResponse('')
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: input }),
      })
      if (!res.ok) throw new Error((await res.json()).error || res.statusText)
      const data = await res.json()
      setResponse(data.text ?? JSON.stringify(data))
    } catch (err: any) {
      setError(err.message || 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-amber-50 flex items-start justify-center py-16 px-4">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-semibold text-amber-700 mb-4">HandyDad AI</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm text-amber-600">Ask a question</span>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="mt-1 block w-full rounded-md border border-amber-200 bg-amber-50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
              rows={5}
              placeholder="Describe your repair or question..."
            />
          </label>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-white bg-amber-600 hover:bg-amber-700 focus:ring-2 focus:ring-amber-300 disabled:opacity-60`}
            >
              {loading && (
                <svg className="h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
              )}
              <span>{loading ? 'Thinking...' : 'Ask HandyDad'}</span>
            </button>

            <button
              type="button"
              onClick={() => { setInput(''); setResponse(''); setError('') }}
              className="px-3 py-2 rounded-md border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100"
            >
              Clear
            </button>
          </div>
        </form>

        {loading && (
          <div className="mt-4 text-amber-700 flex items-center gap-2">
            <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <span>Waiting for the AI...</span>
          </div>
        )}

        {response && (
          <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <h2 className="font-semibold mb-2">Response</h2>
            <div className="whitespace-pre-wrap text-sm">{response}</div>
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-red-800 flex items-start justify-between">
            <div className="text-sm">{error}</div>
            <button
              onClick={() => setError('')}
              className="ml-4 text-sm text-red-600 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
