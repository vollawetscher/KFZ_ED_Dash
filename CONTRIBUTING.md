# Contributing to KFZ-Zulassung Erding Call Dashboard

Thank you for your interest in contributing to the KFZ-Zulassung Erding Call Dashboard! This document provides guidelines and information for contributors.

## Table of Contents

- [Project Overview](#project-overview)
- [Getting Started](#getting-started)
- [Development Guidelines](#development-guidelines)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Bug Reports](#bug-reports)
- [Feature Requests](#feature-requests)
- [Code of Conduct](#code-of-conduct)

## Project Overview

This is a production-ready dashboard for monitoring ElevenLabs post-call webhooks with real-time updates, secure webhook handling, and comprehensive call transcript management for the KFZ-Zulassung office in Erding.

**Tech Stack:**
- Frontend: React 18 + TypeScript + Tailwind CSS
- Backend: Node.js + Express
- Database: Supabase (PostgreSQL)
- Real-time: WebSocket
- Icons: Lucide React

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Access to Supabase project
- ElevenLabs webhook configuration

### Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd elevenlabs-webhook-dashboard
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

4. **Database Setup:**
   - Ensure your Supabase project is configured
   - Run the migration files in your Supabase SQL editor
   - Verify the `calls` table is created with proper RLS policies

5. **Start Development:**
   ```bash
   npm run dev    # Frontend only
   npm start      # Backend server
   ```

## Development Guidelines

### Code Style

- **TypeScript**: Use strict TypeScript. All new code should be properly typed.
- **Formatting**: Use consistent indentation (2 spaces) and follow existing patterns.
- **Components**: Keep React components focused and modular.
- **File Organization**: Follow the existing directory structure:
  - `src/components/` - Reusable UI components
  - `src/hooks/` - Custom React hooks
  - `src/types/` - TypeScript type definitions
  - `server/` - Backend Express server code

### Naming Conventions

- **Files**: Use PascalCase for React components (`CallCard.tsx`), camelCase for utilities
- **Variables**: Use camelCase (`isConnected`, `callRecord`)
- **Constants**: Use UPPER_SNAKE_CASE (`API_BASE_URL`)
- **Components**: Use PascalCase (`StatusIndicator`, `SearchFilters`)

### Database Guidelines

- **NEVER modify existing migration files** in `supabase/migrations/`
- **ALWAYS create new migration files** for schema changes
- **Include comprehensive comments** in migration files explaining the changes
- **Test migrations** on a development database first

### Security Considerations

- **Webhook Validation**: Always validate HMAC signatures for webhooks
- **Input Sanitization**: Sanitize all user inputs
- **Environment Variables**: Never commit sensitive data to version control
- **Authentication**: Maintain proper authentication checks

## Commit Message Guidelines

We follow a structured commit message format to maintain clear project history and enable automated tooling.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: New feature for the user
- `fix`: Bug fix for the user
- `docs`: Documentation changes
- `style`: Formatting, missing semicolons, etc. (no code change)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `test`: Adding missing tests or correcting existing tests
- `chore`: Updating build tasks, package manager configs, etc.
- `perf`: Performance improvements
- `ci`: Changes to CI configuration files and scripts

### Scope (optional)

- `api`: Backend API changes
- `ui`: Frontend UI changes
- `db`: Database-related changes
- `webhook`: Webhook handling changes
- `auth`: Authentication-related changes

### Examples

**Good commit messages:**
```
feat(api): add call flagging functionality for review exclusion

This commit adds the ability to flag calls for review, which excludes
them from the overall rating calculation. This helps handle calls that
are not suitable for standard evaluation criteria.

- Add PATCH endpoint for updating call flag status
- Modify stats calculation to exclude flagged calls
- Update frontend to handle flag status updates
```

```
fix(ui): prevent transcript overflow in call cards

The transcript content was overflowing the container on mobile devices.
Added proper text wrapping and container constraints to ensure 
readability across all screen sizes.
```

```
docs: update README with new webhook configuration steps
```

**Avoid these:**
- `fix stuff`
- `update`
- `changes`
- `wip`

### Guidelines

1. **Keep the subject line under 72 characters**
2. **Use the imperative mood** ("Add feature" not "Added feature")
3. **Capitalize the first letter** of the subject line
4. **Don't end the subject line with a period**
5. **Include detailed body** for non-trivial changes explaining WHY, not just WHAT

## Pull Request Process

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes:**
   - Follow the coding guidelines above
   - Write clear, descriptive commit messages
   - Keep commits focused and atomic

3. **Test your changes:**
   - Ensure all existing functionality still works
   - Test webhook endpoints if modified
   - Verify responsive design on different screen sizes

4. **Update documentation:**
   - Update README.md if you've changed setup instructions
   - Add inline code comments for complex logic
   - Update API documentation if endpoints changed

5. **Submit Pull Request:**
   - Use a clear, descriptive title
   - Include a detailed description of what changed and why
   - Reference any related issues
   - Add screenshots for UI changes

### Pull Request Template

```markdown
## Description
Brief description of the changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Documentation update

## Testing
- [ ] Tested locally
- [ ] Webhook functionality verified
- [ ] UI tested on mobile and desktop
- [ ] Database queries tested

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Additional Notes
Any additional information that reviewers should know.
```

## Bug Reports

When reporting bugs, please include:

1. **Clear description** of the issue
2. **Steps to reproduce** the bug
3. **Expected behavior** vs actual behavior
4. **Environment information:**
   - Browser and version
   - Node.js version
   - Operating system
5. **Screenshots or error logs** if applicable
6. **Webhook payload samples** (sanitized) if webhook-related

Use the issue template:
```markdown
**Bug Description:**
A clear description of what the bug is.

**To Reproduce:**
1. Go to '...'
2. Click on '....'
3. See error

**Expected Behavior:**
What you expected to happen.

**Environment:**
- Browser: [e.g. Chrome 91]
- Node.js: [e.g. 18.16.0]
- OS: [e.g. macOS 13.4]

**Additional Context:**
Any other context about the problem.
```

## Feature Requests

When requesting features:

1. **Describe the problem** the feature would solve
2. **Explain the proposed solution** in detail
3. **Consider alternatives** you've thought about
4. **Provide context** about your use case
5. **Consider impact** on existing functionality

## Code of Conduct

### Our Standards

- **Be respectful** and inclusive
- **Be collaborative** and constructive
- **Focus on the code**, not the person
- **Ask questions** when you don't understand something
- **Help others learn** and grow

### Unacceptable Behavior

- Personal attacks or harassment
- Discriminatory language or behavior
- Publishing private information without permission
- Inappropriate or unprofessional conduct

## Questions?

If you have questions about contributing, feel free to:

1. Open an issue with the `question` label
2. Review existing documentation in the repository
3. Check the project's README.md for setup instructions

## Recognition

Contributors will be recognized in our project documentation. Thank you for helping make this project better!

---

*This contributing guide is a living document and may be updated as the project evolves.*