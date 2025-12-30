'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Problem } from '@/lib/types';
import ProblemPicker from '@/components/ProblemPicker';
import TutorChat from '@/components/TutorChat';
import MasteryCheckModal from '@/components/MasteryCheckModal';
import CelebrationModal from '@/components/CelebrationModal';

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [originalProblem, setOriginalProblem] = useState<Problem | null>(null);
  const [isMasteryCheck, setIsMasteryCheck] = useState(false);

  const [showMasteryCheckModal, setShowMasteryCheckModal] = useState(false);
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [celebrationType, setCelebrationType] = useState<'mastery_passed' | 'mastery_failed'>('mastery_passed');
  const [isGeneratingMastery, setIsGeneratingMastery] = useState(false);

  const handleProblemSelected = (problem: Problem) => {
    setCurrentProblem(problem);
    setOriginalProblem(null);
    setIsMasteryCheck(false);
    setShowMasteryCheckModal(false);
    setShowCelebrationModal(false);
  };

  const handleOriginalCorrectAnswer = () => {
    // Student solved the original problem - offer mastery check
    setShowMasteryCheckModal(true);
  };

  const handleStartMasteryCheck = async () => {
    setShowMasteryCheckModal(false);
    setIsGeneratingMastery(true);

    try {
      // Generate similar problem
      const response = await fetch('/api/generate-similar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem_id: currentProblem!.id,
          count: 1,
          difficulty_adjustment: 'same'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate mastery check problem');
      }

      const result = await response.json();

      if (result.problems && result.problems.length > 0) {
        const masteryProblem = result.problems[0];

        // Save original problem and switch to mastery check
        setOriginalProblem(currentProblem);
        setCurrentProblem(masteryProblem);
        setIsMasteryCheck(true);
      } else {
        throw new Error('No mastery problem generated');
      }

    } catch (error) {
      console.error('Error generating mastery check:', error);
      // Fallback: just reset to picker
      setCurrentProblem(null);
    } finally {
      setIsGeneratingMastery(false);
    }
  };

  const handleSkipMasteryCheck = () => {
    setShowMasteryCheckModal(false);
    // Reset to picker
    setCurrentProblem(null);
    setOriginalProblem(null);
  };

  const handleMasteryCorrectAnswer = () => {
    // Student passed mastery check!
    setCelebrationType('mastery_passed');
    setShowCelebrationModal(true);
  };

  const handleMasteryFailed = () => {
    // Student failed mastery check
    setCelebrationType('mastery_failed');
    setShowCelebrationModal(true);
  };

  const handleCelebrationContinue = () => {
    // Reset everything and go back to picker
    setShowCelebrationModal(false);
    setCurrentProblem(null);
    setOriginalProblem(null);
    setIsMasteryCheck(false);
  };

  const handleTryAnother = () => {
    setCurrentProblem(null);
    setOriginalProblem(null);
    setIsMasteryCheck(false);
    setShowMasteryCheckModal(false);
    setShowCelebrationModal(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-indigo-600">
                NCERT Math Tutor
              </h1>
              <p className="text-sm text-gray-600">
                Your AI-powered math practice companion
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {currentProblem && !isMasteryCheck && (
                <button
                  onClick={handleTryAnother}
                  className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  Choose Different Problem
                </button>
              )}
              {session && (
                <button
                  onClick={() => router.push('/profile')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center space-x-2"
                  title="View Profile"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Profile</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {!currentProblem ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <ProblemPicker onProblemSelected={handleProblemSelected} />
          </div>
        ) : (
          <div className="relative">
            {/* Loading Overlay for Mastery Generation */}
            {isGeneratingMastery && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                <div className="bg-white rounded-lg p-8 text-center shadow-2xl">
                  <div className="text-5xl mb-4 animate-spin">⚙️</div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Creating Your Mastery Check...
                  </h2>
                  <p className="text-gray-600">
                    Generating a similar problem for you to solve!
                  </p>
                </div>
              </div>
            )}

            {/* Chat Interface */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ height: '70vh' }}>
              <TutorChat
                problemId={currentProblem.id}
                problemText={currentProblem.text}
                isMasteryCheck={isMasteryCheck}
                onCorrectAnswer={isMasteryCheck ? handleMasteryCorrectAnswer : handleOriginalCorrectAnswer}
                onMasteryFailed={handleMasteryFailed}
              />
            </div>

            {/* Problem Info Footer */}
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center space-x-4">
                {isMasteryCheck && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full font-bold">
                    ⭐ Mastery Check
                  </span>
                )}
                <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full font-medium">
                  Class {currentProblem.class}
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full">
                  Chapter {currentProblem.chapter}
                </span>
                {currentProblem.complexity && (
                  <span className={`px-3 py-1 rounded-full font-medium ${
                    currentProblem.complexity === 'easy'
                      ? 'bg-green-100 text-green-800'
                      : currentProblem.complexity === 'medium'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {currentProblem.complexity.charAt(0).toUpperCase() + currentProblem.complexity.slice(1)}
                  </span>
                )}
                {currentProblem.requires_multi_step && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full">
                    Multi-step
                  </span>
                )}
              </div>
              <span className="text-gray-500">
                Problem ID: {currentProblem.id}
              </span>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 text-center text-sm text-gray-500 pb-8">
        <p>
          Powered by NCERT textbooks • GPT-4o • Socratic Teaching Method
        </p>
      </footer>

      {/* Modals */}
      <MasteryCheckModal
        isOpen={showMasteryCheckModal}
        onStartMasteryCheck={handleStartMasteryCheck}
        onSkip={handleSkipMasteryCheck}
      />

      <CelebrationModal
        isOpen={showCelebrationModal}
        type={celebrationType}
        onContinue={handleCelebrationContinue}
      />
    </div>
  );
}
