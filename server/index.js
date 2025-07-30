import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Configuration
const PORT = process.env.PORT || 3001;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your-webhook-secret-key';
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'test123';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ocogjybxeejfftwfcjbs.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Middleware
app.use(helmet());
app.use(cors());
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});
app.use(express.json({ limit: '10mb' }));
app.use(express.raw({ type: 'application/json' }));

// HMAC signature validation
function validateHMACSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  const providedSignature = signature.replace('sha256=', '');
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(providedSignature, 'hex')
  );
}

// Broadcast to all connected WebSocket clients
function broadcastToClients(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('New WebSocket connection established');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (error) {
      console.error('WebSocket message parsing error:', error);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error on client connection:', error);
  });
});

// Add error handler for the entire WebSocket server
wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});

// Webhook endpoint for ElevenLabs
app.post('/webhook/elevenlabs', async (req, res) => {
  try {
    const signature = req.headers['x-elevenlabs-signature'];
    const payload = JSON.stringify(req.body);

    // Validate HMAC signature if provided
    if (signature && !validateHMACSignature(payload, signature, WEBHOOK_SECRET)) {
      console.error('Invalid HMAC signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Extrahieren der Daten aus der verschachtelten Struktur des ElevenLabs-Payloads
    const eventType = req.body.type;
    const eventTimestamp = req.body.event_timestamp;
    const conversationId = req.body.data?.conversation_id;
    const callDurationSecs = req.body.data?.metadata?.call_duration_secs;

    // Versuchen, das vollständige Transkript zu extrahieren
    let fullTranscript = '';
    const rawTranscriptArray = req.body.data?.transcript;
    
    if (Array.isArray(rawTranscriptArray) && rawTranscriptArray.length > 0) {
      fullTranscript = rawTranscriptArray.map((item) => {
        const text = item.text || item.message || item.content || item.transcript || item.value || '';
        const speaker = item.speaker || item.role || '';
        if (speaker && text) {
          return `${speaker}: ${text}`;
        }
        return text;
      }).filter(text => text.trim() !== '').join('\n');
    } else {
      // Fallback zur Zusammenfassung, falls vollständiges Transkript nicht verfügbar
      fullTranscript = req.body.data?.analysis?.transcript_summary || '';
    }

    // Extrahieren der caller_id aus den dynamic_variables (falls verfügbar)
    const callerNumber = req.body.data?.conversation_initiation_client_data?.dynamic_variables?.caller_id || 'unknown_caller';

    // Extrahieren der evaluation_results aus der Analyse (falls verfügbar)
    const evaluationResults = req.body.data?.analysis?.evaluation_criteria_results || null;

    // Überprüfen der erforderlichen Felder
    if (!conversationId || !fullTranscript) {
      console.error('Missing required fields for call record:', req.body);
      return res.status(400).json({ error: 'Missing required fields: conversation_id or transcript' });
    }

    // Erstellen des Call-Records
    const callRecord = {
      id: conversationId,
      caller_number: callerNumber,
      transcript: fullTranscript,
      timestamp: eventTimestamp ? new Date(eventTimestamp * 1000).toISOString() : new Date().toISOString(),
      duration: callDurationSecs || null,
      processed_at: new Date().toISOString(),
      evaluation_results: evaluationResults
    };

    // Insert into Supabase
    const { data, error } = await supabase
      .from('calls')
      .insert([callRecord])
      .select()
      .single();

    if (error) {
      console.error('Supabase insertion error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    // Broadcast to connected clients
    broadcastToClients({
      type: 'new_call',
      data: data
    });

    console.log('New call processed:', data.id, 'from caller:', callerNumber);
    res.status(200).json({ message: 'Webhook processed successfully', call_id: data.id });

  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Webhook endpoint for ElevenLabs initiation data
app.post('/webhook/elevenlabs-initiation-data', async (req, res) => {
  try {
    const signature = req.headers['x-elevenlabs-signature'];
    const payload = JSON.stringify(req.body);

    // Validate HMAC signature if provided
    if (signature && !validateHMACSignature(payload, signature, WEBHOOK_SECRET)) {
      console.error('Invalid HMAC signature for initiation webhook');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Extract caller_id from the request body
    const callerId = req.body.caller_id;
    const agentId = req.body.agent_id;
    const calledNumber = req.body.called_number;
    const callSid = req.body.call_sid;

    console.log('Initiation webhook received:', {
      caller_id: callerId,
      agent_id: agentId,
      called_number: calledNumber,
      call_sid: callSid
    });

    // Validate required fields
    if (!callerId) {
      console.error('Missing caller_id in initiation webhook');
      return res.status(400).json({ error: 'Missing caller_id' });
    }

    // Construct the expected response format for ElevenLabs
    const response = {
      type: "conversation_initiation_client_data",
      dynamic_variables: {
        caller_id: callerId
      }
    };

    console.log('Sending initiation response:', response);
    res.status(200).json(response);

  } catch (error) {
    console.error('Initiation webhook processing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login endpoint for simplified authentication
app.post('/api/login', (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }
    
    if (password === DASHBOARD_PASSWORD) {
      return res.status(200).json({ 
        success: true, 
        message: 'Login successful',
        token: 'authenticated' // Simple token for frontend
      });
    } else {
      return res.status(401).json({ error: 'Invalid password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test endpoint
app.get('/webhook/elevenlabs', (req, res) => {
  console.log('GET request to webhook endpoint');
  res.json({ message: 'Webhook endpoint is working', timestamp: new Date().toISOString() });
});

// API endpoints
app.get('/api/calls', async (req, res) => {
  try {
    const { search, caller, conv_id, from_date, to_date, limit = 50, offset = 0 } = req.query;
    
    let query = supabase
      .from('calls')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (search) {
      query = query.or(`transcript.ilike.%${search}%,caller_number.ilike.%${search}%`);
    }
    
    if (caller) {
      query = query.ilike('caller_number', `%${caller}%`);
    }
    
    if (conv_id) {
      query = query.ilike('id', `%${conv_id}%`);
    }
    
    if (from_date) {
      query = query.gte('timestamp', from_date);
    }
    
    if (to_date) {
      query = query.lte('timestamp', to_date);
    }
    
    // Apply pagination
    query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    
    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json({
      calls: data || [],
      total: count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/calls/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('calls')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) {
      console.error('Supabase query error:', error);
      return res.status(404).json({ error: 'Call not found' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Get total calls
    const { count: totalCalls, error: totalError } = await supabase
      .from('calls')
      .select('*', { count: 'exact', head: true });

    // Get today's calls
    const { count: todayCalls, error: todayError } = await supabase
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', today.toISOString());

    // Get this week's calls
    const { count: weekCalls, error: weekError } = await supabase
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', thisWeek.toISOString());

    // Get unique callers
    const { data: uniqueCallersData, error: uniqueError } = await supabase
      .from('calls')
      .select('caller_number')
      .neq('caller_number', null);

    // Get all calls with duration and transcript data for advanced stats
    const { data: allCallsData, error: allCallsError } = await supabase
      .from('calls')
      .select('duration, transcript, evaluation_results');

    if (totalError || todayError || weekError || uniqueError || allCallsError) {
      console.error('Stats query error:', { totalError, todayError, weekError, uniqueError, allCallsError });
      return res.status(500).json({ error: 'Database error' });
    }

    const uniqueCallers = uniqueCallersData 
      ? [...new Set(uniqueCallersData.map(call => call.caller_number))].length 
      : 0;

    // Calculate advanced statistics
    let totalDurationMinutes = 0;
    let totalBotReplies = 0;
    let callsWithDuration = 0;
    let totalSuccessfulCriteria = 0;
    let totalCriteria = 0;

    if (allCallsData && allCallsData.length > 0) {
      allCallsData.forEach(call => {
        // Calculate total duration
        if (call.duration && call.duration > 0) {
          totalDurationMinutes += Math.round(call.duration / 60);
          callsWithDuration++;
        }

        // Count bot replies in transcript
        if (call.transcript) {
          const agentMessages = call.transcript.split('\n').filter(line => 
            line.trim().toLowerCase().startsWith('agent:')
          );
          totalBotReplies += agentMessages.length;
        }

        // Calculate evaluation success rate
        if (call.evaluation_results && typeof call.evaluation_results === 'object') {
          // Only include calls that are not flagged for review in rating calculation
          if (!call.is_flagged_for_review) {
            const evaluations = Object.values(call.evaluation_results);
            evaluations.forEach(evaluation => {
              if (evaluation && typeof evaluation === 'object' && evaluation.result) {
                totalCriteria++;
                if (evaluation.result === 'success') {
                  totalSuccessfulCriteria++;
                }
              }
            });
          }
        }
      });
    }

    const averageDurationMinutes = callsWithDuration > 0 ? totalDurationMinutes / callsWithDuration : 0;
    const overallRatingPercent = totalCriteria > 0 ? Math.round((totalSuccessfulCriteria / totalCriteria) * 100) : 0;

    const stats = {
      total_calls: totalCalls || 0,
      today_calls: todayCalls || 0,
      week_calls: weekCalls || 0,
      unique_callers: uniqueCallers,
      total_duration_minutes: totalDurationMinutes,
      total_bot_replies: totalBotReplies,
      average_duration_minutes: averageDurationMinutes,
      overall_rating_percent: overallRatingPercent
    };
    
    res.json(stats);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update call flag status
app.patch('/api/calls/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_flagged_for_review } = req.body;
    
    if (typeof is_flagged_for_review !== 'boolean') {
      return res.status(400).json({ error: 'is_flagged_for_review must be a boolean' });
    }
    
    const { data, error } = await supabase
      .from('calls')
      .update({ is_flagged_for_review })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!data) {
      return res.status(404).json({ error: 'Call not found' });
    }
    
    console.log('Call flag status updated:', id, 'flagged:', is_flagged_for_review);
    res.json({ message: 'Call flag status updated successfully', call: data });
    
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    database: 'supabase'
  });
});

// Start server
async function startServer() {
  // Test Supabase connection
  try {
    const { data, error } = await supabase
      .from('calls')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      console.log('Please check your SUPABASE_URL and SUPABASE_ANON_KEY environment variables');
    } else {
      console.log('✅ Supabase connection successful');
    }
  } catch (error) {
    console.error('Supabase connection test failed:', error);
  }
  
  server.on('error', (err) => {
    console.error('HTTP server error:', err);
    process.exit(1);
  });

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Webhook endpoint: http://localhost:${PORT}/webhook/elevenlabs`);
    console.log(`API endpoint: http://localhost:${PORT}/api/calls`);
    console.log(`Database: Supabase (${SUPABASE_URL})`);
  });
}

startServer().catch((error) => {
  console.error('Error starting server:', error);
  process.exit(1);
});

// Add global error handlers for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});