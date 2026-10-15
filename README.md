# Event Tickets (Phase 1 MVP)

## Run it on your computer
1. Install Node.js (LTS version) from https://nodejs.org
2. In this folder, copy `.env.example` to `.env` and fill in your Supabase URL and anon key
   (Supabase > Project Settings > API).
3. Open a terminal in this folder and run:
       npm install
       npm run dev
4. Open the link it prints (usually http://localhost:5173), go to the host login,
   and sign in with the host user you created in Supabase.

Never put the Supabase service_role / secret key in this project.
