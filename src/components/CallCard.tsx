import React, { useState } from 'react';
import { Phone, Clock, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { CallRecord } from '../types';
import { format } from 'date-fns';

interface CallCardProps {
  call: CallRecord;
}

export function CallCard({ call }: CallCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const truncateTranscript = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
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
            <p className="text-sm text-gray-500">Call ID: {call.id}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
            <Calendar className="h-4 w-4" />
            {format(new Date(call.timestamp), 'MMM dd, yyyy')}
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            {format(new Date(call.timestamp), 'HH:mm:ss')}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h4 className="font-medium text-gray-900 mb-2">Transcript</h4>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-gray-700 leading-relaxed">
            {isExpanded ? call.transcript : truncateTranscript(call.transcript)}
          </p>
          {call.transcript.length > 200 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2 flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Show More
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-4">
          <span>Duration: {formatDuration(call.duration)}</span>
          <span>Processed: {format(new Date(call.processed_at), 'MMM dd, HH:mm')}</span>
        </div>
        <div className="w-2 h-2 bg-green-500 rounded-full" title="Processed successfully"></div>
      </div>
    </div>
  );
}