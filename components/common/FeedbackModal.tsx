// components/common/FeedbackModal.tsx
import React, { useState, useEffect } from 'react';
import { useTelemetry } from '../../context/TelemetryContext';
import { XMarkIcon, CheckIcon, FeedbackIcon } from '../icons';
import Loader from '../Loader';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
    const [feedbackType, setFeedbackType] = useState('General Feedback');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isRendered, setIsRendered] = useState(false);
    const { telemetryService } = useTelemetry();

    useEffect(() => {
        if (isOpen) {
            setIsRendered(true);
        } else {
            const timer = setTimeout(() => {
                setIsRendered(false);
                // Reset form state when modal is fully closed
                setIsSubmitted(false);
                setMessage('');
                setFeedbackType('General Feedback');
            }, 300); // Match animation duration
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        setIsSubmitting(true);

        telemetryService?.recordEvent({
            eventType: 'feedback_given',
            interactionType: 'submit_feedback_form',
            tab: 'Global',
            customData: {
                feedbackType,
                message,
            },
            outcome: 'success',
        });

        // Simulate network request
        await new Promise(resolve => setTimeout(resolve, 1000));

        setIsSubmitting(false);
        setIsSubmitted(true);
    };
    
    const handleClose = () => {
        if (isSubmitting) return;
        onClose();
    }

    if (!isRendered) return null;

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop ${isOpen ? 'bg-black/70' : 'bg-black/0'}`}
            aria-modal="true"
            role="dialog"
        >
            <div className={`modal-content ${isOpen ? 'open' : ''} bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-lg flex flex-col`}>
                <header className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <FeedbackIcon className="w-6 h-6 text-fuchsia-400" />
                        <h2 className="text-lg font-semibold text-gray-200">Provide Feedback</h2>
                    </div>
                    <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>
                <main className="p-6 overflow-y-auto flex-grow">
                    {isSubmitted ? (
                        <div className="text-center flex flex-col items-center justify-center h-full">
                            <CheckIcon className="w-16 h-16 text-green-400 mb-4" />
                            <h3 className="text-xl font-semibold text-white">Thank you!</h3>
                            <p className="text-gray-400 mt-2">Your feedback has been submitted and will help us improve.</p>
                            <button
                                onClick={() => setIsSubmitted(false)}
                                className="mt-6 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
                            >
                                Submit Another
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="feedbackType" className="block text-sm font-medium text-gray-300 mb-1">
                                        Feedback Type
                                    </label>
                                    <select
                                        id="feedbackType"
                                        value={feedbackType}
                                        onChange={(e) => setFeedbackType(e.target.value)}
                                        className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-gray-200 focus:ring-fuchsia-500 focus:border-fuchsia-500"
                                    >
                                        <option>General Feedback</option>
                                        <option>Bug Report</option>
                                        <option>Feature Request</option>
                                        <option>UI/UX Suggestion</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-1">
                                        Message
                                    </label>
                                    <textarea
                                        id="message"
                                        rows={6}
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        required
                                        className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-gray-200 focus:ring-fuchsia-500 focus:border-fuchsia-500"
                                        placeholder={`Please provide as much detail as possible.`}
                                    />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !message.trim()}
                                    className="px-6 py-2 bg-fuchsia-600 text-white font-semibold rounded-md hover:bg-fuchsia-500 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                                >
                                    {isSubmitting ? <Loader /> : 'Submit Feedback'}
                                </button>
                            </div>
                        </form>
                    )}
                </main>
            </div>
        </div>
    );
};

export default FeedbackModal;