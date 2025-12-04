import React, { useState, useRef, useEffect } from 'react';

interface InlineEditableTextProps {
  value: string;
  onSave: (newValue: string) => void;
  className?: string;
  multiline?: boolean;
  placeholder?: string;
}

const InlineEditableText: React.FC<InlineEditableTextProps> = ({
  value,
  onSave,
  className = '',
  multiline = false,
  placeholder = 'Clique para editar...'
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editValue.trim() !== value) {
      onSave(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Enter' && e.ctrlKey && multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (isEditing) {
        handleSave();
      }
    }, 150);
  };

  if (isEditing) {
    return multiline ? (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={`w-full px-2 py-1 border border-primary-500 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 ${className}`}
        rows={3}
        placeholder={placeholder}
      />
    ) : (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={`w-full px-2 py-1 border border-primary-500 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 ${className}`}
        placeholder={placeholder}
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`cursor-text hover:bg-gray-50 dark:hover:bg-gray-700/50 px-2 py-1 rounded transition-colors ${className}`}
      title="Clique duplo para editar"
      onDoubleClick={() => setIsEditing(true)}
    >
      {value || <span className="text-gray-400">{placeholder}</span>}
    </div>
  );
};

export default InlineEditableText;
