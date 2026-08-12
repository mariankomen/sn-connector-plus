import React, { useRef, useEffect, useState } from 'react';
import styles from './RichTextEditor.module.css';

interface RichTextEditorProps {
  field: {
    name: string;
    label: string;
    required?: boolean;
  };
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ field, value, onChange, required }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

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

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      handleInput();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    handleInput();
  };

  return (
    <div className={styles.richTextContainer}>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={() => execCommand('bold')}
          title="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={() => execCommand('italic')}
          title="Italic"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={() => execCommand('underline')}
          title="Underline"
        >
          <u>U</u>
        </button>
        <div className={styles.toolbarSeparator}></div>
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={() => execCommand('formatBlock', '<p>')}
          title="Paragraph"
        >
          P
        </button>
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={() => execCommand('formatBlock', '<h1>')}
          title="Heading 1"
        >
          H1
        </button>
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={() => execCommand('formatBlock', '<h2>')}
          title="Heading 2"
        >
          H2
        </button>
        <div className={styles.toolbarSeparator}></div>
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={() => execCommand('insertUnorderedList')}
          title="Bullet List"
        >
          •
        </button>
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={() => execCommand('insertOrderedList')}
          title="Numbered List"
        >
          1.
        </button>
        <div className={styles.toolbarSeparator}></div>
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={() => execCommand('createLink', prompt('Enter URL:') || undefined)}
          title="Insert Link"
        >
          🔗
        </button>
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={() => execCommand('removeFormat')}
          title="Remove Formatting"
        >
          Clear
        </button>
      </div>
      <div
        ref={editorRef}
        className={`${styles.editor} ${isFocused ? styles.editorFocused : ''}`}
        contentEditable
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onPaste={handlePaste}
        data-placeholder={`Enter ${field.label}...`}
        suppressContentEditableWarning
      />
      {required && !value && (
        <div className={styles.requiredHint}>This field is required</div>
      )}
    </div>
  );
};

export default RichTextEditor;

