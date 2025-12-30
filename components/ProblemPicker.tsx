'use client';

import { useState, useEffect } from 'react';
import { Problem } from '@/lib/types';

interface ProblemPickerProps {
  onProblemSelected: (problem: Problem) => void;
}

export default function ProblemPicker({ onProblemSelected }: ProblemPickerProps) {
  const [selectedClass, setSelectedClass] = useState<number>(5);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [problemNumber, setProblemNumber] = useState<string>('');
  const [availableChapters, setAvailableChapters] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Fetch available chapters when class changes
  useEffect(() => {
    const fetchChapters = async () => {
      try {
        const response = await fetch(`/api/problems/chapters?class=${selectedClass}`);
        const data = await response.json();
        setAvailableChapters(data.chapters || []);
        setSelectedChapter(data.chapters?.[0] || 1);
      } catch (error) {
        console.error('Error fetching chapters:', error);
        // Default chapters if fetch fails
        setAvailableChapters(Array.from({ length: 14 }, (_, i) => i + 1));
      }
    };
    fetchChapters();
  }, [selectedClass]);

  const handleFindProblem = async () => {
    setError('');

    if (!problemNumber.trim()) {
      setError('Please enter a problem number');
      return;
    }

    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        class: selectedClass.toString(),
        chapter: selectedChapter.toString(),
        problem_number: problemNumber.trim()
      });

      const response = await fetch(`/api/problems/find?${params}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch problem');
      }

      const problem = await response.json();
      onProblemSelected(problem);

    } catch (error) {
      console.error('Error fetching problem:', error);
      setError(error instanceof Error ? error.message : 'Problem not found. Please check the details and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-8 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Find Your Homework Problem
        </h2>
        <p className="text-gray-600">
          Tell me which problem you're stuck on
        </p>
      </div>

      <div className="space-y-6">
        {/* Class Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Which class are you in?
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => setSelectedClass(5)}
              className={`py-3 px-4 rounded-lg font-medium transition-colors ${
                selectedClass === 5
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Class 5
            </button>
            <button
              onClick={() => setSelectedClass(6)}
              className={`py-3 px-4 rounded-lg font-medium transition-colors ${
                selectedClass === 6
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Class 6
            </button>
            <button
              onClick={() => setSelectedClass(7)}
              className={`py-3 px-4 rounded-lg font-medium transition-colors ${
                selectedClass === 7
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Class 7
            </button>
            <button
              onClick={() => setSelectedClass(8)}
              className={`py-3 px-4 rounded-lg font-medium transition-colors ${
                selectedClass === 8
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Class 8
            </button>
          </div>
        </div>

        {/* Chapter Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Which chapter?
          </label>
          <select
            value={selectedChapter}
            onChange={(e) => setSelectedChapter(parseInt(e.target.value))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            {availableChapters.map((chapter) => (
              <option key={chapter} value={chapter}>
                Chapter {chapter}
              </option>
            ))}
          </select>
        </div>

        {/* Problem Number Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Which problem number?
          </label>
          <input
            type="text"
            value={problemNumber}
            onChange={(e) => setProblemNumber(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleFindProblem()}
            placeholder="e.g., 1, 2.3, 4(a), etc."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <p className="mt-2 text-xs text-gray-500">
            Enter the problem number exactly as it appears in your textbook
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Find Problem Button */}
        <button
          onClick={handleFindProblem}
          disabled={isLoading}
          className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Finding your problem...' : 'Find Problem'}
        </button>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <p className="text-sm text-blue-900">
          <strong>💡 How it works:</strong> Enter the problem number from your NCERT textbook, and I'll help you solve it step-by-step!
        </p>
      </div>
    </div>
  );
}
