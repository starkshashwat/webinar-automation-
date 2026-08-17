# MOYA WEBINAR ROOM — V1 UI/UX REDESIGN

IMPORTANT:
This is a UI/UX redesign of the EXISTING MOYA Webinar Room V1.

Do NOT rebuild the backend.
Do NOT add new product features.
Do NOT change the existing AI, CTA scheduler, Supabase, or webinar logic unless required to support the UI.

First inspect the existing project and understand the current components.

Then redesign the existing interface.

The goal is:

> Make MOYA Webinar Room feel like a professional webinar platform inspired by the interaction structure of Zoom Webinar, while remaining simpler, cleaner, and MOYA-branded.

==================================================
1. CORE ATTENDEE EXPERIENCE
==================================================

The attendee experience must be VIDEO-FIRST.

The attendee should primarily see:

1. Webinar video
2. Live chat
3. Minimal controls

Attendees must NOT see:

- Participant count
- Participant list
- Attendee names list
- Private messaging
- Direct messaging between attendees
- "People" panel
- Number of viewers
- Attendee profiles

Attendees can ONLY communicate with:

> HOST / MOYA AI

They must NEVER be able to communicate privately with another attendee.

==================================================
2. DESKTOP ATTENDEE LAYOUT
==================================================

Create a professional dark webinar layout.

Structure:

--------------------------------------------------
TOP BAR
--------------------------------------------------

MOYA logo/name

Webinar title

● LIVE

Elapsed time

Fullscreen button

--------------------------------------------------
MAIN AREA
--------------------------------------------------

LEFT / CENTER:

Large webinar video

RIGHT:

Live Chat panel

--------------------------------------------------
BOTTOM
--------------------------------------------------

Minimal control bar

--------------------------------------------------

Approximate layout:

┌─────────────────────────────────────────────────────────┐
│ MOYA     Webinar Title              ● LIVE     ⛶       │
├───────────────────────────────────────┬─────────────────┤
│                                       │                 │
│                                       │   LIVE CHAT     │
│                                       │                 │
│                                       │ Rahul           │
│            WEBINAR VIDEO              │ Is this...      │
│                                       │                 │
│                                       │ 🤖 MOYA AI      │
│                                       │ Yes, MOYA...    │
│                                       │                 │
│                                       │ Priya           │
│                                       │ How do I join?  │
│                                       │                 │
│                                       │ 🤖 MOYA AI      │
│                                       │ Join here...    │
│                                       │                 │
│                                       ├─────────────────┤
│                                       │ Type message…   │
│                                       │              ➤  │
├───────────────────────────────────────┴─────────────────┤
│                    Webinar controls                     │
└─────────────────────────────────────────────────────────┘

The video should have priority.

Chat should occupy approximately 25–30% of the desktop screen.

==================================================
3. CHAT DESIGN
==================================================

The chat must look professional and modern.

Do NOT use a generic admin dashboard table.

Use a real live-chat appearance.

Attendee messages:

Name
Message

AI messages:

🤖 MOYA AI
Message

Host messages:

HOST
Message

CTA messages:

🚀 MOYA
Message + course URL

Example:

Rahul
Is this beginner friendly?

🤖 MOYA AI
Yes, MOYA is designed for beginners and explains everything step by step.

Priya
How can I enroll?

🤖 MOYA AI
You can join MOYA here 👇

https://course-link

CTA:

🚀 MOYA

Ready to get started?

Join here 👇

https://course-link

Use subtle visual differences between:

ATTENDEE
AI
HOST
CTA

Do not make the interface colorful or childish.

==================================================
4. ATTENDEE CHAT PERMISSIONS
==================================================

VERY IMPORTANT.

Attendees must NEVER be able to:

- Message another attendee
- Click another attendee
- Open attendee profile
- Start private conversation
- See participant list
- See participant count

There is only one communication channel:

> ATTENDEE → PUBLIC WEBINAR CHAT → HOST / AI

An attendee's message is visible in the public webinar chat.

The attendee cannot target another attendee.

Do NOT add:

"Message Rahul"

"Reply to Rahul"

"Private message"

"Participants"

"People"

or any equivalent functionality.

==================================================
5. MOBILE ATTENDEE VIEW
==================================================

This is extremely important.

The mobile UI must NOT simply stack:

VIDEO
then
FULL CHAT

That would make the chat consume too much screen space.

Instead, use a video-first mobile webinar interface.

Default mobile layout:

┌─────────────────────────────┐
│ MOYA             ● LIVE     │
├─────────────────────────────┤
│                             │
│                             │
│       WEBINAR VIDEO         │
│                             │
│                             │
│                             │
│                             │
│ Rahul                       │
│ Is this beginner friendly?  │
│                             │
│ 🤖 MOYA AI                  │
│ Yes, it is designed for...  │
│                             │
│ Priya                       │
│ How do I join?              │
│                             │
├─────────────────────────────┤
│ Type message...          ➤  │
└─────────────────────────────┘

The chat should appear as an OVERLAY over the lower portion of the video.

It must NOT permanently occupy 50%+ of the screen.

==================================================
6. MOBILE CHAT OVERLAY
==================================================

Use the visual concept of YouTube Live chat appearing over a live video.

Messages should appear as overlay text near the bottom of the video.

Example:

                VIDEO

        ┌──────────────────────┐
        │                      │
        │                      │
        │                      │
        │ Rahul                │
        │ Is this beginner?    │
        │                      │
        │ 🤖 MOYA AI           │
        │ Yes, absolutely...   │
        │                      │
        │ Priya                │
        │ How can I join?      │
        └──────────────────────┘

The overlay should have a subtle transparent/gradient background so that the text remains readable.

Do NOT put a large opaque chat box over the video.

Do NOT cover the entire video.

The lower approximately 25–35% of the video may be used for chat overlays.

==================================================
7. MOBILE CHAT BEHAVIOR
==================================================

Only recent messages should remain visible.

For example:

Latest 5–8 messages.

Older messages automatically disappear from the overlay.

New messages smoothly appear from the bottom.

The chat should automatically scroll.

The attendee should always see the latest relevant messages.

If there is no new chat:

The video should remain clean.

Do not show a permanent large empty chat panel.

==================================================
8. MOBILE FULLSCREEN MODE
==================================================

When the attendee taps fullscreen:

THE VIDEO MUST BECOME THE PRIMARY FULLSCREEN EXPERIENCE.

Do NOT make the chat disappear completely.

Instead:

Use an overlay chat system.

Example:

┌──────────────────────────────────┐
│                                  │
│          FULLSCREEN VIDEO        │
│                                  │
│                                  │
│                                  │
│ Rahul                            │
│ Is this beginner friendly?       │
│                                  │
│ 🤖 MOYA AI                       │
│ Yes, MOYA is designed for...     │
│                                  │
│ Priya                            │
│ How can I join?                  │
│                                  │
│ 🚀 MOYA                           │
│ Join here 👇                     │
│ course-link                      │
│                                  │
│ [ Type message... ]              │
└──────────────────────────────────┘

The chat overlay must NOT cover the whole screen.

It should be:

- Transparent/semi-transparent
- Bottom aligned
- Limited in height
- Scrollable
- Automatically fading when inactive

==================================================
9. FULLSCREEN CHAT AUTO-HIDE
==================================================

When there is no new chat activity for a few seconds:

The chat overlay should gradually become less prominent.

The video becomes visually dominant.

When a new message arrives:

The latest message appears again.

This creates the feeling of a professional live-streaming platform.

Concept:

NO CHAT ACTIVITY:

VIDEO
VIDEO
VIDEO
VIDEO

Then:

NEW MESSAGE

Rahul:
Is this beginner friendly?

🤖 MOYA AI:
Yes, MOYA is designed for beginners...

Then overlay gradually becomes subtle again.

==================================================
10. FULLSCREEN CONTROLS
==================================================

When the user moves/taps the screen:

Show a minimal control bar.

Example:

┌────────────────────────────────────┐
│ 🔊       💬       ⛶                │
└────────────────────────────────────┘

Controls can include:

Volume
Chat visibility
Fullscreen exit

Do NOT add unnecessary controls.

Do NOT create Zoom-like microphone/camera controls because attendees are not broadcasting audio/video.

==================================================
11. MOBILE CHAT INPUT
==================================================

The attendee should have only one input:

"Message the host..."

or:

"Ask a question..."

Example:

┌───────────────────────────────┐
│ Ask a question...          ➤  │
└───────────────────────────────┘

This input sends to the public webinar chat.

It does NOT allow:

- selecting recipient
- private messaging
- replying to attendee
- direct messages

==================================================
12. AI CHAT VISUAL IDENTITY
==================================================

AI messages should be immediately recognizable.

Use:

🤖 MOYA AI

or a small MOYA AI avatar/icon.

Example:

🤖 MOYA AI
Yes, MOYA is designed for beginners...

AI should look like an assistant, not another attendee.

==================================================
13. CTA MESSAGE DESIGN
==================================================

CTA messages should look different from normal chat.

Example:

┌───────────────────────────────┐
│ 🚀 MOYA                       │
│                               │
│ Ready to get started?         │
│                               │
│ Join MOYA here 👇             │
│ https://course-link           │
└───────────────────────────────┘

Do not make CTA messages huge.

They should attract attention without destroying the webinar experience.

==================================================
14. CTA IN FULLSCREEN
==================================================

When a scheduled CTA is sent during fullscreen:

It should appear as a temporary overlay notification.

Example:

             VIDEO

      ┌──────────────────┐
      │ 🚀 MOYA           │
      │                   │
      │ Ready to start?   │
      │ Join here 👇      │
      │ course-link       │
      └──────────────────┘

Display prominently for several seconds.

Then return to normal chat behavior.

Do not cover the entire screen.

==================================================
15. DESKTOP FULLSCREEN
==================================================

Desktop fullscreen should behave similarly.

Video becomes full screen.

Chat becomes an overlay panel.

Do NOT force the attendee to leave fullscreen to read chat.

Possible layout:

┌──────────────────────────────────────────────┐
│                                              │
│                 VIDEO                        │
│                                              │
│                                              │
│                                              │
│       Rahul                                  │
│       Is this beginner friendly?             │
│                                              │
│       🤖 MOYA AI                             │
│       Yes, MOYA is designed...               │
│                                              │
│                                  [controls]  │
└──────────────────────────────────────────────┘

Chat should occupy only a limited portion of the lower/right area.

==================================================
16. DESKTOP CHAT PANEL
==================================================

Normal desktop mode can use a dedicated right-side chat panel.

Width:

Approximately 320–400px.

Height:

Full available webinar height.

Header:

LIVE CHAT

No participant count.

No participant list.

No attendee directory.

==================================================
17. HOST DASHBOARD
==================================================

Create a separate professional host control room.

Structure:

┌──────────────────────────────────────────────────────────┐
│ MOYA WEBINAR OPERATOR                     ● LIVE         │
├──────────────┬─────────────────────────────┬─────────────┤
│              │                             │             │
│ WEBINAR      │                             │ LIVE CHAT   │
│ CONTROLS     │           VIDEO             │             │
│              │                             │             │
│ ● LIVE       │                             │ Rahul       │
│              │                             │ Question... │
│ AI ● ON      │                             │             │
│              │                             │ 🤖 AI       │
│ CTA ● ON     │                             │ Answer...   │
│              │                             │             │
│ [AI OFF]     │                             │             │
│ [Pause CTA]  │                             │             │
│              │                             │             │
├──────────────┴─────────────────────────────┴─────────────┤
│ Send host message: [............................] [SEND]│
└──────────────────────────────────────────────────────────┘

Host should have access to:

- AI ON/OFF
- CTA ON/OFF
- Pause CTA
- Resume CTA
- Stop CTA
- Manual host message
- Webinar start/end
- Live chat
- Message logs

Do not add unrelated admin features.

==================================================
18. HOST CHAT VIEW
==================================================

Host can see:

- Attendee messages
- AI responses
- CTA messages
- Host messages

Each should have clear labels.

Example:

ATTENDEE
Rahul:
Is this beginner friendly?

AI
🤖:
Yes, MOYA is designed for beginners.

CTA
🚀:
Ready to get started?

HOST
You:
Let's continue with the next section.

==================================================
19. NO PARTICIPANT COUNT
==================================================

This requirement is strict.

Do NOT display:

"124 participants"

"35 viewers"

"People: 124"

"Participants"

"Attendees"

or any similar count.

The attendee should have NO knowledge of how many people are watching.

==================================================
20. NO ATTENDEE-TO-ATTENDEE INTERACTION
==================================================

The system must visually communicate that the chat is moderated.

The attendee is simply participating in:

> MOYA Webinar Chat

They are NOT participating in:

> Community Chat

Do not show:

Reply buttons.

Do not show:

User profile cards.

Do not show:

Private chat.

Do not show:

Direct message.

Do not show:

Participant list.

==================================================
21. RESPONSIVE BREAKPOINTS
==================================================

Desktop:

Video + right chat panel.

Tablet:

Video + narrower chat panel.

Mobile:

Video-first with overlay chat.

Fullscreen mobile:

Full video + temporary chat overlay.

Never allow the chat to permanently consume the majority of the screen.

==================================================
22. DESIGN LANGUAGE
==================================================

Use:

- Professional
- Premium
- Modern
- Dark
- Minimal
- Webinar-focused
- High readability

Avoid:

- Excessive gradients
- Excessive glassmorphism
- Huge cards
- Bright distracting colors
- Dashboard-like attendee UI
- Excessive animations

The interface should feel closer to:

Professional webinar platform
+
YouTube Live viewing experience
+
Modern SaaS

Not a generic admin dashboard.

==================================================
23. ANIMATIONS
==================================================

Use subtle animations:

- New message fade/slide
- CTA appearance
- Chat overlay fade
- Status indicator pulse
- Button hover
- Mobile controls fade

Do not animate every element.

Performance is more important than animation.

==================================================
24. ACCESSIBILITY
==================================================

Ensure:

- High contrast
- Readable chat text
- Large enough mobile controls
- Keyboard navigation on desktop
- Visible focus states
- Proper aria labels
- Input remains usable on mobile keyboards

==================================================
25. IMPORTANT BACKEND RULE

Do NOT change the existing backend architecture unnecessarily.

Preserve:

Supabase
Supabase Realtime
AI Engine
Knowledge Base
CTA Scheduler
next_run_at
Chat Messages
Admin Auth

Only modify backend behavior if required to enforce:

1. Attendees cannot private message each other.
2. Attendees cannot see participant count.
3. Attendees cannot access participant lists.
4. Only HOST/AI can generate host/AI messages.
5. Attendees can only create ATTENDEE messages.

==================================================
26. FINAL USER EXPERIENCE

The attendee experience should feel like:

Open webinar
        ↓
Enter name
        ↓
Join
        ↓
Watch video
        ↓
Chat appears naturally alongside video
        ↓
Ask a question
        ↓
AI answers
        ↓
Continue watching
        ↓
Scheduled CTA appears
        ↓
Course link visible
        ↓
Continue watching/chatting

On mobile:

Open webinar
        ↓
Video takes almost entire screen
        ↓
Chat appears as lightweight overlay
        ↓
New messages appear over lower portion
        ↓
AI answers appear naturally
        ↓
CTA temporarily appears
        ↓
Overlay fades
        ↓
Video remains dominant

==================================================
27. FINAL ACCEPTANCE TEST

Test these exact scenarios:

1. Desktop attendee opens webinar.

2. Video occupies majority of screen.

3. Chat appears on right.

4. No participant count is visible.

5. No participant list is visible.

6. Attendee sends a message.

7. AI responds.

8. Another attendee sends a message.

9. Both messages appear in public chat.

10. No attendee can click/message another attendee.

11. No private messaging exists.

12. Scheduled CTA appears in chat.

13. Course URL appears correctly.

14. Mobile attendee opens webinar.

15. Video remains dominant.

16. Chat appears as an overlay.

17. Chat does not occupy the entire screen.

18. New messages appear near the bottom.

19. Old messages automatically move out.

20. Fullscreen is activated.

21. Video becomes full screen.

22. Chat remains available as an overlay.

23. Chat does not cover the entire fullscreen video.

24. Chat fades when inactive.

25. New messages make the overlay visible again.

26. CTA appears as a temporary overlay.

27. Attendee still cannot see participant count.

28. Attendee still cannot private message anyone.

29. Host can see all chat.

30. Host can manually send a message.

31. Host can toggle AI.

32. Host can pause/resume CTA.

33. Existing AI and CTA functionality continues working.

==================================================
FINAL INSTRUCTION

Do not rebuild the application.

Do not add backend features unrelated to this UI.

Inspect the current implementation first.

Then redesign the existing components to achieve this professional webinar experience.

The most important design principle is:

VIDEO FIRST.

On desktop:
VIDEO + RIGHT CHAT.

On mobile:
VIDEO + OVERLAY CHAT.

In fullscreen:
FULL VIDEO + LIGHTWEIGHT CHAT OVERLAY.

Attendees only communicate with:
HOST + MOYA AI.

Attendees never see:
PARTICIPANT COUNT + PARTICIPANT LIST + PRIVATE CHAT.

Make the result polished enough that it looks like a real commercial webinar platform, not a development prototype.