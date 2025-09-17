import React, { useState } from 'react';
import './SupportModal.css';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, content: string) => void;
}

const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert('Please fill in both title and content fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(title.trim(), content.trim());
      setTitle('');
      setContent('');
      onClose();
    } catch (error) {
      console.error('Failed to submit support request:', error);
      alert('Failed to submit support request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setTitle('');
      setContent('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="support-modal-overlay" onClick={handleClose}>
      <div className="support-modal" onClick={(e) => e.stopPropagation()}>
        <div className="support-modal-header">
          <h2 className="support-modal-title">Contact Support Team</h2>
          <button 
            className="support-modal-close" 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="support-modal-form">
          <div className="support-modal-field">
            <label htmlFor="support-title" className="support-modal-label">
              Title *
            </label>
            <input
              id="support-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of your issue"
              className="support-modal-input"
              disabled={isSubmitting}
              maxLength={100}
            />
          </div>
          
          <div className="support-modal-field">
            <label htmlFor="support-content" className="support-modal-label">
              Description *
            </label>
            <textarea
              id="support-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Please provide detailed information about your issue, including steps to reproduce if applicable"
              className="support-modal-textarea"
              disabled={isSubmitting}
              rows={6}
              maxLength={1000}
            />
            <div className="support-modal-char-count">
              {content.length}/1000 characters
            </div>
          </div>
          
          <div className="support-modal-actions">
            <button
              type="button"
              onClick={handleClose}
              className="support-modal-button support-modal-button-cancel"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="support-modal-button support-modal-button-submit"
              disabled={isSubmitting || !title.trim() || !content.trim()}
            >
              {isSubmitting ? 'Sending...' : 'Send to Support'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupportModal;
