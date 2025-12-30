'use client';

import { useState, useRef, useEffect } from 'react';
import { Message } from '@/lib/types';

interface ChatMessage extends Message {
  id: string;
  badge_type?: 'partial_progress' | 'hint_given' | 'corrective_feedback';
}

interface TutorChatProps {
  problemId: string;
  problemText: string;
  isMasteryCheck?: boolean;
  onCorrectAnswer?: () => void;
  onMasteryFailed?: () => void;
}

export default function TutorChat({ problemId, problemText, isMasteryCheck = false, onCorrectAnswer, onMasteryFailed }: TutorChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showSolutionButton, setShowSolutionButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const studentMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'student',
      text: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, studentMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem_id: problemId,
          student_answer: studentMessage.text,
          conversation_history: messages.map(m => ({ role: m.role, text: m.text })),
          hints_used: hintsUsed
        })
      });

      if (!response.ok) {
        throw new Error('Evaluation failed');
      }

      const result = await response.json();

      const tutorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'tutor',
        text: result.tutor_message,
        timestamp: new Date().toISOString(),
        badge_type: result.badge_type
      };

      setMessages(prev => [...prev, tutorMessage]);

      // Update hints counter
      if (result.badge_type === 'hint_given') {
        setHintsUsed(prev => prev + 1);
      }

      // Show solution button if available
      if (result.show_solution_button) {
        setShowSolutionButton(true);

        // If in mastery check mode and solution button appears, mastery failed
        if (isMasteryCheck && onMasteryFailed) {
          setTimeout(() => onMasteryFailed(), 1500);
        }
      }

      // Trigger correct answer callback
      if (result.response_type === 'correct_final' && onCorrectAnswer) {
        setTimeout(() => onCorrectAnswer(), 1500);
      }

    } catch (error) {
      console.error('Error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'tutor',
        text: 'Sorry, I had trouble understanding that. Could you try again?',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowSolution = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem_id: problemId,
          student_answer: 'show solution',
          conversation_history: messages.map(m => ({ role: m.role, text: m.text })),
          hints_used: hintsUsed,
          request_solution: true
        })
      });

      const result = await response.json();

      const solutionMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'tutor',
        text: result.explanation || result.tutor_message,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, solutionMessage]);
      setShowSolutionButton(false);

    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getBadgeColor = (badgeType?: string) => {
    switch (badgeType) {
      case 'partial_progress':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'hint_given':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'corrective_feedback':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return '';
    }
  };

  const getBadgeLabel = (badgeType?: string) => {
    switch (badgeType) {
      case 'partial_progress':
        return 'Great Progress!';
      case 'hint_given':
        return 'Hint';
      case 'corrective_feedback':
        return 'Let\'s Try This';
      default:
        return '';
    }
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      {/* Problem Display */}
      <div className={`border-b p-6 rounded-t-lg ${
        isMasteryCheck
          ? 'bg-purple-50 border-purple-100'
          : 'bg-indigo-50 border-indigo-100'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          <h3 className={`text-sm font-medium ${
            isMasteryCheck ? 'text-purple-600' : 'text-indigo-600'
          }`}>
            {isMasteryCheck ? 'Mastery Check' : 'Problem'}
          </h3>
          {isMasteryCheck && (
            <span className="px-2 py-0.5 bg-purple-200 text-purple-800 text-xs font-semibold rounded-full">
              ⭐ Test Your Skills!
            </span>
          )}
        </div>
        <p className="text-lg text-gray-900">{problemText}</p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p>Read the problem carefully and type your answer below.</p>
            <p className="text-sm mt-2">I'm here to help guide you!</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'student' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                message.role === 'student'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-900'
              }`}
            >
              {message.badge_type && (
                <div className="mb-2">
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${getBadgeColor(message.badge_type)}`}>
                    {getBadgeLabel(message.badge_type)}
                  </span>
                </div>
              )}
              <p className="whitespace-pre-wrap">{message.text}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white p-4 rounded-b-lg">
        {showSolutionButton && (
          <div className="mb-3">
            <button
              onClick={handleShowSolution}
              disabled={isLoading}
              className="w-full py-2 px-4 bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Show me how to solve this
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your answer..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>

        {hintsUsed > 0 && (
          <p className="text-sm text-gray-500 mt-2 text-center">
            Hints used: {hintsUsed}/3
          </p>
        )}
      </div>
    </div>
  );
}
