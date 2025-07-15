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

  const formatTranscript = (transcript: string, isExpanded: boolean) => {
    const lines = transcript.split('\n');
    // Zeigt die ersten 5 Zeilen an, wenn nicht erweitert, sonst alle Zeilen
    const displayLines = isExpanded ? lines : lines.slice(0, 5);

    return displayLines.map((line, index) => {
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
        // Behandelt Zeilen, die nicht mit agent: oder user: beginnen
        return (
          <div key={index} className="mb-2">
            <p className="text-gray-600 text-sm italic">{trimmedLine}</p>
          </div>
        );
      }
    }).filter(Boolean);
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

      <div className="mb-4">
        <h4 className="font-medium text-gray-900 mb-2">Gesprächsverlauf</h4>
        <div className="bg-gray-50 rounded-lg p-4">
          {formatTranscript(call.transcript, isExpanded)}
          {call.transcript.split('\n').length > 5 && ( // Zeigt "Mehr anzeigen" nur an, wenn mehr als 5 Zeilen vorhanden sind
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2 flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {isExpanded ? (
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
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-4">
          <span>Dauer: {formatDuration(call.duration)}</span>
          <span>Verarbeitet: {format(new Date(call.processed_at), 'dd.MM. HH:mm')}</span>
        </div>
        <div className="w-2 h-2 bg-green-500 rounded-full" title="Erfolgreich verarbeitet"></div>
      </div>
    </div>
  );
}
