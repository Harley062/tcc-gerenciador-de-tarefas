import React from 'react';

interface HighlightedTextProps {
  text: string;
  highlight: string;
  className?: string;
}

/**
 * Componente para destacar termos de busca no texto
 */
const HighlightedText: React.FC<HighlightedTextProps> = ({ text, highlight, className = '' }) => {
  if (!highlight.trim()) {
    return <span className={className}>{text}</span>;
  }

  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark
            key={index}
            className="bg-yellow-200 dark:bg-yellow-600 text-gray-900 dark:text-white px-0.5 rounded"
          >
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  );
};

export default HighlightedText;
