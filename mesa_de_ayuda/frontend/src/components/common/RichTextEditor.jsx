import React, { useRef, useEffect } from 'react';

export default function RichTextEditor({ value, onChange, placeholder, disabled }) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command, val = null) => {
    document.execCommand(command, false, val);
    handleInput();
  };

  return (
    <div className={`rich-editor-container ${disabled ? 'disabled' : ''}`} style={{ marginBottom: '1rem' }}>
      <style>{`
        .editor-toolbar {
          display: flex;
          gap: 6px;
          padding: 8px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-bottom: none;
          border-radius: 8px 8px 0 0;
          flex-wrap: wrap;
        }
        .editor-toolbar button {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid transparent;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          color: #475569;
          transition: all 0.2s ease;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .editor-toolbar button:hover {
          background: #e2e8f0;
          color: #0f172a;
          transform: translateY(-1px);
        }
        .editor-toolbar button:active {
          transform: translateY(0);
        }
        .editor-content:empty:before {
          content: attr(placeholder);
          color: #94a3b8;
        }
      `}</style>
      <div className="editor-toolbar">
        <button type="button" onClick={() => execCommand('bold')} title="Negrita"><strong>B</strong></button>
        <button type="button" onClick={() => execCommand('italic')} title="Cursiva"><em>I</em></button>
        <button type="button" onClick={() => execCommand('underline')} title="Subrayado"><u>U</u></button>
        <div style={{ width: '1px', height: '20px', background: '#e2e8f0', margin: '6px 4px' }} />
        <button type="button" onClick={() => execCommand('insertUnorderedList')} title="Lista viñetas">•</button>
        <button type="button" onClick={() => execCommand('insertOrderedList')} title="Lista numerada">1.</button>
      </div>
      <div
        ref={editorRef}
        className="editor-content"
        contentEditable={!disabled}
        onInput={handleInput}
        placeholder={placeholder || 'Escribe los detalles aquí...'}
        style={{
          minHeight: '150px',
          border: '1px solid #e2e8f0',
          borderRadius: '0 0 8px 8px',
          padding: '16px',
          backgroundColor: disabled ? '#f8fafc' : 'white',
          outline: 'none',
          fontSize: '0.95rem',
          lineHeight: '1.5',
          color: '#334155'
        }}
      />
    </div>
  );
}
