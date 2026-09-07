import { useEffect } from 'react'
import { IconRadar, IconX } from '../Icons'
import './Sidebar.css'

export default function Sidebar({
  isOpen,
  onClose,
  chatHistory,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat
}) {

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Glassmorphic Backdrop */}
      <div
        className="sidebar-backdrop"
        onClick={onClose}
      />

      {/* Floating Drawer Card */}
      <aside
        className="sidebar-drawer"
        aria-label="Mission History Drawer"
      >
            <div className="sidebar-drawer__header">
              <div className="sidebar-drawer__brand">
                <div className="sidebar-drawer__logo" title="Epsilon Six Maritime Intelligence">
                  <img src="/epsilon-six-mark.png" alt="Epsilon Six" className="sidebar-drawer__logo-img" />
                </div>
                <div>
                  <div className="sidebar-drawer__title">SETU</div>
                  <div className="sidebar-drawer__sub">Maritime Decision Support</div>
                </div>
              </div>
              <button
                className="sidebar-drawer__close"
                onClick={onClose}
                aria-label="Close navigation menu"
              >
                &times;
              </button>
            </div>

            <button
              className="sidebar-drawer__new-chat"
              onClick={() => {
                onNewChat()
                onClose()
              }}
            >
              <span className="sidebar-drawer__plus">+</span> New Consultation
            </button>

            <div className="sidebar-drawer__section-label">Past Missions</div>

            <nav className="sidebar-drawer__history">
              {chatHistory && chatHistory.length > 0 ? (
                chatHistory.map((item) => (
                  <div
                    key={item.id}
                    className={`sidebar-drawer__item-row${
                      item.id === activeChatId ? ' sidebar-drawer__item-row--active' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelectChat(item.id)
                        onClose()
                      }}
                      className="sidebar-drawer__item"
                    >
                      <span className="sidebar-drawer__item-title">{item.title}</span>
                      <span className="sidebar-drawer__item-time">{item.time}</span>
                    </button>
                    {onDeleteChat && (
                      <button
                        type="button"
                        className="sidebar-drawer__delete-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteChat(item.id)
                        }}
                        title="Delete consultation record"
                        aria-label="Delete chat"
                      >
                        <IconX size={12} color="currentColor" />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ padding: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  No previous records
                </div>
              )}
            </nav>


            <div className="sidebar-drawer__footer">
              <div className="sidebar-drawer__avatar">P</div>
              <div>
                <div className="sidebar-drawer__user-name">Nautical Pilot</div>
                <div className="sidebar-drawer__user-status">Live Telemetry Active</div>
              </div>
            </div>
      </aside>
    </>
  )
}
