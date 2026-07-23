import { useState, useEffect } from 'react'

export default function Popup() {
  const [leadCount, setLeadCount] = useState(0)
  const [capturing, setCapturing] = useState(false)

  // Get current lead count from side panel storage via background
  useEffect(() => {
    chrome.storage.session.get('leadCount', result => {
      setLeadCount(result.leadCount ?? 0)
    })
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if ('leadCount' in changes) setLeadCount(changes.leadCount.newValue ?? 0)
    }
    chrome.storage.session.onChanged.addListener(listener)
    return () => chrome.storage.session.onChanged.removeListener(listener)
  }, [])

  async function openPanel() {
    // chrome.sidePanel.open() MUST be called directly in a user-gesture handler
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id) await chrome.sidePanel.open({ tabId: tab.id })
    window.close()
  }

  async function capturePage() {
    setCapturing(true)
    // Open side panel first (must be in the same user-gesture call stack)
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id) await chrome.sidePanel.open({ tabId: tab.id })
    // Give the side panel time to mount and connect its port, then trigger extraction
    setTimeout(async () => {
      try {
        await chrome.runtime.sendMessage({ type: 'EXTRACT_PAGE' })
      } catch { /* side panel will read pendingCapture */ }
      setCapturing(false)
      window.close()
    }, 1000)
  }

  function clearSession() {
    if (confirm('Clear all leads in this session? This cannot be undone.')) {
      chrome.storage.session.set({ leadCount: 0, clearSession: Date.now() })
      setLeadCount(0)
    }
  }

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="bg-navy-600 px-4 py-3 flex items-center gap-2">
        <img src="../icons/icon48.png" alt="" className="w-6 h-6" />
        <span className="text-white font-bold text-base">LeadSnapper</span>
        {leadCount > 0 && (
          <span className="ml-auto bg-white text-navy-600 text-xs font-bold px-2 py-0.5 rounded-full">
            {leadCount}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="p-3 space-y-2">
        <button
          onClick={capturePage}
          disabled={capturing}
          className="w-full bg-navy-600 hover:bg-navy-700 text-white text-sm font-medium py-2.5 px-4 rounded-lg flex items-center gap-2 disabled:opacity-60"
        >
          <CaptureIcon />
          {capturing ? 'Capturing…' : 'Capture Current Page'}
        </button>

        <button
          onClick={openPanel}
          className="w-full bg-white hover:bg-navy-50 border border-navy-600 text-navy-600 text-sm font-medium py-2.5 px-4 rounded-lg flex items-center gap-2"
        >
          <PanelIcon />
          Open Lead Panel
        </button>

        {leadCount > 0 && (
          <div className="pt-1 border-t border-gray-100 flex gap-2">
            <button
              onClick={openPanel}
              className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-medium py-2 px-3 rounded-lg flex items-center gap-1"
            >
              <ExportIcon />
              Export Excel
            </button>
            <button
              onClick={clearSession}
              className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium py-2 px-3 rounded-lg flex items-center gap-1"
            >
              <TrashIcon />
              Clear Session
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-3 text-center">
        <p className="text-gray-400 text-xs">Configure brands in Settings</p>
      </div>
    </div>
  )
}

function CaptureIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 10l4.553-2.069A1 1 0 0121 8.87V15.13a1 1 0 01-1.447.899L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  )
}

function PanelIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 6h16M4 12h16M4 18h7" />
    </svg>
  )
}

function ExportIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}
