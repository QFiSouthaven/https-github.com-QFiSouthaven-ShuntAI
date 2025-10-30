import React from 'react';
import { useMailbox } from '../../context/MailboxContext';
import { UndoIcon, RedoIcon, FeedbackIcon, MailboxIcon } from '../icons';

interface HeaderActionsProps {
    onUndo: () => void;
    canUndo: boolean;
    onRedo: () => void;
    canRedo: boolean;
    onOpenFeedback: () => void;
    onOpenMailbox: () => void;
}

const HeaderActions: React.FC<HeaderActionsProps> = ({
    onUndo,
    canUndo,
    onRedo,
    canRedo,
    onOpenFeedback,
    onOpenMailbox,
}) => {
    const { unreadCount } = useMailbox();

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={onUndo}
                disabled={!canUndo}
                className="p-2 rounded-full hover:bg-gray-700/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Undo"
            >
                <UndoIcon className="w-6 h-6 text-gray-300" />
            </button>
            <button
                onClick={onRedo}
                disabled={!canRedo}
                className="p-2 rounded-full hover:bg-gray-700/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Redo"
            >
                <RedoIcon className="w-6 h-6 text-gray-300" />
            </button>
            <div className="w-px h-6 bg-gray-600/50 mx-2"></div>
            <button
                onClick={onOpenFeedback}
                className="p-2 rounded-full hover:bg-gray-700/50 transition-colors"
                aria-label="Provide Feedback"
            >
                <FeedbackIcon className="w-6 h-6 text-gray-300" />
            </button>
            <button
                onClick={onOpenMailbox}
                className="relative p-2 rounded-full hover:bg-gray-700/50 transition-colors"
                aria-label={`Open Mailbox (${unreadCount} unread)`}
            >
                <MailboxIcon className="w-6 h-6 text-gray-300" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-fuchsia-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-gray-800">
                        {unreadCount}
                    </span>
                )}
            </button>
        </div>
    );
};

export default HeaderActions;
