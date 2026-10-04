-- Baslangic temalari: kullanicinin belirttigi 7 nis

INSERT INTO themes (name, description, tags, target_audience, weight) VALUES
('Node.js / Express Architecture', 'Clean architecture, monorepo patterns, use-case design, composition root in Node.js backends', ARRAY['nodejs','architecture','backend'], 'backend developers', 3),
('React / Frontend Engineering', 'React 19 patterns, state management (Zustand + React Query split), performance, form handling', ARRAY['react','frontend','javascript'], 'frontend developers', 3),
('AI / LLM Integration', 'Practical Gemini/LLM API integration, prompt design, AI-assisted development workflows, agents', ARRAY['ai','llm','gemini'], 'developers exploring AI tooling', 3),
('PostgreSQL / Backend Infrastructure', 'Schema design, query optimization, Docker, PM2, deployment practices', ARRAY['postgresql','backend','devops'], 'backend developers', 2),
('Claude & AI Coding Agents', 'How Claude and coding agents work internally, agentic workflows, tool use patterns', ARRAY['claude','ai','agents'], 'developers using AI coding tools', 2),
('Claude vs Gemini Comparisons', 'Practical comparisons between Claude and Gemini models for coding and content tasks', ARRAY['claude','gemini','comparison'], 'developers choosing AI tools', 2),
('React Native / Flutter Mobile', 'Cross-platform mobile development comparisons and patterns between React Native and Flutter', ARRAY['reactnative','flutter','mobile'], 'mobile developers', 2);
