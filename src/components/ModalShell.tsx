import { motion } from 'framer-motion'

export default function ModalShell({
  title,
  onClose,
  children,
  wide,
  size,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  wide?: boolean
  size?: 'xl'
}) {
  const widthClass = size === 'xl' ? 'w-[min(1120px,95vw)]' : wide ? 'w-[560px]' : 'w-[440px]'
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={onClose}
    >
      <motion.div
        className={'bg-stage-850 border border-stage-700 rounded-2xl shadow-2xl p-6 ' + widthClass}
        initial={{ scale: 0.94, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 12 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 tool-btn rounded-md">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  )
}
