'use client';

interface CelebrationModalProps {
  isOpen: boolean;
  type: 'mastery_passed' | 'mastery_failed';
  onContinue: () => void;
}

export default function CelebrationModal({
  isOpen,
  type,
  onContinue
}: CelebrationModalProps) {
  if (!isOpen) return null;

  const isMasteryPassed = type === 'mastery_passed';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 animate-fadeIn">
        <div className="text-center">
          {isMasteryPassed ? (
            <>
              <div className="text-7xl mb-4 animate-bounce">🎉</div>
              <h2 className="text-4xl font-bold text-purple-600 mb-3">
                Mastery Achieved!
              </h2>
              <p className="text-lg text-gray-700 mb-6">
                You've proven you really understand this concept! That was amazing work!
              </p>
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-300 rounded-lg p-4 mb-6">
                <p className="text-purple-900 font-semibold">
                  ⭐ You're a math superstar! ⭐
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4">💪</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Good Effort!
              </h2>
              <p className="text-lg text-gray-700 mb-4">
                Mastery takes practice, and that's okay! You learned a lot from this problem.
              </p>
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-900">
                  Remember: Every mistake is a step toward mastery. Keep practicing!
                </p>
              </div>
            </>
          )}

          <button
            onClick={onContinue}
            className={`w-full py-3 px-6 font-semibold rounded-lg transition-colors ${
              isMasteryPassed
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {isMasteryPassed ? 'Try Another Problem!' : 'Pick Another Problem'}
          </button>
        </div>
      </div>
    </div>
  );
}
