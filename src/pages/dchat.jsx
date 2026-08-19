import React, { useState } from 'react';


const Chat = () => {
  const [currentUser, setCurrentUser] = useState('Alice');
  const [inputText, setInputText] = useState('');
  const [isGifSheetOpen, setIsGifSheetOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'Bob',
      text: 'Hey! Swipe this message to test replying.',
      timestamp: '10:30 AM',
    },
    {
      id: 2,
      sender: 'Alice',
      text: 'Works great! Check out this GIF sheet below.',
      timestamp: '10:31 AM',
    },
  ]);

  const getCurrentTime = () =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleSend = (text = inputText, gifUrl = null) => {
    if (!text.trim() && !gifUrl) return;

    const newMessage = {
      id: Date.now(),
      sender: currentUser,
      text: text,
      gifUrl: gifUrl,
      timestamp: getCurrentTime(),
      replyTo: replyingTo ? replyingTo.text : null,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText('');
    setReplyingTo(null);
    setIsGifSheetOpen(false);
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-slate-50 border-x shadow-md">
      {/* User Switcher */}
      <UsernamePicker
        currentUsername={currentUser}
        onSelectUsername={setCurrentUser}
      />

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg) => (
          <SwipeableMessage
            key={msg.id}
            message={msg}
            isOwnMessage={msg.sender === currentUser}
            onSwipeReply={(selectedMsg) => setReplyingTo(selectedMsg)}
          />
        ))}
      </div>

      {/* Swipe Reply Banner */}
      {replyingTo && (
        <div className="flex justify-between items-center bg-gray-200 px-3 py-1.5 text-xs text-gray-600 border-t">
          <span className="truncate">Replying to: <b>{replyingTo.text}</b></span>
          <button onClick={() => setReplyingTo(null)} className="font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* GIF Picker Sheet */}
      <GifSheet
        isOpen={isGifSheetOpen}
        onClose={() => setIsGifSheetOpen(false)}
        onSelectGif={(url) => handleSend('', url)}
      />

      {/* Input Field Bar */}
      <div className="flex items-center gap-2 p-3 bg-white border-t">
        <button
          type="button"
          onClick={() => setIsGifSheetOpen((prev) => !prev)}
          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold text-gray-600"
        >
          GIF
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={`Message as ${currentUser}...`}
          className="flex-1 bg-gray-100 px-4 py-2 rounded-full text-sm outline-none focus:ring-1 focus:ring-blue-500"
        />

        <button
          onClick={() => handleSend()}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-full"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Dchat;

