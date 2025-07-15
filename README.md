# ElevenLabs Webhook Dashboard

A production-ready dashboard for monitoring ElevenLabs post-call webhooks with real-time updates, secure webhook handling, and comprehensive call transcript management.

## Features

- **Secure Webhook Endpoint**: HMAC signature validation for ElevenLabs webhooks
- **Real-time Updates**: WebSocket integration for live call data updates
- **Advanced Search & Filtering**: Filter by caller number, date range, and transcript content
- **Comprehensive Analytics**: Call statistics and caller insights
- **Responsive Design**: Modern UI that works on all devices
- **Production Ready**: Error handling, logging, and security best practices

## Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express
- **Real-time**: WebSocket for live updates
- **Security**: HMAC validation, Helmet.js, CORS
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

3. **Set up the Database**:
   The application requires a Supabase database. Run the migration file in your Supabase SQL editor:
   ```sql
   -- Copy and paste the contents of supabase/migrations/create_calls_table.sql
   ```

3. **Start the Application**:
   ```bash
   npm start
   ```

   This will start both the backend server (port 3001) and frontend development server (port 5173).

## Webhook Configuration

### ElevenLabs Setup

1. Go to your ElevenLabs dashboard
2. Navigate to webhook settings
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
    "caller_id": "+1234567890"
  }
}
```

#### 2. Post-call Transcription Webhook (`/webhook/elevenlabs`)

This webhook receives the complete call transcript and metadata, including the caller ID that was stored during initiation.

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
        "caller_id": "+1234567890"
      }
    }
  }
}
```

## API Endpoints

- `POST /webhook/elevenlabs` - Receive ElevenLabs post-call transcription webhooks
- `POST /webhook/elevenlabs-initiation-data` - Receive ElevenLabs initiation data webhooks
- `GET /api/calls` - Get paginated call records with filtering
- `GET /api/calls/:id` - Get specific call record
- `GET /api/stats` - Get call statistics

## Security Features

- **HMAC Signature Validation**: Verifies webhook authenticity
- **CORS Protection**: Configured for secure cross-origin requests
- **Helmet.js**: Security headers for Express.js
- **Input Validation**: Validates required fields and data types
- **Rate Limiting**: Built-in protection against abuse

## Database Integration

The application uses **Supabase** (PostgreSQL) for data storage, providing:

- **Scalable Database**: PostgreSQL with automatic backups
- **Real-time Subscriptions**: Built-in real-time capabilities
- **Row Level Security**: Secure data access policies
- **API Auto-generation**: Automatic REST and GraphQL APIs

### Database Schema

The `calls` table structure:
- `id`: UUID primary key
- `caller_number`: Phone number of the caller
- `transcript`: Full call transcript
- `timestamp`: When the call occurred
- `duration`: Call duration in seconds (optional)
- `processed_at`: When the webhook was processed
- `created_at`: Record creation timestamp

## Deployment

### Production Deployment

1. **Environment Variables**:
   ```bash
   WEBHOOK_SECRET=your-production-secret
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   PORT=3001
   NODE_ENV=production
   ```

2. **Build and Start**:
   ```bash
   npm run build
   npm run server
   ```

3. **Process Management**:
   Consider using PM2 for process management:
   ```bash
   npm install -g pm2
   pm2 start server/index.js --name elevenlabs-dashboard
   ```

### Docker Deployment

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

- **Console Logging**: All webhook events and errors
- **Health Check**: `/health` endpoint for monitoring
- **WebSocket Status**: Real-time connection monitoring
- **Error Tracking**: Comprehensive error handling

## Customization

### Adding New Fields

1. Update the `CallRecord` interface in `src/types/index.ts`
2. Modify the webhook handler in `server/index.js`
3. Update the UI components to display new fields

### Styling

The application uses Tailwind CSS. Customize the design by:

1. Modifying the Tailwind configuration in `tailwind.config.js`
2. Updating component styles in the respective component files
3. Adding custom CSS in `src/index.css`

## Support

For issues and questions:

1. Check the console logs for detailed error messages
2. Verify webhook configuration and secret key
3. Ensure proper network connectivity between ElevenLabs and your server
4. Test the webhook endpoint with curl or Postman

## License

This project is licensed under the MIT License.