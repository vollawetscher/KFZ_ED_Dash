# ElevenLabs Webhook Dashboard

A production-ready multi-tenant dashboard for monitoring ElevenLabs post-call webhooks with real-time updates, secure webhook handling, comprehensive call transcript management, and advanced agent-based filtering.

## Features

### Core Features
- **Secure Webhook Endpoint**: HMAC signature validation for ElevenLabs webhooks
- **Real-time Updates**: WebSocket integration for live call data updates
- **Advanced Search & Filtering**: Filter by caller number, conversation ID, date range, transcript content, and agent
- **AI Evaluation Results**: Display detailed evaluation criteria with collapsible interface for better readability
- **Call Flagging System**: Mark calls for review to exclude them from rating calculations
- **Comprehensive Analytics**: Call statistics and caller insights with filtering by agent
- **Space-Saving Design**: Collapsible evaluation results and conversation transcripts with smooth animations
- **Responsive Design**: Modern UI that works on all devices
- **Production Ready**: Error handling, logging, and security best practices

### Multi-Tenancy Features
- **Agent-Based Multi-Tenancy**: Support for multiple ElevenLabs agents with individual branding
- **User Authentication**: Secure login system with role-based access control
- **Customer Branding**: Each agent can have custom branding names and configurations
- **Developer vs Customer Access**: Developers can see all agents, customers see only their assigned agents
- **Admin Panel**: Create and manage agents and dashboard users
- **Agent Filtering**: Filter calls and statistics by specific agents
- **Real-time Permission Filtering**: Live updates respect user access permissions

## Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL)
- **Real-time**: WebSocket for live updates
- **Security**: HMAC validation, Helmet.js, CORS, bcrypt password hashing
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Quick Start

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Set Environment Variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your webhook secret and Supabase credentials
   ```

   Required environment variables:
   - `WEBHOOK_SECRET`: Your ElevenLabs webhook secret
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_ANON_KEY`: Your Supabase anon key
   - `DASHBOARD_PASSWORD`: Password for simplified authentication (optional)

3. **Set up the Database**:
   The application requires a Supabase database. Run all migration files in order in your Supabase SQL editor:
   
   1. `supabase/migrations/20250714075854_wooden_ember.sql` - Initial calls table
   2. `supabase/migrations/20250715104428_morning_ocean.sql` - Add evaluation results
   3. `supabase/migrations/20250825095154_steep_flame.sql` - Multi-tenancy support
   4. `supabase/migrations/20250825121042_sweet_spark.sql` - User update policy
   5. `supabase/migrations/20250825143742_square_bird.sql` - Agent insert policy
   6. `supabase/migrations/20250825172957_aged_sky.sql` - User insert policy

4. **Start the Application**:
   ```bash
   npm start
   ```

   This will start both the backend server (port 3001) and frontend development server (port 5173).

## User Authentication

### Default Users
After running the migrations, these default users are created:

1. **Developer User**:
   - Username: `developer`
   - Password: `dev123`
   - Access: All agents + Admin panel

2. **Sample Customer User**:
   - Username: `erding_customer`  
   - Password: `erding123`
   - Access: Only KFZ-Zulassung Erding agent

### User Roles

- **Developer Users** (`is_developer: true`):
  - Can see calls from all agents
  - Access to admin panel for creating agents and users
  - Can filter by specific agents or view all
  - Full system access

- **Customer Users** (`is_developer: false`):
  - Can only see calls from their assigned agents
  - Custom branding based on their agents
  - Limited to their specific agent data

## Webhook Configuration

### ElevenLabs Setup

1. Go to your ElevenLabs dashboard
2. Navigate to webhook settings for each agent
3. Configure the following webhooks:
   - **Post-call transcription webhook**: `http://your-domain:3001/webhook/elevenlabs`
   - **Fetch initiation client data webhook**: `http://your-domain:3001/webhook/elevenlabs-initiation-data`
4. Configure the secret key (same as WEBHOOK_SECRET in your .env)

### Webhook Details

#### 1. Initiation Data Webhook (`/webhook/elevenlabs-initiation-data`)

This webhook is called by ElevenLabs when an inbound Twilio call is initiated to fetch dynamic client data.

**Request Payload (from ElevenLabs):**
```json
{
  "caller_id": "+1234567890",
  "agent_id": "agent-123",
  "called_number": "+0987654321",
  "call_sid": "twilio-call-sid-123"
}
```

**Response Format (to ElevenLabs):**
```json
{
  "type": "conversation_initiation_client_data",
  "dynamic_variables": {
    "caller_id": "+1234567890",
    "agent_id": "agent-123"
  }
}
```

#### 2. Post-call Transcription Webhook (`/webhook/elevenlabs`)

This webhook receives the complete call transcript and metadata, including the caller ID and agent ID that were stored during initiation.

### Expected Webhook Payload

**Post-call Transcription Payload:**
```json
{
  "type": "post_call_transcription",
  "event_timestamp": 1705312200,
  "data": {
    "conversation_id": "unique-conversation-id",
    "transcript": [
      {
        "speaker": "agent",
        "text": "Hello, how can I help you?"
      },
      {
        "speaker": "user", 
        "text": "I need help with my registration."
      }
    ],
    "metadata": {
      "call_duration_secs": 120
    },
    "conversation_initiation_client_data": {
      "dynamic_variables": {
        "caller_id": "+1234567890",
        "agent_id": "agent-123"
      }
    },
    "analysis": {
      "evaluation_criteria_results": {
        "response_accuracy": {
          "result": "success",
          "rationale": "Agent provided accurate information",
          "criteria_id": "acc_001"
        }
      }
    }
  }
}
```

## API Endpoints

### Public Endpoints
- `POST /webhook/elevenlabs` - Receive ElevenLabs post-call transcription webhooks
- `POST /webhook/elevenlabs-initiation-data` - Receive ElevenLabs initiation data webhooks
- `POST /api/login` - User authentication endpoint
- `GET /health` - Health check endpoint

### Data Endpoints  
- `GET /api/calls` - Get paginated call records with filtering
  - Query params: `search`, `caller`, `conv_id`, `from_date`, `to_date`, `limit`, `offset`, `agent_ids`
- `GET /api/calls/:id` - Get specific call record
- `GET /api/stats` - Get call statistics (supports `agent_ids` filtering)
- `PATCH /api/calls/:id` - Update call flag status
- `GET /api/agent-config/:agentId` - Get agent configuration

### Admin Endpoints (Developer users only)
- `POST /api/admin/agents` - Create new agent
- `GET /api/admin/agents` - List all agents
- `POST /api/admin/users` - Create new dashboard user  
- `GET /api/admin/users` - List all dashboard users
- `PATCH /api/admin/users/:userId` - Update user permissions

## Database Schema

The application uses **Supabase** (PostgreSQL) with the following main tables:

### `calls` Table
- `id`: UUID primary key (conversation ID)
- `agent_id`: Text, links to the ElevenLabs agent
- `caller_number`: Phone number of the caller
- `transcript`: Full call transcript
- `timestamp`: When the call occurred
- `duration`: Call duration in seconds (optional)
- `processed_at`: When the webhook was processed
- `evaluation_results`: JSONB object containing AI evaluation criteria results
- `is_flagged_for_review`: Boolean flag to exclude calls from rating calculations
- `created_at`: Record creation timestamp

### `agents` Table
- `id`: Text primary key (ElevenLabs agent ID)
- `branding_name`: Display name for the customer/agent
- `evaluation_criteria_config`: JSONB object with evaluation criteria definitions
- `created_at`: Record creation timestamp

### `dashboard_users` Table
- `id`: UUID primary key
- `username`: Unique username for login
- `password_hash`: Bcrypt hashed password
- `allowed_agent_ids`: Array of agent IDs this user can access
- `is_developer`: Boolean flag for admin access
- `created_at`: Record creation timestamp

## Admin Panel

### Creating Agents
1. Log in as a developer user
2. Click "Admin" in the header
3. Go to "Manage Agents" tab
4. Fill in:
   - **Agent ID**: ElevenLabs agent ID (e.g., `agent_01abcd1234...`)
   - **Branding Name**: Customer display name (e.g., "KFZ-Zulassung München")
   - **Evaluation Criteria**: Optional JSON (leave empty to use ElevenLabs configuration)

### Creating Users
1. In admin panel, go to "Manage Users" tab
2. Fill in:
   - **Username**: Login username
   - **Password**: Secure password
   - **Agent IDs**: Comma-separated list of agent IDs they can access
   - **Developer Access**: Check for admin privileges

## Security Features

- **HMAC Signature Validation**: Verifies webhook authenticity
- **CORS Protection**: Configured for secure cross-origin requests
- **Helmet.js**: Security headers for Express.js
- **bcrypt Password Hashing**: Secure password storage
- **Row Level Security**: Database-level access control
- **Input Validation**: Validates required fields and data types
- **Rate Limiting**: Built-in protection against abuse

## Advanced Features

### Call Flagging System
- Mark calls as "flagged for review" to exclude from rating calculations
- Useful for calls that shouldn't count toward quality metrics
- Visual indicators on call cards
- One-click toggle functionality

### Evaluation Results Display
- Collapsible evaluation results with success/failure indicators
- Detailed rationales for each evaluation criterion
- Color-coded success/failure states
- Configurable criterion names via agent configuration

### Real-time Filtering
- WebSocket updates respect user permissions
- New calls appear only for authorized agents
- Active filters applied to real-time updates
- Maintains filter state across sessions

### Agent-based Analytics
- Statistics filtered by user's allowed agents
- Developers can see combined or per-agent statistics  
- Overall rating excludes flagged calls
- Advanced metrics: duration, bot replies, success rates

## Deployment

### Production Environment Variables
```bash
WEBHOOK_SECRET=your-production-secret
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
PORT=3001
NODE_ENV=production
```

### Build and Deploy
```bash
npm run build
npm run server
```

### Docker Support
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "run", "server"]
```

## Monitoring and Logging

The application includes:
- **Console Logging**: All webhook events, user actions, and errors
- **Health Check**: `/health` endpoint for monitoring
- **WebSocket Status**: Real-time connection monitoring
- **Error Tracking**: Comprehensive error handling
- **Authentication Logging**: Login attempts and user actions

## Customization

### Adding New Agents
1. Create agent in ElevenLabs dashboard
2. Configure evaluation criteria in ElevenLabs
3. Use admin panel to add agent with branding information
4. Create customer users with access to the new agent

### Custom Evaluation Criteria Display
- Configure custom criterion names in agent configuration
- Use evaluation_criteria_config JSON to override display names
- Leave empty to use ElevenLabs default configuration

### Branding Customization
- Each agent can have custom branding names
- Customer users see branding specific to their agents
- Developer users see all agent brandings

## Troubleshooting

### Common Issues

1. **Webhook not receiving data**:
   - Verify ElevenLabs webhook configuration
   - Check WEBHOOK_SECRET matches
   - Ensure server is accessible from ElevenLabs

2. **User cannot login**:
   - Check password hash in database
   - Verify user exists in dashboard_users table
   - Check console logs for authentication errors

3. **User sees no data**:
   - Verify allowed_agent_ids in database
   - Check if calls exist for their agents
   - Confirm RLS policies are applied

4. **Real-time updates not working**:
   - Check WebSocket connection status in UI
   - Verify server WebSocket port accessibility
   - Check browser console for connection errors

### Database Migration Issues
If you encounter issues with migrations:
1. Run migrations in the correct order
2. Check Supabase logs for detailed error messages
3. Verify RLS policies are created correctly
4. Ensure all required tables exist

## Support

For issues and questions:
1. Check the console logs for detailed error messages
2. Verify webhook configuration and secret keys
3. Test webhook endpoint with curl or Postman
4. Check Supabase database logs and RLS policies
5. Verify user permissions and agent assignments

## License

This project is licensed under the MIT License.