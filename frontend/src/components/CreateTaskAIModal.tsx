import React from 'react';
import NaturalLanguageInput from './NaturalLanguageInput';

interface CreateTaskAIModalProps {
  onClose: () => void;
  onTaskCreated?: () => void;
}

const CreateTaskAIModal: React.FC<CreateTaskAIModalProps> = ({ onClose, onTaskCreated }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl z-10">
        <NaturalLanguageInput onTaskCreated={onTaskCreated} onClose={onClose} />
      </div>
    </div>
  );
};

export default CreateTaskAIModal;
