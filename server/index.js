import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

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

    // Extrahieren der agent_id aus den dynamic_variables (falls verfügbar)
    const agentId = req.body.data?.conversation_initiation_client_data?.dynamic_variables?.agent_id || 'unknown_agent';

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
      agent_id: agentId,
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

    console.log('New call processed:', data.id, 'from caller:', callerNumber, 'agent:', agentId);
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
        caller_id: callerId,
        agent_id: agentId || 'unknown_agent'
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
app.post('/api/login', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }
    
    console.log('Login attempt with password length:', password.length);
    
    // Get all users from database to check credentials
    const { data: users, error: usersError } = await supabase
      .from('dashboard_users')
      .select('*');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return res.status(500).json({ error: 'Database error during login' });
    }
    
    console.log('Found users in database:', users.length);
    
    // Try to find a user with matching password
    let authenticatedUser = null;
    
    for (const user of users) {
      console.log('Checking user:', user.username);
      console.log('  - Received password:', JSON.stringify(password));
      console.log('  - Stored hash:', JSON.stringify(user.password_hash));
      console.log('  - Password length:', password.length, 'Hash length:', user.password_hash.length);
      try {
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        console.log('  - bcrypt.compare result for', user.username, ':', passwordMatch);
        console.log('  - bcrypt.compare inputs - password type:', typeof password, 'hash type:', typeof user.password_hash);
        if (passwordMatch) {
          authenticatedUser = user;
          break;
        }
      } catch (error) {
        console.error('  - bcrypt.compare error for user:', user.username, error);
        continue;
      }
    }
    
    if (!authenticatedUser) {
      console.log('No matching user found for provided password');
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    console.log('Successfully authenticated user:', authenticatedUser.username);
    
    // Get branding data for allowed agents
    const { data: agentData, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .in('id', authenticatedUser.allowed_agent_ids);

    if (agentError) {
      console.error('Error fetching agent branding data:', agentError);
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Login successful',
      token: 'authenticated',
      username: authenticatedUser.username,
      allowed_agent_ids: authenticatedUser.allowed_agent_ids,
      is_developer: authenticatedUser.is_developer,
      branding_data: agentData || []
    });
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
    const { search, caller, conv_id, from_date, to_date, limit = 50, offset = 0, agent_ids } = req.query;
    
    let query = supabase
      .from('calls')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (agent_ids) {
      const agentIdArray = Array.isArray(agent_ids) ? agent_ids : agent_ids.split(',');
      query = query.in('agent_id', agentIdArray);
    }

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
    const { agent_ids } = req.query;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Base query builder function
    const buildQuery = (baseQuery) => {
      let query = baseQuery;
      if (agent_ids) {
        const agentIdArray = Array.isArray(agent_ids) ? agent_ids : agent_ids.split(',');
        query = query.in('agent_id', agentIdArray);
      }
      return query;
    };

    // Get total calls
    const { count: totalCalls, error: totalError } = await buildQuery(
      supabase.from('calls').select('*', { count: 'exact', head: true })
    );

    // Get today's calls
    const { count: todayCalls, error: todayError } = await buildQuery(
      supabase.from('calls')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', today.toISOString())
    );

    // Get this week's calls
    const { count: weekCalls, error: weekError } = await buildQuery(
      supabase.from('calls')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', thisWeek.toISOString())
    );

    // Get unique callers
    const { data: uniqueCallersData, error: uniqueError } = await buildQuery(
      supabase.from('calls')
        .select('caller_number')
        .neq('caller_number', null)
    );

    // Get all calls with duration and transcript data for advanced stats
    const { data: allCallsData, error: allCallsError } = await buildQuery(
      supabase.from('calls')
        .select('duration, transcript, evaluation_results, is_flagged_for_review')
    );

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

// Get agent configuration
app.get('/api/agent-config/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (error) {
      console.error('Agent config query error:', error);
      return res.status(404).json({ error: 'Agent configuration not found' });
    }
    
    res.json(data);
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

// Temporary endpoint to generate bcrypt hashes (remove in production)
app.get('/api/generate-hash/:password', async (req, res) => {
  try {
    const { password } = req.params;
    const hash = await bcrypt.hash(password, 10);
    res.json({ 
      password: password,
      hash: hash,
      note: 'This endpoint should be removed in production'
    });
  } catch (error) {
    console.error('Hash generation error:', error);
    res.status(500).json({ error: 'Hash generation failed' });
  }
});

// Admin endpoint for creating new agents
app.post('/api/admin/agents', async (req, res) => {
  try {
    console.log('Admin agent creation request received:', {
      body: req.body,
      headers: req.headers['content-type']
    });
    
    const { agent_id, branding_name, evaluation_criteria_config } = req.body;
    
    // Validate required fields
    if (!agent_id || !branding_name) {
      console.log('Validation failed - missing required fields:', {
        agent_id: !!agent_id,
        branding_name: !!branding_name
      });
      return res.status(400).json({ error: 'agent_id and branding_name are required' });
    }
    
    // Validate evaluation_criteria_config if provided
    let criteriaConfig = {};
    if (evaluation_criteria_config) {
      if (typeof evaluation_criteria_config === 'string') {
        try {
          criteriaConfig = JSON.parse(evaluation_criteria_config);
          console.log('Parsed JSON criteria config successfully');
        } catch (error) {
          console.log('JSON parsing error:', error.message);
          return res.status(400).json({ error: 'evaluation_criteria_config must be valid JSON' });
        }
      } else if (typeof evaluation_criteria_config === 'object') {
        criteriaConfig = evaluation_criteria_config;
        console.log('Using object criteria config directly');
      } else {
        console.log('Invalid criteria config type:', typeof evaluation_criteria_config);
        return res.status(400).json({ error: 'evaluation_criteria_config must be an object or JSON string' });
      }
    }
    
    const agentData = {
      id: agent_id,
      branding_name: branding_name,
      evaluation_criteria_config: criteriaConfig
    };
    console.log('Attempting to insert agent data:', agentData);
    
    // Insert agent into database
    const { data, error } = await supabase
      .from('agents')
      .insert([agentData])
      .select()
      .single();

    console.log('Supabase insert result:', {
      data: data,
      error: error ? {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      } : null
    });

    if (error) {
      console.error('Error creating agent:', error);
      if (error.code === '23505') { // Unique constraint violation
        console.log('Unique constraint violation - agent already exists');
        return res.status(409).json({ error: 'Agent with this ID already exists' });
      }
      console.log('Database error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        postgresError: error
      });
      return res.status(500).json({ error: 'Database error creating agent' });
    }

    console.log('New agent created:', data.id, 'with branding:', data.branding_name);
    res.status(201).json({ 
      message: 'Agent created successfully', 
      agent: data 
    });

  } catch (error) {
    console.error('Admin agent creation error:', error);
    console.log('Full error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin endpoint for creating new dashboard users
app.post('/api/admin/users', async (req, res) => {
  try {
    const { username, password, allowed_agent_ids, is_developer } = req.body;
    
    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }
    
    // Validate and parse allowed_agent_ids
    let agentIds = [];
    if (allowed_agent_ids) {
      if (typeof allowed_agent_ids === 'string') {
        agentIds = allowed_agent_ids.split(',').map(id => id.trim()).filter(id => id);
      } else if (Array.isArray(allowed_agent_ids)) {
        agentIds = allowed_agent_ids.filter(id => typeof id === 'string' && id.trim());
      } else {
        return res.status(400).json({ error: 'allowed_agent_ids must be an array or comma-separated string' });
      }
    }
    
    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Insert user into database
    const { data, error } = await supabase
      .from('dashboard_users')
      .insert([{
        username: username,
        password_hash: passwordHash,
        allowed_agent_ids: agentIds,
        is_developer: is_developer || false
      }])
      .select('id, username, allowed_agent_ids, is_developer, created_at')
      .single();

    if (error) {
      console.error('Error creating user:', error);
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ error: 'User with this username already exists' });
      }
      return res.status(500).json({ error: 'Database error creating user' });
    }

    console.log('New user created:', data.username, 'with access to agents:', data.allowed_agent_ids);
    res.status(201).json({ 
      message: 'User created successfully', 
      user: data 
    });

  } catch (error) {
    console.error('Admin user creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin endpoint for listing all agents (useful for the frontend)
app.get('/api/admin/agents', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching agents:', error);
      return res.status(500).json({ error: 'Database error fetching agents' });
    }

    res.json({ agents: data || [] });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin endpoint for listing all dashboard users (useful for the frontend)
app.get('/api/admin/users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('dashboard_users')
      .select('id, username, allowed_agent_ids, is_developer, created_at') // Exclude password_hash for security
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ error: 'Database error fetching users' });
    }

    res.json({ users: data || [] });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Temporary fix endpoint to update incorrect password hashes
app.post('/api/fix-passwords', async (req, res) => {
  try {
    console.log('Fixing password hashes...');
    
    // Generate correct hashes
    const dev123Hash = await bcrypt.hash('dev123', 10);
    const erding123Hash = await bcrypt.hash('erding123', 10);
    
    console.log('Generated hashes:', { dev123Hash, erding123Hash });
    
    // Update developer user password
    const { data: devUpdate, error: devError } = await supabase
      .from('dashboard_users')
      .update({ password_hash: dev123Hash })
      .eq('username', 'developer')
      .select();

    console.log('Developer update result:', { 
      devUpdate, 
      devError: devError ? {
        message: devError.message,
        details: devError.details,
        hint: devError.hint,
        code: devError.code
      } : null
    });
    
    // Update customer user password  
    const { data: customerUpdate, error: customerError } = await supabase
      .from('dashboard_users')
      .update({ password_hash: erding123Hash })
      .eq('username', 'erding_customer')
      .select();

    console.log('Customer update result:', { 
      customerUpdate, 
      customerError: customerError ? {
        message: customerError.message,
        details: customerError.details,
        hint: customerError.hint,
        code: customerError.code
      } : null
    });
    
    if (devError || customerError) {
      console.error('Error updating passwords:', { devError, customerError });
      return res.status(500).json({ error: 'Failed to update passwords' });
    }

    // Verify the updates by fetching the users again
    const { data: verifyUsers, error: verifyError } = await supabase
      .from('dashboard_users')
      .select('username, password_hash')
      .in('username', ['developer', 'erding_customer']);

    console.log('Verification - current users in database:', verifyUsers);
    console.log('Verification error:', verifyError);
    console.log('Password hashes updated successfully');
    res.json({ 
      message: 'Password hashes fixed successfully',
      updated_users: ['developer', 'erding_customer'],
      verification: verifyUsers
    });

  } catch (error) {
    console.error('Password fix error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Debug endpoint to check current password hashes in database
app.get('/api/debug/users', async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('dashboard_users')
      .select('username, password_hash, allowed_agent_ids, is_developer');

    if (error) {
      console.error('Error fetching users for debug:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    // Test the hashes against known passwords
    const testResults = [];
    for (const user of users) {
      const testPassword = user.username === 'developer' ? 'dev123' : 'erding123';
      try {
        const matches = await bcrypt.compare(testPassword, user.password_hash);
        testResults.push({
          username: user.username,
          hash: user.password_hash,
          testPassword,
          hashMatches: matches
        });
      } catch (error) {
        testResults.push({
          username: user.username,
          hash: user.password_hash,
          testPassword,
          hashMatches: false,
          error: error.message
        });
      }
    }

    res.json({ 
      users: users,
      hashTests: testResults
    });
  } catch (error) {
    console.error('Debug users error:', error);
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
    
    // Test new tables
    const { data: agentsData, error: agentsError } = await supabase
      .from('agents')
      .select('count')
      .limit(1);
      
    const { data: usersData, error: usersError } = await supabase
      .from('dashboard_users')
      .select('count')
      .limit(1);
    
    if (agentsError || usersError) {
      console.error('New tables test failed:', { agentsError, usersError });
      console.log('Please ensure the latest migration has been applied');
    } else {
      console.log('✅ Multi-tenancy tables ready');
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