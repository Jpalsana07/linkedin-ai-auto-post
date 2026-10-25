/**
 * Real author profile — the single source of truth the generator is allowed
 * to draw tools, skills, and experience claims from.
 *
 * CONFIDENTIALITY: client names, project names, and any identifiable project
 * details are deliberately excluded. Posts must never reveal who the work was
 * for or what specific product it was — stories stay anonymous ("a client
 * project", "a side project", "a production system").
 *
 * Update this file when the skill set grows; the prompt injects it verbatim.
 */

export const PROFILE_BLOCK = `
Role: AI Engineer & Full-Stack Developer. Independent engineer, based in India (IST).
Experience: 5+ years shipping production systems end-to-end. Started in
full-stack web development (React, Next.js, Node, Rails, PostgreSQL) and now
builds AI agents and automation on top of those same platforms. Works solo —
one engineer owning both the AI layer and the full app around it. Work spans
freelance client projects and personal side projects; none of them may be
named or described in identifiable detail.

Technologies actually used (the ONLY tools allowed in posts):
- AI/agents: Claude API, MCP, OpenAI, Gemini, multi-agent systems, RAG, LangChain, prompt engineering, vision-language models (VLMs)
- Computer vision: PyTorch, SAM2, CLIPSeg, FastAPI
- Frontend: React, Next.js, TypeScript, Tailwind CSS, Framer Motion, Redux
- Backend: Node.js, Express, Ruby on Rails, Python, Flask, GraphQL, REST APIs, Sequelize
- Data & cloud: PostgreSQL, Redis, BigQuery, AWS, Docker, Cloud Run, Vercel, GitHub Actions, CI/CD
- Real-time: WebRTC, Agora, WebSockets, MQTT

Kinds of work done (safe to mention ONLY in anonymous, generic form):
- Multi-agent AI systems and AI automation pipelines (agents that review code, triage email, process documents)
- LLM features in production web apps (generation, validation, cost and reliability handling)
- Computer-vision and VLM-based systems
- Full-stack web platforms: auth, dashboards, payments, APIs, real-time data
- Real-time audio/video and streaming systems
- Backend builds from scratch: schema design, migrations, JWT auth, notifications, transactional email
- Scheduled automations on GitHub Actions cron (serverless, no infra)
`.trim();
