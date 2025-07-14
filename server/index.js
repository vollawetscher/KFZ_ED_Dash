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
  console.error('WebSocket server error (wss instance):', error);
});

// Webhook endpoint for ElevenLabs
app.post('/webhook/elevenlabs', async (req, res) => {
  try {
    console.log('Webhook received:', {
      headers: req.headers,
      body: req.body,
      method: req.method,
      url: req.url
    });

    const signature = req.headers['x-elevenlabs-signature'];
    const payload = JSON.stringify(req.body);

    // Validate HMAC signature if provided
    if (signature && !validateHMACSignature(payload, signature, WEBHOOK_SECRET)) {
      console.error('Invalid HMAC signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Extract relevant data from webhook payload
    const { caller_number, transcript, call_id, timestamp, duration } = req.body;
    
    if (!caller_number || !transcript) {
      console.error('Missing required fields:', req.body);
      return res.status(400).json({ error: 'Missing required fields: caller_number, transcript' });
    }

    // Create call record
    const callRecord = {
      id: call_id || crypto.randomUUID(),
      caller_number,
      transcript,
      timestamp: timestamp || new Date().toISOString(),
      duration: duration || null,
      processed_at: new Date().toISOString()
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

    console.log('New call processed:', data.id);
    res.status(200).json({ message: 'Webhook processed successfully', call_id: data.id });

  } catch (error) {
    console.error('Webhook processing error:', error);
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
    const { search, caller, from_date, to_date, limit = 50, offset = 0 } = req.query;
    
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

    if (totalError || todayError || weekError || uniqueError) {
      console.error('Stats query error:', { totalError, todayError, weekError, uniqueError });
      return res.status(500).json({ error: 'Database error' });
    }

    const uniqueCallers = uniqueCallersData 
      ? [...new Set(uniqueCallersData.map(call => call.caller_number))].length 
      : 0;

    const stats = {
      total_calls: totalCalls || 0,
      today_calls: todayCalls || 0,
      week_calls: weekCalls || 0,
      unique_callers: uniqueCallers
    };
    
    res.json(stats);
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
      console.error('Supabase connection test failed (DB error):', error);
      console.log('Please check your SUPABASE_URL and SUPABASE_ANON_KEY environment variables');
    } else {
      console.log('✅ Supabase connection successful');
    }
  } catch (error) {
    console.error('Supabase connection test failed (catch block):', error);
  }
  
  // Add error handler for the HTTP server
  server.on('error', (err) => {
    console.error('HTTP server error (server.on error):', err);
    // If the server cannot listen, this is a critical error
    // We explicitly exit the process to get a clear exit code
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
  console.error('Error starting server (startServer catch):', error);
  process.exit(1); // Ensure process exits on startup error
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
