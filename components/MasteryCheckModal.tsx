'use client';

interface MasteryCheckModalProps {
  isOpen: boolean;
  onStartMasteryCheck: () => void;
  onSkip: () => void;
}

export default function MasteryCheckModal({
  isOpen,
  onStartMasteryCheck,
  onSkip
}: MasteryCheckModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 animate-fadeIn">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Great Job!
          </h2>
          <p className="text-gray-600">
            You solved the problem correctly!
          </p>
        </div>

        <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-purple-900 mb-2">
            Ready for a Mastery Check?
          </h3>
          <p className="text-sm text-purple-800 mb-3">
            I'll give you a similar problem to see if you've really mastered this concept!
          </p>
          <ul className="text-sm text-purple-700 space-y-1">
            <li>✓ Similar to what you just solved</li>
            <li>✓ Shows you understand the concept</li>
            <li>✓ Quick confidence boost!</li>
          </ul>
        </div>

        <div className="space-y-3">
          <button
            onClick={onStartMasteryCheck}
            className="w-full py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
          >
            Let's Test My Mastery!
          </button>

          <button
            onClick={onSkip}
            className="w-full py-3 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
          >
            Pick a Different Problem
          </button>
        </div>
      </div>
    </div>
  );
}
