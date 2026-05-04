'use client';

import { motion, AnimatePresence } from 'motion/react';
import { MessageBubble } from './message-bubble';

interface Props {
  message: any;
  currentUserId: string;
  otherParticipantName?: string;
  onClose: () => void;
  onReact: (messageId: string, emoji: string) => void;
  onReply: (msg: any) => void;
  onEdit: (msg: any) => void;
  onDelete: (id: string) => void;
}

const EMOJIS = ['❤️', '😂', '😮', '😢', '👍'];

export function MessageActionsOverlay({
  message,
  currentUserId,
  otherParticipantName,
  onClose,
  onReact,
  onReply,
  onEdit,
  onDelete
}: Props) {
  const isMe = message.sender_id === currentUserId;

  return (
    <AnimatePresence>
      {message && (
        <>
          {/* BACKDROP */}
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* CENTER */}
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">

            <div className="relative pointer-events-auto">

              {/* REACTIONS */}
              <motion.div
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-lg px-3 py-1 flex gap-2"
              >
                {EMOJIS.map(e => (
                  <button
                    key={e}
                    onClick={() => {
                      onReact(message.id, e);
                      onClose();
                    }}
                    className="text-lg hover:scale-125 transition"
                  >
                    {e}
                  </button>
                ))}
              </motion.div>

              {/* MESSAGE PREVIEW */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1.05, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="transition-all"
              >
                <MessageBubble
                  msg={message}
                  isMe={isMe}
                  isFirstInGroup={true}
                  isLastInGroup={true}
                  currentUserId={currentUserId}
                  otherParticipantName={otherParticipantName}
                  isPreview
                />
              </motion.div>

              {/* MENU */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 10, opacity: 0 }}
                className="absolute -bottom-14 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-lg flex gap-2 px-3 py-2"
              >
                <button onClick={() => { onReply(message); onClose(); }}>↩️</button>

                {isMe && (
                  <>
                    <button onClick={() => { onEdit(message); onClose(); }}>✏️</button>
                    <button onClick={() => { onDelete(message.id); onClose(); }}>🗑️</button>
                  </>
                )}
              </motion.div>

            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
