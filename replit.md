# Overview

Sircles is a React Native mobile application built with Expo that serves as a bilingual (English/Arabic) community-based social platform. The app enables users to create and join circles (groups), organize events, share posts, and connect with others based on shared interests. The application features comprehensive social functionality including messaging, notifications, RSVP systems, and user profile management with real-time data synchronization.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React Native with Expo SDK 53
- **Routing**: Expo Router with file-based routing system using tabs layout
- **State Management**: Zustand for client-side state management (circles store)
- **UI Components**: Custom themed components with Material Design principles
- **Internationalization**: Custom LanguageContext for English/Arabic support with RTL layout handling
- **Navigation**: Tab-based navigation with Home, Profile, Events, Messages, Notifications, and Circles screens

## Authentication & User Management
- **Authentication Provider**: Supabase Auth with email/password authentication
- **Session Management**: AsyncStorage for persistent sessions with auto-refresh tokens
- **User Context**: Custom AuthContext managing user state, profile data, and authentication flows
- **Profile System**: Comprehensive user profiles with interests, demographics, and avatar support

## Data Layer
- **Database**: PostgreSQL via Supabase with Row Level Security (RLS) policies
- **ORM**: Direct Supabase client queries with TypeScript type safety
- **Real-time**: Supabase Realtime for live updates on messages and notifications
- **File Storage**: Supabase Storage for user avatars and media uploads
- **Caching Strategy**: Client-side state management with optimistic updates

## Core Features Architecture
- **Circles System**: Interest-based groups with privacy controls, admin management, and join requests
- **Events Management**: Circle-based events with RSVP functionality and photo sharing
- **Messaging**: Real-time circle-based group messaging
- **Social Features**: Posts with likes, comments, and media attachments
- **Recommendation Engine**: Circle suggestions based on shared user interests
- **Notification System**: Push notifications for joins, events, and social interactions

## Database Schema Design
- **Users Table**: Comprehensive user profiles with demographics and preferences
- **Circles Table**: Group information with privacy settings and member counts
- **Events Table**: Event details with location, timing, and creator information
- **Posts Table**: Social content with media support and engagement tracking
- **Many-to-Many Relationships**: User-Circle memberships, User-Interest mappings, Circle-Interest associations
- **Join Request System**: Pending requests for private circles with approval workflow

# External Dependencies

## Primary Services
- **Supabase**: Backend-as-a-Service providing PostgreSQL database, authentication, real-time subscriptions, and file storage
- **Expo**: Development platform and runtime for React Native applications
- **React Navigation**: Navigation library for tab-based and stack navigation

## UI & Media Libraries
- **Expo Image Picker**: Camera and gallery access for avatar and media uploads
- **React Native Reanimated**: Animation library for smooth UI transitions
- **Expo Vector Icons**: Icon system with Material Icons and SF Symbols support
- **React Native Gesture Handler**: Touch gesture recognition and handling

## Utility Libraries
- **AsyncStorage**: Local storage for session persistence and app preferences
- **React Native URL Polyfill**: URL handling compatibility for React Native
- **Expo Haptics**: Tactile feedback for user interactions
- **React Native WebView**: In-app browser functionality for external links

## Development & Quality
- **TypeScript**: Static type checking with comprehensive type definitions
- **ESLint**: Code linting with Expo-specific configuration
- **Jest**: Testing framework for unit and integration tests