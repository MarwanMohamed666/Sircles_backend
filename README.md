# Sircles - Bilingual Community Social Platform

![Sircles](https://img.shields.io/badge/Platform-React%20Native-blue)
![Expo](https://img.shields.io/badge/Framework-Expo%20SDK%2053-000020)
![Database](https://img.shields.io/badge/Database-Supabase-3ECF8E)
![Language](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)

A modern React Native mobile application built with Expo that serves as a bilingual (English/Arabic) community-based social platform. Users can create and join circles (groups), organize events, share posts, and connect with others based on shared interests.

## 🌟 Key Features

### 🔐 Authentication & User Management
- **Supabase Authentication** with email/password
- **Persistent Sessions** with AsyncStorage
- **User Profiles** with interests, demographics, and avatar support
- **Multi-language Support** (English/Arabic with RTL layout)

### 👥 Social Features
- **Interest-based Circles** (groups) with privacy controls
- **Real-time Messaging** within circles
- **Event Management** with RSVP functionality and photo sharing
- **Posts & Social Interactions** with likes, comments, and media attachments
- **Smart Recommendations** for circles based on shared interests
- **Push Notifications** for joins, events, and social interactions

### 🎯 Core Functionality
- **Circle Management**: Create, join, and manage interest-based communities
- **Event Organization**: Plan and coordinate circle events with location and timing
- **Messaging System**: Real-time group communication within circles
- **Content Sharing**: Post updates with media support and engagement tracking
- **User Discovery**: Find and connect with like-minded community members

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ 
- **Expo CLI** (`npm install -g @expo/cli`)
- **Supabase Account** with project setup
- **Mobile Device** or simulator for testing

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd sircles
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
Create `.env.local` file with your Supabase credentials:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
DATABASE_URL=your_database_url
```

4. **Database Setup**
Run the database migration to set up required schema:
```bash
# Execute the schema.sql and migration files in your Supabase dashboard
```

5. **Start the development server**
```bash
npm start
# or for web specifically
npx expo start --web --port 5000
```

## 🏗️ Tech Stack

### Frontend
- **React Native** with Expo SDK 53
- **Expo Router** for file-based routing
- **TypeScript** for type safety
- **Zustand** for state management
- **React Navigation** for tab navigation

### Backend & Database
- **Supabase** (PostgreSQL, Authentication, Real-time, Storage)
- **Row Level Security (RLS)** for data protection
- **Real-time subscriptions** for live updates
- **File storage** for avatars and media

### UI & Experience
- **Custom themed components** with Material Design principles
- **Internationalization** with custom LanguageContext
- **RTL Layout Support** for Arabic
- **Haptic Feedback** for enhanced user experience
- **Image Picker** for avatar and media uploads

## 📁 Project Structure

```
sircles/
├── app/                          # Expo Router file-based routing
│   ├── (tabs)/                   # Main app tabs
│   │   ├── index.tsx             # Home screen
│   │   ├── circles.tsx           # Circles overview
│   │   ├── events.tsx            # Events management
│   │   ├── messages.tsx          # Messaging interface
│   │   ├── notifications.tsx     # Notifications center
│   │   └── profile.tsx           # User profile
│   ├── circle/[id].tsx           # Dynamic circle details
│   ├── event/[id].tsx            # Dynamic event details
│   ├── post/[id].tsx             # Dynamic post details
│   ├── login.tsx                 # Authentication
│   ├── first-time-setup.tsx      # User onboarding
│   └── _layout.tsx               # Root layout
├── components/                   # Reusable UI components
│   ├── ui/                       # Platform-specific UI elements
│   ├── CircleCard.tsx            # Circle display component
│   ├── EventModal.tsx            # Event interaction modal
│   ├── ThemedText.tsx            # Styled text component
│   └── ThemedView.tsx            # Styled view component
├── contexts/                     # React contexts
│   ├── AuthContext.tsx           # Authentication state management
│   └── LanguageContext.tsx       # Internationalization
├── lib/                          # Core utilities and configurations
│   ├── supabase.ts               # Supabase client setup
│   ├── database.ts               # Database utilities
│   ├── circlePrefs.ts            # Circle preferences & suggestions
│   ├── notifications.ts          # Push notification handling
│   └── storage.ts                # File storage utilities
├── stores/                       # Zustand state stores
│   └── circlesStore.ts           # Circles state management
├── types/                        # TypeScript type definitions
│   ├── database.ts               # Database schema types
│   └── supabase.ts               # Supabase-specific types
├── constants/                    # App constants
│   ├── AppTexts.ts               # Localized text content
│   └── Colors.ts                 # Theme colors
├── hooks/                        # Custom React hooks
│   └── useColorScheme.ts         # Theme management
├── migrations/                   # Database migrations
│   └── user_circle_prefs_migration.sql
└── assets/                       # Static assets (images, fonts)
```

## 🗄️ Database Schema

### Core Tables

#### Users
- Managed by Supabase Auth
- Extended with user profiles, interests, and preferences

#### Circles
```sql
circles (
  id: text (PK),
  name: text,
  description: text,
  privacy: text,
  creationdate: timestamptz,
  circle_profile_url: text,
  creator: text (FK to users)
)
```

#### Events
```sql
events (
  id: text (PK),
  title: text,
  description: text,
  date: timestamptz,
  location: text,
  circleid: text (FK to circles),
  creatorid: text (FK to users)
)
```

#### Posts
```sql
posts (
  id: text (PK),
  content: text,
  userid: text (FK to users),
  circleid: text (FK to circles),
  creationdate: timestamptz,
  media_urls: text[]
)
```

### Relationship Tables
- **user_circles**: Many-to-many user-circle memberships
- **user_interests**: User interest mappings
- **circle_interests**: Circle-interest associations
- **user_circle_prefs**: User preferences for circle suggestions
- **event_rsvps**: Event attendance tracking
- **post_likes**: Post engagement tracking

### Advanced Features
- **Suggested Circles View**: Algorithm-based circle recommendations
- **Row Level Security**: Comprehensive data protection policies
- **Real-time Subscriptions**: Live updates for messages and notifications

## 🔧 Key Features Deep Dive

### Circle Suggestion System
The app features an intelligent circle recommendation system:
- **Interest Matching**: Suggests circles based on shared user interests
- **Preference Learning**: Tracks user interactions (interested/not interested)
- **Smart Filtering**: Excludes already joined circles and snoozed suggestions
- **Scoring Algorithm**: Ranks suggestions by relevance score

### Real-time Messaging
- **Group Chat**: Circle-based messaging with real-time updates
- **Message Types**: Text, media attachments, and system messages
- **Presence Indicators**: User online status and typing indicators
- **Message History**: Persistent chat history with timestamp tracking

### Event Management
- **Event Creation**: Rich event details with location and timing
- **RSVP System**: Attendance tracking with going/maybe/not going options
- **Photo Sharing**: Event photos and memories sharing
- **Notifications**: Event reminders and updates

### Internationalization
- **Bilingual Support**: Full English and Arabic language support
- **RTL Layout**: Proper right-to-left layout for Arabic
- **Dynamic Text**: Context-aware text switching
- **Cultural Adaptation**: Localized date, time, and number formats

## 🛠️ Development

### Available Scripts

```bash
# Development
npm start              # Start Expo development server
npm run web           # Start web development server
npm run android       # Start Android development
npm run ios           # Start iOS development

# Quality & Testing
npm run lint          # Run ESLint
npm test             # Run Jest tests
npm run reset-project # Reset to clean state

# Database
npm run db:push       # Push schema changes to database
npm run db:push --force # Force push schema changes
```

### Database Development
- **Schema First**: Define schema in `schema.sql`
- **Migrations**: Use provided migration files for schema updates
- **RLS Policies**: Comprehensive Row Level Security implementation
- **Type Safety**: Generated TypeScript types from Supabase schema

### Code Quality
- **TypeScript**: Full type safety with strict configuration
- **ESLint**: Expo-specific linting rules
- **Jest**: Unit and integration testing framework
- **Consistent Styling**: Themed components and design system

## 🚀 Deployment

### Prerequisites
- Supabase project with production database
- Expo account for publishing
- Environment variables configured

### Build & Deploy
```bash
# Build for production
npx expo build

# Publish to Expo
npx expo publish

# Build native apps
npx expo build:android
npx expo build:ios
```

### Environment Configuration
Ensure all environment variables are set for production:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Database credentials for migrations

## 🔒 Security

### Authentication Security
- **Supabase Auth**: Industry-standard authentication
- **Session Management**: Secure token handling with auto-refresh
- **Password Security**: Bcrypt hashing (handled by Supabase)

### Data Security
- **Row Level Security**: Comprehensive RLS policies on all tables
- **API Key Management**: Secure environment variable handling
- **File Upload Security**: Validated and sanitized file uploads
- **Real-time Security**: Authenticated subscription channels

### Privacy Features
- **Circle Privacy**: Public, private, and invite-only circles
- **Profile Privacy**: Configurable profile visibility
- **Data Control**: User can delete their data and leave circles

## 🧪 Testing

### Test Structure
```bash
# Unit Tests
npm test

# Integration Tests
npm run test:integration

# E2E Tests
npm run test:e2e
```

### Test Coverage
- Authentication flows
- Circle creation and joining
- Event management
- Real-time messaging
- Database operations

## 🤝 Contributing

### Development Workflow
1. **Fork** the repository
2. **Create** feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** changes (`git commit -m 'Add amazing feature'`)
4. **Push** to branch (`git push origin feature/amazing-feature`)
5. **Open** Pull Request

### Code Standards
- Follow TypeScript best practices
- Use consistent naming conventions
- Write comprehensive tests
- Document complex functionality
- Follow Expo and React Native guidelines

## 📚 API Reference

### Authentication
```typescript
// Login user
const { user, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})

// Get current user
const { data: { user } } = await supabase.auth.getUser()
```

### Circles
```typescript
// Fetch suggested circles
const circles = await fetchSuggestedCircles()

// Join a circle
const result = await supabase
  .from('user_circles')
  .insert({ userid: user.id, circleid: circleId })
```

### Events
```typescript
// Create event
const event = await supabase
  .from('events')
  .insert({
    title: 'Event Title',
    description: 'Event Description',
    date: '2024-12-31T20:00:00Z',
    circleid: circleId,
    creatorid: user.id
  })
```

### Real-time Subscriptions
```typescript
// Subscribe to circle messages
const subscription = supabase
  .channel('circle-messages')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'circle_messages',
    filter: `circleid=eq.${circleId}`
  }, (payload) => {
    // Handle new message
  })
  .subscribe()
```

## 🐛 Troubleshooting

### Common Issues

#### App Not Loading
- Check environment variables are set correctly
- Verify Supabase connection
- Ensure proper network connectivity

#### Database Errors
- Run `npm run db:push --force` to sync schema
- Check RLS policies are correctly configured
- Verify user authentication status

#### Real-time Not Working
- Check Supabase real-time is enabled
- Verify subscription channel names
- Ensure proper authentication tokens

#### Suggestions Not Showing
- Check user has interests set up
- Verify view and RPC function exist in database
- Check authentication context in queries

### Debug Mode
Enable debug logging by setting:
```env
EXPO_PUBLIC_DEBUG=true
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Expo Team** for the amazing development platform
- **Supabase** for providing excellent Backend-as-a-Service
- **React Native Community** for continuous improvements
- **Contributors** who help make this project better

---

**Built with ❤️ using React Native, Expo, and Supabase**

For more information, visit our [documentation](./docs/) or reach out to the development team.