interface MathLine {
  text: string
  indent?: number
  highlight?: 'result' | 'formula' | 'note'
  bold?: boolean
}

interface MathBlockProps {
  title?: string
  lines: MathLine[]
}

const highlightClass: Record<string, string> = {
  result:  'text-indigo-600 font-semibold',
  formula: 'text-slate-700',
  note:    'text-amber-600 italic',
}

export default function MathBlock({ title, lines }: MathBlockProps) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 overflow-x-auto">
      {title && (
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">{title}</p>
      )}
      <div className="font-mono text-sm space-y-0.5 whitespace-pre-wrap">
        {lines.map((line, i) => {
          const indent = line.indent ?? 0
          const cls = [
            line.highlight ? highlightClass[line.highlight] : 'text-slate-600',
            line.bold ? 'font-semibold' : '',
          ].join(' ')

          return (
            <div key={i} className={cls} style={{ paddingLeft: indent * 16 }}>
              {line.text}
            </div>
          )
        })}
      </div>
    </div>
  )
}
