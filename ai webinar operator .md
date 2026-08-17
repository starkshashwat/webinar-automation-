# MOYA WEBINAR ROOM — V1

## MASTER BUILD PROMPT FOR ANTIGRAVITY

---

# 1. PROJECT GOAL

Build a fresh-start web application called:

**MOYA Webinar Room**

The purpose of this application is to provide a simple online webinar room with:

1. Webinar video area
2. Real-time attendee chat
3. AI assistant that continuously reads and answers relevant chat questions
4. Scheduled promotional/CTA messages
5. Course/payment URL insertion
6. Host dashboard to control the AI and CTA automation

The core product is:

> **WEBINAR ROOM + LIVE CHAT + AI CHAT ASSISTANT + SCHEDULED CTA MESSAGES**

Do not build a Zoom clone.

Do not build a complete webinar SaaS.

Do not add CRM, payment processing, analytics, email, WhatsApp, or other features.

The goal is to own the webinar chat experience ourselves instead of depending on Zoom's chat system.

---

# 2. IMPORTANT ARCHITECTURE DECISION

The application must NOT depend on Zoom for chat.

The chat must be completely controlled by our own backend.

Architecture:

```text
                    MOYA WEBINAR ROOM
                           │
             ┌─────────────┴─────────────┐
             │                           │
             ▼                           ▼
        VIDEO AREA                  LIVE CHAT
             │                           │
             │                           ▼
             │                    CHAT SERVER
             │                           │
             │              ┌────────────┴────────────┐
             │              │                         │
             │              ▼                         ▼
             │         AI ASSISTANT              CTA SCHEDULER
             │              │                         │
             │              ▼                         ▼
             │       AI CHAT RESPONSE          PROMOTIONAL MESSAGE
             │              │                         │
             │              └────────────┬────────────┘
             │                           │
             └───────────────────────────▼
                                  LIVE CHAT ROOM
```

The video and chat are separate systems.

V1 must prioritize the chat system.

---

# 3. V1 SCOPE

Build ONLY these features.

## Webinar

- Create webinar
- Set webinar title
- Set webinar date/time
- Start webinar
- End webinar
- Webinar room URL
- Webinar live/waiting/ended status

## Attendee

- Open webinar room
- Enter display name
- Join webinar
- Watch video area
- Send chat messages
- Receive real-time chat messages
- See AI responses
- See scheduled CTA messages

## AI

- Read live chat
- Detect relevant questions
- Answer questions
- FAQ answering
- Intent detection
- Objection handling
- Basic current-session context
- AI ON/OFF

## CTA Automation

- Course URL
- Custom CTA messages
- Message sequence
- Start delay
- Message interval
- Automatic rotation
- Pause
- Resume
- Stop

## Host Dashboard

- Webinar status
- Live chat
- AI ON/OFF
- CTA ON/OFF
- Manual message
- CTA configuration
- Knowledge base
- Message logs

Nothing beyond this.

---

# 4. DO NOT BUILD

Explicitly DO NOT build:

- Zoom integration
- Zoom chat integration
- Zoom SDK
- Zoom OAuth
- CRM
- WhatsApp
- Email
- Payment processing
- Payment verification
- Buyer scoring
- Lead scoring
- Advanced analytics
- Revenue analytics
- AI voice
- AI avatar
- AI presenter
- Webinar transcription
- Automatic presentation control
- Complex RAG
- Vector database
- Multi-tenant billing
- Subscription system
- Affiliate system
- Marketing automation
- Complex workflow builder
- Calendar integration
- Mobile application
- Native desktop application

These are outside V1.

---

# 5. WEBINAR ROOM

Create a public webinar room:

```text
/webinar/[slug]
```

Example:

```text
/webinar/moya-youtube-automation
```

The attendee opens this URL.

---

# 6. ATTENDEE EXPERIENCE

When an attendee opens the room:

```text
┌─────────────────────────────────────────────────────────┐
│ MOYA                                                   │
│                                                         │
│  MOYA YouTube Automation Masterclass                   │
│                                                         │
├─────────────────────────────────┬───────────────────────┤
│                                 │                       │
│                                 │ LIVE CHAT             │
│                                 │                       │
│       WEBINAR VIDEO             │ Rahul:                │
│                                 │ Is this beginner?    │
│                                 │                       │
│                                 │ 🤖 MOYA AI:           │
│                                 │ Yes, MOYA is designed │
│                                 │ for beginners...      │
│                                 │                       │
│                                 │ Priya:                │
│                                 │ How do I enroll?      │
│                                 │                       │
│                                 │ 🤖 MOYA AI:           │
│                                 │ You can enroll here:  │
│                                 │ course-link           │
│                                 │                       │
│                                 │                       │
│                                 │ [ Type message... ]   │
│                                 │ [ Send ]              │
│                                 │                       │
└─────────────────────────────────┴───────────────────────┘
```

The design should be clean and premium.

---

# 7. JOIN FLOW

When someone first opens the webinar room:

```text
Join MOYA Webinar

Your name

[ Enter Webinar ]
```

After clicking:

```text
Attendee joins room
        ↓
Create session
        ↓
Connect WebSocket/realtime channel
        ↓
Load current chat
        ↓
Show webinar
```

No attendee account is required for V1.

Do not create registration/login for attendees.

Only the host/admin requires authentication.

---

# 8. WEBINAR STATES

The webinar has three states:

```text
WAITING
LIVE
ENDED
```

### WAITING

Show:

```text
Webinar starts soon.

[ Webinar title ]

Starting at:
11:00 AM
```

### LIVE

Show:

```text
● LIVE
```

Enable:

- Video
- Chat
- AI responses
- CTA messages

### ENDED

Show:

```text
This webinar has ended.
```

Disable chat input.

---

# 9. WEBINAR VIDEO

For V1, do NOT build custom video streaming infrastructure.

Create a video area that supports an externally provided video/live-stream source.

The host should be able to configure:

```text
Video URL / Embed URL
```

The video system must be abstracted so that later it can be replaced with:

- LiveKit
- WebRTC
- YouTube Live
- another streaming provider
- custom video infrastructure

For V1, the chat system is the main product.

---

# 10. REAL-TIME CHAT

The chat is the most important technical component.

Use:

**WebSocket or Supabase Realtime**

Preferred V1:

**Supabase Realtime**

The flow:

```text
Attendee A
    │
    ▼
Send Message
    │
    ▼
Backend
    │
    ▼
Database
    │
    ▼
Realtime Broadcast
    │
    ├───────────────┐
    ▼               ▼
Attendee B       Attendee C
```

Every attendee currently inside the webinar room should receive new chat messages in real time.

---

# 11. CHAT MESSAGE STRUCTURE

Each message should contain:

```text
id
webinar_id
sender_id
sender_name
message
message_type
created_at
```

Message types:

```text
ATTENDEE
AI
HOST
CTA
SYSTEM
```

---

# 12. CHAT RULES

Attendees can:

- Send messages
- Receive messages

Host can:

- Send messages
- Receive messages

AI can:

- Read incoming attendee messages
- Send AI responses

CTA scheduler can:

- Send promotional messages

---

# 13. AI CHAT ASSISTANT

The AI is the central feature.

The AI should continuously monitor incoming chat messages.

Flow:

```text
New attendee message
        ↓
Is it relevant?
        ↓
YES
        ↓
Detect intent
        ↓
Check knowledge base
        ↓
Check current conversation context
        ↓
Generate response
        ↓
Validate response
        ↓
Send AI message
        ↓
Broadcast to room
```

---

# 14. AI SHOULD NOT ANSWER EVERYTHING

Ignore simple reactions:

```text
🔥
Wow
Nice
Amazing
Hello
😂
Great
```

Respond to relevant messages:

```text
Is this beginner friendly?

What is included?

How much does it cost?

How do I enroll?

Do I get support?

I don't have a YouTube channel.

This is too expensive.

I don't have enough time.
```

---

# 15. INTENT DETECTION

Use simple intent classification.

Supported intents:

```text
QUESTION
COURSE_INFO
PRICE
PAYMENT
ENROLLMENT
FAQ
OBJECTION
GENERAL
```

Example:

```text
"Is this beginner friendly?"
→ COURSE_INFO
```

```text
"How much does it cost?"
→ PRICE
```

```text
"Where can I enroll?"
→ ENROLLMENT
```

```text
"That's too expensive."
→ OBJECTION
```

Do not build an elaborate intent system.

---

# 16. KNOWLEDGE BASE

Create a simple knowledge base.

Admin can add:

```text
Question
Answer
```

Example:

```text
Question:
Is MOYA beginner friendly?

Answer:
Yes, MOYA is designed for beginners and explains the process step by step.
```

Categories are optional.

Do not build a vector database.

Do not build embeddings.

Do not build complex RAG.

For V1, retrieve the most relevant FAQ entries using simple matching or a lightweight AI-assisted retrieval mechanism.

---

# 17. AI SOURCE OF TRUTH

The AI must treat the knowledge base as authoritative.

Never invent:

- Price
- Discount
- Bonus
- Refund policy
- Course duration
- Access duration
- Guarantee
- Certification
- Student results

If the information is unavailable:

```text
I don't have the exact information for that. Please ask the MOYA team.
```

---

# 18. OBJECTION HANDLING

Support basic objections.

Examples:

```text
Price objection
Time objection
Beginner objection
Trust objection
```

The admin can define approved responses.

Example:

```text
Objection:
Too expensive

Approved response:
I understand. The program is designed to provide a complete step-by-step system rather than just individual lessons.
```

The AI should use approved information.

Do not invent discounts.

---

# 19. BASIC CONTEXT MEMORY

Maintain context only for the current webinar session.

Example:

```text
Attendee:
What is included?

AI:
MOYA covers...

Attendee:
Is that beginner friendly?

AI:
Yes, it is designed for beginners...
```

The AI understands that "that" refers to the previous conversation.

Store a small recent message history.

Do not build long-term user memory.

When the webinar ends, the active conversation context can be discarded.

---

# 20. COURSE URL

The admin configures:

```text
Course URL:
https://example.com/moya
```

CTA messages can contain:

```text
{{COURSE_URL}}
```

At send time:

```text
{{COURSE_URL}}
```

is replaced with the configured URL.

The AI should also be able to use this URL when an attendee asks:

```text
Where can I enroll?
Send the payment link.
Where can I join?
```

---

# 21. CTA AUTOMATION

Create a simple CTA campaign.

Example:

```text
Campaign:
MOYA Webinar CTA

Start delay:
10 minutes

Interval:
5 minutes
```

Messages:

```text
1.
Ready to get started with MOYA?
Join here 👇
{{COURSE_URL}}

2.
Want the complete step-by-step system?
Access MOYA here 👇
{{COURSE_URL}}

3.
If you're ready to take the next step,
you can join MOYA here 👇
{{COURSE_URL}}
```

---

# 22. CTA ROTATION

Sequence:

```text
Message 1
   ↓
wait
   ↓
Message 2
   ↓
wait
   ↓
Message 3
   ↓
wait
   ↓
Message 1
   ↓
repeat
```

Never send the same message twice consecutively.

---

# 23. CTA CONTROLS

Host dashboard:

```text
CTA AUTOMATION

● RUNNING

[ PAUSE ]
[ STOP ]
```

Support:

```text
RUNNING
PAUSED
STOPPED
```

When paused:

- AI continues working
- Chat continues working
- CTA messages stop

When AI is paused:

- Chat continues
- CTA continues

The two systems must work independently.

---

# 24. AI ON/OFF

Dashboard:

```text
AI CHAT

● ON

[ TURN OFF ]
```

When OFF:

```text
Attendee messages continue appearing.

AI does not automatically respond.
```

When ON:

```text
AI reads relevant attendee messages
and responds automatically.
```

---

# 25. HOST MANUAL MESSAGE

Host dashboard must have:

```text
Send message

[ Type message here................ ]

[ SEND ]
```

When host sends:

```text
message_type = HOST
```

The message immediately appears in the webinar room.

---

# 26. HOST DASHBOARD

Create:

```text
/admin
```

Dashboard:

```text
┌─────────────────────────────────────────────────────────┐
│ MOYA WEBINAR ROOM                                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Webinar: MOYA YouTube Automation Masterclass           │
│ Status: ● LIVE                                         │
│                                                         │
│ AI CHAT                 CTA AUTOMATION                  │
│ ● ON                   ● RUNNING                       │
│                                                         │
│ [Turn OFF]             [Pause] [Stop]                  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ LIVE CHAT                                               │
│                                                         │
│ Rahul                                                   │
│ Is this beginner friendly?                             │
│                                                         │
│ 🤖 MOYA AI                                              │
│ Yes, MOYA is designed for beginners...                 │
│                                                         │
│ Priya                                                   │
│ How do I enroll?                                       │
│                                                         │
│ 🤖 MOYA AI                                              │
│ You can enroll here 👇                                 │
│ https://example.com                                     │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [ Type message......................... ] [ SEND ]      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

# 27. ADMIN SETTINGS

Create:

```text
/admin/settings
```

Sections:

### Webinar

```text
Title
Slug
Date
Start time
Video URL
```

### Course

```text
Course URL
```

### AI

```text
AI enabled
```

### CTA

```text
Start delay
Interval
Messages
```

### Knowledge Base

```text
Question
Answer
```

---

# 28. MESSAGE LOG

Create a simple message log.

Store:

```text
Time
Sender
Message
Type
```

Example:

```text
11:05:21
Rahul
Is this beginner friendly?
ATTENDEE

11:05:22
MOYA AI
Yes, MOYA is designed for beginners...
AI

11:10:00
MOYA AI
Ready to get started?...
CTA
```

The log is primarily for debugging and visibility.

Do not build advanced analytics.

---

# 29. DATABASE

Use:

**Supabase PostgreSQL**

Keep the schema minimal.

### profiles

```text
id
email
created_at
```

Used only for admin authentication.

---

### webinars

```text
id
title
slug
video_url
scheduled_start
status
course_url
created_at
updated_at
```

Status:

```text
WAITING
LIVE
ENDED
```

---

### webinar_sessions

```text
id
webinar_id
started_at
ended_at
status
```

Used to separate different runs of a webinar.

---

### attendees

```text
id
session_id
display_name
joined_at
last_seen_at
```

No attendee account required.

---

### chat_messages

```text
id
session_id
attendee_id
sender_name
message
message_type
created_at
```

Message type:

```text
ATTENDEE
AI
HOST
CTA
SYSTEM
```

---

### campaigns

```text
id
webinar_id
name
start_delay_seconds
interval_seconds
status
created_at
updated_at
```

Status:

```text
RUNNING
PAUSED
STOPPED
```

---

### campaign_messages

```text
id
campaign_id
message
position
enabled
```

---

### knowledge_base

```text
id
webinar_id
question
answer
enabled
created_at
updated_at
```

---

# 30. REAL-TIME ARCHITECTURE

Use Supabase Realtime.

When an attendee sends:

```text
Attendee
   ↓
POST /api/chat/send
   ↓
Validate
   ↓
Save chat_messages
   ↓
Supabase Realtime
   ↓
All connected clients
```

The AI processing can happen asynchronously after the message is stored.

---

# 31. AI PROCESSING

Use a server-side AI service.

Create:

```text
lib/ai/
├── engine.ts
├── intent.ts
├── context.ts
├── knowledge.ts
└── prompt.ts
```

Main function:

```text
processMessage(message, session)
```

Flow:

```text
processMessage()
      ↓
relevance check
      ↓
intent detection
      ↓
knowledge retrieval
      ↓
context retrieval
      ↓
response generation
      ↓
validation
      ↓
save AI message
      ↓
broadcast
```

---

# 32. AI PROMPT

Use a system prompt similar to:

```text
You are the MOYA Webinar AI Assistant.

You are participating in a live webinar chat.

Your job is to answer attendee questions clearly,
briefly, and helpfully.

Use only approved MOYA information provided to you.

Never invent:
- prices
- discounts
- bonuses
- guarantees
- refund policies
- course features
- results

Keep responses short, normally 1–3 sentences.

If the answer is not available, say that you do not
have the exact information and recommend asking the
MOYA team.

If an attendee asks for the enrollment/payment link,
use the configured course URL.

Maintain basic conversational context during the
current webinar session.
```

---

# 33. CHAT API

Create:

```text
POST /api/chat/send
```

Request:

```json
{
  "sessionId": "...",
  "message": "Is this beginner friendly?"
}
```

Server:

```text
Validate
↓
Create attendee message
↓
Save
↓
Broadcast
↓
AI processing
```

Do not allow attendees to create AI/system/host messages.

The server determines message type.

---

# 34. AI API

Create internal:

```text
POST /api/ai/process
```

It should only be callable server-side.

Input:

```text
session_id
message_id
```

The server retrieves:

- Message
- Session
- Knowledge base
- Recent conversation

Then generates the response.

---

# 35. CTA SCHEDULER

Create:

```text
lib/scheduler/
└── campaign-runner.ts
```

The scheduler must:

1. Detect webinar is LIVE.
2. Wait until `start_delay`.
3. Send first CTA.
4. Wait `interval`.
5. Send next CTA.
6. Rotate through messages.
7. Continue until webinar ends or campaign is stopped.

Do not create Redis/BullMQ/microservices for V1.

However, do not depend on a fragile browser timer.

Persist campaign state:

```text
current_message_position
next_run_at
status
```

This allows the scheduler to recover.

---

# 36. WEBINAR LIFECYCLE

When admin clicks:

```text
START WEBINAR
```

Set:

```text
status = LIVE
```

Create:

```text
webinar_session
```

Then:

```text
Chat → active
AI → active if enabled
CTA → starts according to schedule
```

When admin clicks:

```text
END WEBINAR
```

Set:

```text
status = ENDED
```

Then:

```text
AI stops
CTA stops
Chat becomes read-only
Session closes
```

---

# 37. ADMIN AUTHENTICATION

Only the admin dashboard requires authentication.

Use:

**Supabase Auth**

Attendees do NOT need accounts.

Admin:

```text
/admin/login
```

Attendee:

```text
/webinar/[slug]
```

---

# 38. SECURITY

Implement basic security.

### Admin

Require authentication for:

- Create webinar
- Edit webinar
- Start/end webinar
- Configure AI
- Configure CTA
- Configure knowledge base
- Send host messages

### Attendee

Can only:

- Join public webinar
- Send chat
- Receive chat

An attendee must never be able to:

- send AI messages
- send host messages
- modify webinar
- modify CTA
- modify AI
- access admin APIs

---

# 39. RATE LIMITING

Keep it simple.

Attendee:

```text
Maximum reasonable number of messages per minute.
```

AI:

```text
Do not respond repeatedly to the same attendee
without meaningful new content.
```

CTA:

```text
Never send faster than configured interval.
```

Do not build an advanced rate-limit infrastructure.

---

# 40. PROJECT STRUCTURE

Use this structure:

```text
moya-webinar-room/
│
├── app/
│   │
│   ├── page.tsx
│   │
│   ├── admin/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   │
│   │   ├── page.tsx
│   │   │
│   │   ├── webinars/
│   │   │   └── page.tsx
│   │   │
│   │   └── settings/
│   │       └── page.tsx
│   │
│   ├── webinar/
│   │   └── [slug]/
│   │       └── page.tsx
│   │
│   └── api/
│       │
│       ├── webinars/
│       │   ├── route.ts
│       │   ├── start/route.ts
│       │   └── end/route.ts
│       │
│       ├── chat/
│       │   └── send/route.ts
│       │
│       ├── ai/
│       │   ├── process/route.ts
│       │   └── toggle/route.ts
│       │
│       └── campaigns/
│           ├── route.ts
│           ├── start/route.ts
│           ├── pause/route.ts
│           ├── resume/route.ts
│           └── stop/route.ts
│
├── components/
│   │
│   ├── webinar/
│   │   ├── webinar-room.tsx
│   │   ├── video-player.tsx
│   │   └── webinar-status.tsx
│   │
│   ├── chat/
│   │   ├── chat-panel.tsx
│   │   ├── chat-message.tsx
│   │   ├── chat-input.tsx
│   │   └── chat-list.tsx
│   │
│   ├── admin/
│   │   ├── dashboard.tsx
│   │   ├── live-chat.tsx
│   │   ├── ai-control.tsx
│   │   ├── campaign-control.tsx
│   │   ├── manual-message.tsx
│   │   └── message-log.tsx
│   │
│   └── settings/
│       ├── webinar-settings.tsx
│       ├── ai-settings.tsx
│       ├── cta-settings.tsx
│       └── knowledge-base.tsx
│
├── lib/
│   │
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── queries.ts
│   │
│   ├── ai/
│   │   ├── engine.ts
│   │   ├── intent.ts
│   │   ├── knowledge.ts
│   │   ├── context.ts
│   │   └── prompt.ts
│   │
│   ├── realtime/
│   │   └── chat.ts
│   │
│   └── scheduler/
│       └── campaign-runner.ts
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
│
├── types/
│   ├── webinar.ts
│   ├── chat.ts
│   ├── campaign.ts
│   └── ai.ts
│
├── .env.example
├── README.md
└── package.json
```

Keep this architecture simple.

---

# 41. TECHNOLOGY

Use:

```text
Frontend:
Next.js
TypeScript

UI:
Tailwind CSS
shadcn/ui

Database:
Supabase PostgreSQL

Realtime:
Supabase Realtime

Authentication:
Supabase Auth

AI:
LLM API through a server-side AI service

Hosting:
Vercel-compatible architecture
```

Do not add infrastructure unless absolutely necessary.

---

# 42. ENVIRONMENT VARIABLES

Create:

```text
.env.example
```

Include:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

SUPABASE_SERVICE_ROLE_KEY=

AI_API_KEY=
AI_MODEL=
```

No Zoom credentials are required.

---

# 43. REAL-TIME CHAT DETAILS

Use Supabase Realtime subscriptions.

Attendee:

```text
/webinar/moya-youtube-automation
```

subscribes to:

```text
webinar session channel
```

Example:

```text
session:moya-webinar-123
```

When a new message is inserted:

```text
chat_messages INSERT
       ↓
Supabase Realtime
       ↓
Connected clients
```

All users see the message immediately.

---

# 44. AI MESSAGE BROADCAST

When AI generates a response:

```text
AI
 ↓
chat_messages INSERT
message_type = AI
 ↓
Supabase Realtime
 ↓
All attendees
```

The AI response should look different visually from attendee messages.

Example:

```text
🤖 MOYA AI
Yes, MOYA is designed for beginners...
```

---

# 45. CTA BROADCAST

When scheduler sends CTA:

```text
Scheduler
 ↓
Replace {{COURSE_URL}}
 ↓
chat_messages INSERT
message_type = CTA
 ↓
Realtime
 ↓
All attendees
```

CTA messages should have a visually distinct style.

Example:

```text
🚀 MOYA

Ready to get started?

Join here 👇
https://example.com/moya
```

---

# 46. CURRENT WEBINAR CONTEXT

Allow admin to optionally provide a simple webinar context:

```text
Current webinar topic:
YouTube Automation

Webinar description:
Complete beginner-to-advanced introduction...
```

This can be included in the AI prompt.

Do not build live transcription.

Do not automatically understand the video in V1.

---

# 47. CHAT CONTEXT

Maintain only recent messages for the active session.

Example:

```text
Last 10 relevant messages
```

Use these to answer follow-up questions.

Do not store permanent AI memory.

---

# 48. UI DESIGN

The UI should feel like a premium webinar product.

### Attendee

Focus on:

- Video
- Chat
- Clean typography
- Minimal distractions
- Mobile responsiveness

### Admin

Focus on:

- Live status
- Live chat
- AI toggle
- CTA controls
- Manual reply
- Configuration

Do not add unnecessary dashboard cards.

---

# 49. MOBILE ATTENDEE VIEW

The attendee room must work on mobile.

Desktop:

```text
Video 70%
Chat 30%
```

Mobile:

```text
Video
↓
Chat
```

Chat input remains accessible.

---

# 50. WEBINAR CREATION

Admin can create:

```text
Create Webinar

Title
[ MOYA YouTube Automation Masterclass ]

Slug
[ moya-youtube-automation ]

Date
[ ... ]

Start Time
[ 11:00 AM ]

Video URL
[ ... ]

Course URL
[ ... ]

[ CREATE WEBINAR ]
```

---

# 51. START WEBINAR

Admin dashboard:

```text
WEBINAR

MOYA YouTube Automation Masterclass

Status:
WAITING

[ START WEBINAR ]
```

After clicking:

```text
Status:
● LIVE

[ END WEBINAR ]
```

This is enough for V1.

Do not build complicated event scheduling.

---

# 52. CTA CONFIGURATION

Admin:

```text
CTA AUTOMATION

Start after webinar:
10 minutes

Send every:
5 minutes

Messages:

1.
Ready to get started?
{{COURSE_URL}}

2.
Want the complete system?
Join MOYA:
{{COURSE_URL}}

3.
Enrollment is available here:
{{COURSE_URL}}
```

Controls:

```text
[ SAVE ]

[ START ]
[ PAUSE ]
[ STOP ]
```

---

# 53. AI CONFIGURATION

Admin:

```text
AI CHAT

Status:
● ON

[ TURN OFF ]
```

Knowledge base:

```text
Question
Answer

[ + Add FAQ ]
```

Objections:

```text
Objection
Approved Response

[ + Add Objection ]
```

Keep it simple.

---

# 54. IMPORTANT AI RULE

The AI must never dominate the chat.

It should respond only when an attendee message requires a useful response.

The goal is:

> **AI should feel like a helpful webinar assistant, not a bot replying to every message.**

---

# 55. MESSAGE LOGGING

Every message must be saved.

Example:

```text
ATTENDEE
AI
HOST
CTA
```

Logs should allow the admin to see the conversation during the live webinar.

No advanced analytics required.

---

# 56. ERROR HANDLING

If AI fails:

```text
Do not send anything.
```

If realtime connection fails:

```text
Reconnect automatically.
```

If scheduler fails:

```text
Preserve next_run_at.
Retry on next scheduler cycle.
```

If webinar ends:

```text
Stop AI.
Stop CTA.
Disable attendee chat.
```

---

# 57. DEVELOPMENT ORDER

Build in this order.

## Phase 1 — Foundation

Create:

- Next.js
- TypeScript
- Tailwind
- shadcn/ui
- Supabase
- Admin authentication

---

## Phase 2 — Webinar

Build:

- Webinar creation
- Webinar settings
- Webinar status
- Public webinar URL
- Video area

---

## Phase 3 — Chat

Build:

- Attendee join
- Chat input
- Chat display
- Supabase Realtime
- Message persistence
- Host messages

Do not build AI yet.

First make chat work perfectly.

---

## Phase 4 — AI

Build:

- Knowledge base
- AI service
- Intent detection
- FAQ answering
- Objection handling
- Context
- AI ON/OFF

---

## Phase 5 — CTA

Build:

- Course URL
- CTA messages
- Sequence
- Start delay
- Interval
- Rotation
- Pause
- Resume
- Stop

---

## Phase 6 — Admin Dashboard

Combine:

- Live webinar status
- Live chat
- AI control
- CTA control
- Manual reply
- Knowledge base
- CTA settings
- Message logs

---

## Phase 7 — Testing

Test:

```text
Multiple attendees
Simultaneous messages
AI responses
Follow-up questions
CTA timing
AI OFF
CTA pause
CTA resume
Webinar end
Mobile room
Realtime reconnection
```

---

# 58. FINAL ACCEPTANCE TEST

The V1 is complete when this exact scenario works:

```text
1. Admin logs in.

2. Admin creates MOYA webinar.

3. Admin enters video URL.

4. Admin enters course URL.

5. Admin adds FAQ entries.

6. Admin adds CTA messages.

7. Admin sets:
   Start = 10 minutes
   Interval = 5 minutes.

8. Admin starts webinar.

9. Attendee opens:
   /webinar/moya-youtube-automation

10. Attendee enters name.

11. Attendee joins.

12. Attendee sees webinar video.

13. Attendee sees live chat.

14. Attendee sends:
    "Is this beginner friendly?"

15. Message instantly appears.

16. AI processes it.

17. AI responds.

18. Response appears instantly to all attendees.

19. Attendee asks:
    "How much does it cost?"

20. AI answers using knowledge base.

21. Attendee asks:
    "Where can I enroll?"

22. AI provides configured course URL.

23. Admin can see the conversation.

24. After 10 minutes CTA #1 is automatically sent.

25. Five minutes later CTA #2 is sent.

26. Five minutes later CTA #3 is sent.

27. Sequence rotates.

28. Admin pauses CTA.

29. CTA stops.

30. AI continues responding.

31. Admin turns AI OFF.

32. Chat continues.

33. AI stops responding.

34. Admin manually sends a message.

35. Attendees receive it instantly.

36. Admin turns AI ON.

37. AI resumes responding.

38. Admin ends webinar.

39. AI stops.

40. CTA stops.

41. Chat becomes read-only.

If all of these work, V1 is complete.

---

# 59. MOST IMPORTANT DEVELOPMENT RULE

Do not over-engineer this project.

The first successful version should be small.

The product is NOT:

> "A new Zoom."

The product is:

> **A simple webinar room where the host provides the video and the application owns the live chat, AI interaction, and scheduled CTA system.**

The core loop is:

```text
ATTENDEE
    ↓
WEBINAR ROOM
    ↓
LIVE CHAT
    ↓
AI READS CHAT
    ↓
AI ANSWERS
    ↓
CHAT UPDATES

Meanwhile:

WEBINAR STARTS
    ↓
CTA TIMER
    ↓
PROMOTIONAL MESSAGE
    ↓
COURSE URL
    ↓
CHAT
    ↓
WAIT
    ↓
NEXT MESSAGE
```

Build this loop first.

Do not add anything that is not required for this loop.

Start with **Phase 1: Foundation**, then proceed sequentially through the phases.