# Flashealo.com - Event Photo Sharing Platform

A modern, responsive web application for sharing photos at events like weddings, quinceañeras, and parties. Built with React, TypeScript, and Supabase.

## Features

- **QR Code Generation**: Create unique QR codes for each event
- **Mobile Photo Upload**: Guests can upload photos directly from their phones
- **Real-time Dashboard**: Monitor photo uploads and engagement
- **Photo Moderation**: Review and approve photos before they appear in galleries
- **Responsive Design**: Optimized for mobile, tablet, and desktop
- **Secure Storage**: Photos stored securely with Supabase
- **HEIC Support**: Automatic conversion of iPhone HEIC images to JPG

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query (React Query)
- **Icons**: Lucide React
- **Charts**: Recharts
- **QR Codes**: qrcode library

## Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd flashealo-com
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new Supabase project
   - Run the database migration in `supabase/migrations/create_flashealo_schema.sql`
   - Create a storage bucket named `event-photos`
   - Copy your project URL and anon key

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Fill in your Supabase credentials in `.env`

5. **Start the development server**
   ```bash
   npm run dev
   ```

## Database Schema

The application uses three main tables:

- **events**: Store event information, QR codes, and privacy settings
- **photos**: Store uploaded photos with moderation status
- **subscriptions**: Manage user plans and custom branding

## Key Components

- **QRGenerator**: Creates downloadable QR codes for events
- **PhotoUploader**: Mobile-optimized photo upload interface
- **StatsDashboard**: Real-time analytics with charts
- **ImageModerationQueue**: Photo approval/rejection interface

## Deployment

The application is designed to work with Supabase's built-in hosting or can be deployed to any static hosting service like Netlify or Vercel.

## License

MIT License - see LICENSE file for details