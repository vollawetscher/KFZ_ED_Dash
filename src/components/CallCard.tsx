import React, { useState } from 'react';
import { Phone, Clock, Calendar, ChevronDown, ChevronUp, CheckCircle, XCircle, AlertCircle, BarChart3, Flag } from 'lucide-react';
import { CallRecord, EvaluationResult } from '../types';
import { format } from 'date-fns';

interface CallCardProps {
  call: CallRecord;
  onUpdateFlag: (callId: string, isFlagged: boolean) => Promise<boolean>;
}

export function CallCard({ call, onUpdateFlag }: CallCardProps) {
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);
  const [isEvaluationExpanded, setIsEvaluationExpanded] = useState(false);
  const [isUpdatingFlag, setIsUpdatingFlag] = useState(false);

  const handleFlagToggle = async () => {
    setIsUpdatingFlag(true);
    try {
      const newFlagStatus = !call.is_flagged_for_review;
      const success = await onUpdateFlag(call.id, newFlagStatus);
      if (!success) {
        // Could add a toast notification here in the future
        console.error('Failed to update call flag status');
      }
    } catch (error) {
      console.error('Error updating call flag status:', error);
    } finally {
      setIsUpdatingFlag(false);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatTranscript = (transcript: string) => {
    const lines = transcript.split('\n');

    return lines.map((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return null;
      
      if (trimmedLine.startsWith('agent:')) {
        const text = trimmedLine.replace('agent:', '').trim();
        return (
          <div key={index} className="mb-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs font-medium">Bot</span>
              </div>
              <div className="flex-1 bg-blue-50 rounded-lg p-3">
                <p className="text-gray-800 text-sm leading-relaxed">{text}</p>
              </div>
            </div>
          </div>
        );
      } else if (trimmedLine.startsWith('user:')) {
        const text = trimmedLine.replace('user:', '').trim();
        return (
          <div key={index} className="mb-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs font-medium">User</span>
              </div>
              <div className="flex-1 bg-gray-100 rounded-lg p-3">
                <p className="text-gray-800 text-sm leading-relaxed">{text}</p>
              </div>
            </div>
          </div>
        );
      } else {
        return (
          <div key={index} className="mb-2">
            <p className="text-gray-600 text-sm italic">{trimmedLine}</p>
          </div>
        );
      }
    }).filter(Boolean);
  };

  const renderEvaluationSummary = (evaluationResults: Record<string, EvaluationResult>) => {
    const entries = Object.entries(evaluationResults);
    if (entries.length === 0) return null;

    const successCount = entries.filter(([_, evaluation]) => evaluation.result === 'success').length;
    const failureCount = entries.filter(([_, evaluation]) => evaluation.result === 'failure').length;
    const totalCount = entries.length;

    return (
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-green-700 font-medium">{successCount} erfüllt</span>
        </div>
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 text-red-500" />
          <span className="text-red-700 font-medium">{failureCount} nicht erfüllt</span>
        </div>
        <div className="text-gray-500">
          ({totalCount} gesamt)
        </div>
      </div>
    );
  };

  const renderEvaluationResults = (evaluationResults: Record<string, EvaluationResult>) => {
    if (!evaluationResults || typeof evaluationResults !== 'object') return null;

    const entries = Object.entries(evaluationResults);
    if (entries.length === 0) return null;

    return (
      <div className="mb-6">
        <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
          {/* Header - Always visible */}
          <div 
            className="px-4 py-3 bg-white border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setIsEvaluationExpanded(!isEvaluationExpanded)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsEvaluationExpanded(!isEvaluationExpanded);
              }
            }}
            aria-expanded={isEvaluationExpanded}
            aria-controls="evaluation-details"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-gray-600" />
                <h4 className="font-medium text-gray-900">Bewertungsergebnisse</h4>
              </div>
              <div className="flex items-center gap-3">
                {renderEvaluationSummary(evaluationResults)}
                <ChevronDown 
                  className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
                    isEvaluationExpanded ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Expandable Content */}
          <div 
            id="evaluation-details"
            className={`transition-all duration-300 ease-in-out ${
              isEvaluationExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="p-4 space-y-3 overflow-y-auto max-h-[550px]">
              {entries.map(([identifier, evaluation], index) => {
                const isSuccess = evaluation.result === 'success';
                const colorClass = isSuccess 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200';
                const textColorClass = isSuccess ? 'text-green-800' : 'text-red-800';
                const icon = isSuccess ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />;
                const statusText = isSuccess ? 'Erfüllt' : 'Nicht erfüllt';
                
                // Format identifier for display
                const displayName = identifier
                  .replace(/_/g, ' ')
                  .replace(/\b\w/g, l => l.toUpperCase());

                return (
                  <div key={index} className={`rounded-lg p-4 border ${colorClass}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className={`font-medium text-sm ${textColorClass}`}>{displayName}</h5>
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            isSuccess 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {statusText}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed text-gray-600">
                          {evaluation.rationale}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Phone className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{call.caller_number}</h3>
            <p className="text-sm text-gray-500">Anruf-ID: {call.id}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
            <Calendar className="h-4 w-4" />
            {format(new Date(call.timestamp), 'dd.MM.yyyy')}
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            {format(new Date(call.timestamp), 'HH:mm:ss')}
          </div>
        </div>
      </div>

      {/* Evaluation Results */}
      {call.evaluation_results && renderEvaluationResults(call.evaluation_results)}

      {/* Conversation Transcript */}
      <div className="mb-4">
        <h4 className="font-medium text-gray-900 mb-3">Gesprächsverlauf</h4>
        <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
          <div 
            className={`p-4 transition-all duration-300 ease-in-out ${
              isTranscriptExpanded ? 'max-h-none' : 'max-h-80'
            } ${isTranscriptExpanded ? '' : 'overflow-hidden'}`}
          >
            <div className={isTranscriptExpanded ? 'max-h-none overflow-visible' : 'max-h-40 overflow-y-auto'}>
              {formatTranscript(call.transcript)}
            </div>
          </div>
          
          {/* Expand/Collapse Button */}
          <div className="px-4 py-3 bg-white border-t border-gray-200">
            <button
              onClick={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
              className="w-full flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
              aria-expanded={isTranscriptExpanded}
              aria-controls="transcript-content"
            >
              {isTranscriptExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Weniger anzeigen
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Mehr anzeigen
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Call Details Footer */}
      <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-4">
          <span>Dauer: {formatDuration(call.duration)}</span>
          <span>Verarbeitet: {format(new Date(call.processed_at), 'dd.MM. HH:mm')}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleFlagToggle}
            disabled={isUpdatingFlag}
            className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              call.is_flagged_for_review
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={call.is_flagged_for_review ? 'Als fehlerfrei markieren' : 'Zur Überprüfung markieren'}
          >
            {isUpdatingFlag ? (
              <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Flag className="h-3 w-3" />
            )}
            {call.is_flagged_for_review ? 'Markiert' : 'Markieren'}
          </button>
          <div className="w-2 h-2 bg-green-500 rounded-full" title="Erfolgreich verarbeitet"></div>
        </div>
      </div>
    </div>
  );
}
