import { useEffect, useRef } from 'react'
import './CodeBlock.css'

interface Props {
  code: string
  language?: string
}

// Simple syntax highlighter for Rust without external dependency
function highlightRust(code: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const keywords = /\b(fn|let|mut|pub|use|mod|impl|struct|enum|trait|for|in|if|else|while|loop|return|match|self|Self|super|crate|type|where|const|static|move|async|await|dyn|ref|as|break|continue|Box|Option|Result|Some|None|Ok|Err|Vec|String|str|i8|i16|i32|i64|i128|isize|u8|u16|u32|u64|u128|usize|f32|f64|bool|char)\b/g
  const strings = /("[^"]*")/g
  const comments = /(^\/\/.*$)/gm
  const macros = /\b(\w+!)/g
  const numbers = /\b(\d+(?:\.\d+)?)\b/g
  const lifetime = /('\w+)/g

  let result = escape(code)
  result = result.replace(comments, '<span class="c-comment">$1</span>')
  result = result.replace(strings, '<span class="c-string">$1</span>')
  result = result.replace(lifetime, '<span class="c-lifetime">$1</span>')
  result = result.replace(keywords, '<span class="c-kw">$1</span>')
  result = result.replace(macros, '<span class="c-macro">$1</span>')
  result = result.replace(numbers, '<span class="c-num">$1</span>')
  return result
}

export default function CodeBlock({ code, language = 'rust' }: Props) {
  return (
    <div className="code-wrapper">
      <div className="code-lang">{language}</div>
      <pre
        className="code-block"
        dangerouslySetInnerHTML={{ __html: highlightRust(code) }}
      />
    </div>
  )
}
