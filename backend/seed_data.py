"""~60 real sample prompts seeded into PromptVeer on first launch."""

SEED_PROMPTS = [
    # ---------------- AI & Productivity ----------------
    {"title": "Second Brain Weekly Review", "category": "AI & Productivity", "subcategory": "Personal Productivity", "tool": "ChatGPT", "industry": "General", "difficulty": "Beginner", "use_case": "Weekly planning", "content_type": "Text",
     "content": "Act as my productivity coach. I'll paste my notes, tasks, and wins from this week. Summarize what I accomplished, flag anything I dropped, group my open tasks into Now / Next / Later, and suggest the 3 highest-leverage things to focus on next week. Ask me clarifying questions if my notes are unclear.\n\nMy week:\n[PASTE NOTES HERE]", "likes": 42, "shares": 12},
    {"title": "Meeting Notes to Action Items", "category": "AI & Productivity", "subcategory": "Information Extraction", "tool": "Claude", "industry": "General", "difficulty": "Beginner", "use_case": "Meeting follow-up", "content_type": "Text",
     "content": "You are an executive assistant. Read the raw meeting transcript below and produce: (1) a 3-sentence summary, (2) a bullet list of decisions made, (3) a table of action items with owner and due date, and (4) open questions. Keep it concise.\n\nTranscript:\n[PASTE TRANSCRIPT]", "likes": 65, "shares": 20},
    {"title": "Decision Matrix Builder", "category": "AI & Productivity", "subcategory": "Decision Making", "tool": "ChatGPT", "industry": "General", "difficulty": "Intermediate", "use_case": "Compare options", "content_type": "Text",
     "content": "Help me make a decision using a weighted decision matrix. I'm choosing between: [OPTIONS]. My criteria are: [CRITERIA]. Ask me to weight each criterion 1-5, then score each option, calculate totals, and give me a clear recommendation with the reasoning and the biggest risk of the top choice.", "likes": 28, "shares": 6},

    # ---------------- Business ----------------
    {"title": "One-Page Business Plan Generator", "category": "Business", "subcategory": "Business Plans", "tool": "ChatGPT", "industry": "SaaS", "difficulty": "Intermediate", "use_case": "Business planning", "content_type": "Text",
     "content": "Act as a startup advisor. Based on the idea below, create a one-page business plan covering: problem, solution, target customer, value proposition, revenue model, go-to-market, key metrics, and the top 3 risks. Be specific and avoid buzzwords.\n\nIdea: [DESCRIBE YOUR IDEA]", "likes": 88, "shares": 31},
    {"title": "SWOT Analysis in 5 Minutes", "category": "Business", "subcategory": "Business Analysis", "tool": "Gemini", "industry": "General", "difficulty": "Beginner", "use_case": "Strategic analysis", "content_type": "Text",
     "content": "Perform a detailed SWOT analysis for my business. Present it as a 2x2 table (Strengths, Weaknesses, Opportunities, Threats) with 4-5 points each, then add a short 'Strategic Priorities' section suggesting how to use strengths to capture opportunities.\n\nBusiness: [DESCRIBE]", "likes": 54, "shares": 15},
    {"title": "Investor Pitch Deck Outline", "category": "Business", "subcategory": "Pitch Decks", "tool": "Claude", "industry": "SaaS", "difficulty": "Advanced", "use_case": "Fundraising", "content_type": "Text",
     "content": "You are a Y Combinator partner. Build a 12-slide seed pitch deck outline for my startup. For each slide give the title, the single key message, and the 2-3 data points or visuals it should contain. End with the 3 hardest questions an investor will ask and how I should answer them.\n\nStartup: [DESCRIBE]", "likes": 73, "shares": 24},

    # ---------------- Marketing ----------------
    {"title": "30-Day Content Calendar", "category": "Marketing", "subcategory": "Content Marketing", "tool": "ChatGPT", "industry": "Marketing Agencies", "difficulty": "Intermediate", "use_case": "Content planning", "content_type": "Text",
     "content": "Create a 30-day content calendar for [BRAND] on [PLATFORM]. For each day include: hook, content pillar, format (reel/carousel/story), caption idea, and a CTA. Balance across educational, entertaining, and promotional posts using an 80/20 value-to-sell ratio. Return it as a table.", "likes": 112, "shares": 44},
    {"title": "High-Converting Cold Email", "category": "Marketing", "subcategory": "Email Marketing", "tool": "Claude", "industry": "SaaS", "difficulty": "Intermediate", "use_case": "Outbound sales", "content_type": "Text",
     "content": "Write a 4-email cold outreach sequence to [IDEAL CUSTOMER] for my product [PRODUCT]. Email 1: pattern-interrupt intro. Email 2: value + social proof. Email 3: case study. Email 4: breakup. Keep each under 90 words, one clear CTA, no jargon, conversational tone.", "likes": 96, "shares": 38},
    {"title": "SEO Blog Brief From a Keyword", "category": "Marketing", "subcategory": "SEO", "tool": "ChatGPT", "industry": "General", "difficulty": "Intermediate", "use_case": "Content SEO", "content_type": "Text",
     "content": "Act as an SEO strategist. For the target keyword '[KEYWORD]', create a content brief with: search intent, recommended title (under 60 chars), meta description, H2/H3 outline, 5 related keywords to include, questions to answer (People Also Ask style), and word count target.", "likes": 81, "shares": 27},

    # ---------------- Writing & Content ----------------
    {"title": "Story-Driven LinkedIn Post", "category": "Writing & Content", "subcategory": "Copywriting", "tool": "ChatGPT", "industry": "General", "difficulty": "Beginner", "use_case": "Personal branding", "content_type": "Text",
     "content": "Turn the lesson below into a scroll-stopping LinkedIn post. Open with a 1-line hook, use short punchy lines with white space, tell it as a mini-story, and end with a reflective question. No hashtags in the body, keep it authentic and non-cringe.\n\nLesson: [DESCRIBE]", "likes": 134, "shares": 52},
    {"title": "Rewrite This to Sound Human", "category": "Writing & Content", "subcategory": "Rewriting", "tool": "Claude", "industry": "General", "difficulty": "Beginner", "use_case": "Editing", "content_type": "Text",
     "content": "Rewrite the text below so it sounds natural and human, not AI-generated. Vary sentence length, cut filler and clichés, use active voice, and keep my original meaning. Give me the rewritten version only.\n\nText: [PASTE]", "likes": 158, "shares": 61},
    {"title": "Book Summary in 10 Bullets", "category": "Writing & Content", "subcategory": "Summarization", "tool": "Gemini", "industry": "Education", "difficulty": "Beginner", "use_case": "Learning", "content_type": "Text",
     "content": "Summarize the book '[BOOK TITLE]' by [AUTHOR] into 10 key takeaways I can apply immediately. For each takeaway give a one-line principle and a one-line action step. End with the single most important idea from the book.", "likes": 77, "shares": 19},

    # ---------------- Social Media ----------------
    {"title": "Viral Reel Hook Generator", "category": "Social Media", "subcategory": "Viral Hooks", "tool": "ChatGPT", "industry": "Media", "difficulty": "Beginner", "use_case": "Short-form video", "content_type": "Text",
     "content": "Generate 15 scroll-stopping hooks for a short-form video about [TOPIC]. Mix formats: bold claim, curiosity gap, contrarian take, listicle, and 'I was wrong about...'. Keep each under 8 words and rank them by likely watch-through rate.", "likes": 143, "shares": 58},
    {"title": "YouTube Title + Thumbnail Ideas", "category": "Social Media", "subcategory": "YouTube", "tool": "Claude", "industry": "Media", "difficulty": "Intermediate", "use_case": "YouTube growth", "content_type": "Text",
     "content": "For a video about [TOPIC], give me 10 high-CTR title options (under 60 chars) and, for the top 3, a matching thumbnail concept describing the main visual, the 3-4 words of text overlay, and the emotion it should convey.", "likes": 92, "shares": 33},

    # ---------------- AI Image Generation ----------------
    {"title": "Cinematic Product Shot (Midjourney)", "category": "AI Image Generation", "subcategory": "Product Photography", "tool": "Midjourney", "industry": "E-commerce", "difficulty": "Intermediate", "use_case": "Product marketing", "content_type": "Image",
     "content": "cinematic product photograph of [PRODUCT], placed on a wet black stone surface, dramatic rim lighting, soft volumetric fog, shallow depth of field, water droplets, luxury advertising aesthetic, shot on 85mm lens, hyper-detailed, 8k --ar 4:5 --style raw --v 6", "likes": 121, "shares": 47},
    {"title": "Studio Portrait Prompt", "category": "AI Image Generation", "subcategory": "Portraits", "tool": "Midjourney", "industry": "Media", "difficulty": "Beginner", "use_case": "Headshots", "content_type": "Image",
     "content": "professional studio portrait of [SUBJECT], soft key light with subtle fill, neutral grey backdrop, sharp eyes, natural skin texture, shallow depth of field, shot on 50mm f/1.4, editorial magazine quality --ar 3:4 --style raw --v 6", "likes": 88, "shares": 22},
    {"title": "Minimalist Logo Concept (DALL·E)", "category": "AI Image Generation", "subcategory": "Logos & Branding", "tool": "DALL·E", "industry": "General", "difficulty": "Beginner", "use_case": "Branding", "content_type": "Image",
     "content": "A minimalist, modern vector logo for a brand called '[BRAND]' in the [INDUSTRY] space. Flat design, single geometric mark, clever negative space, 2-color palette, on a plain white background, no text, high contrast, iconic and memorable.", "likes": 104, "shares": 36},
    {"title": "Anime Character Design", "category": "AI Image Generation", "subcategory": "Anime", "tool": "Stable Diffusion", "industry": "Entertainment", "difficulty": "Intermediate", "use_case": "Character art", "content_type": "Image",
     "content": "masterpiece, best quality, anime style character design of [DESCRIBE CHARACTER], full body, dynamic pose, detailed clothing, vibrant colors, cel shading, studio-grade line art, clean white background, character reference sheet", "likes": 69, "shares": 14},

    # ---------------- AI Video ----------------
    {"title": "Sora Cinematic B-Roll", "category": "AI Video", "subcategory": "Cinematic Videos", "tool": "Sora", "industry": "Media", "difficulty": "Intermediate", "use_case": "Cinematic b-roll", "content_type": "Video",
     "content": "A slow cinematic dolly shot gliding through [SCENE], golden hour light streaming through, dust particles floating in the air, shallow depth of field, anamorphic lens flares, film grain, 24fps, moody color grade, photorealistic.", "likes": 97, "shares": 29},
    {"title": "Product Ad in Runway", "category": "AI Video", "subcategory": "Advertisements", "tool": "Runway", "industry": "E-commerce", "difficulty": "Advanced", "use_case": "Video ads", "content_type": "Video",
     "content": "A 5-second premium advertisement for [PRODUCT]: camera orbits the product on a rotating pedestal, studio lighting with soft reflections, seamless gradient background shifting from deep purple to gold, macro detail, high-end commercial look.", "likes": 61, "shares": 18},
    {"title": "Image-to-Video Motion (Kling)", "category": "AI Video", "subcategory": "Image-to-Video", "tool": "Kling", "industry": "Media", "difficulty": "Beginner", "use_case": "Animate photo", "content_type": "Video",
     "content": "Animate this image with subtle, natural motion: gentle hair and fabric movement in a light breeze, slow parallax camera push-in, soft blinking, ambient atmosphere. Keep the subject stable and photorealistic, no morphing artifacts.", "likes": 55, "shares": 11},

    # ---------------- Audio & Music ----------------
    {"title": "Suno Song From a Mood", "category": "Audio & Music", "subcategory": "Music Generation", "tool": "Suno", "industry": "Entertainment", "difficulty": "Beginner", "use_case": "Music creation", "content_type": "Audio",
     "content": "Create a [GENRE] song that feels [MOOD]. Style: [ARTIST/VIBE reference]. Include a catchy chorus about [THEME], a bridge with an emotional lift, and layered harmonies. Tempo around [BPM]. Provide the full lyrics with [Verse], [Chorus], [Bridge] tags.", "likes": 73, "shares": 20},
    {"title": "Podcast Episode Script", "category": "Audio & Music", "subcategory": "Podcasting", "tool": "ChatGPT", "industry": "Media", "difficulty": "Intermediate", "use_case": "Podcast prep", "content_type": "Text",
     "content": "Write a solo podcast episode script on [TOPIC]. Include: a 20-second cold-open hook, a warm intro, 3 main segments with talking points and a personal story each, smooth transitions, and a closing with a clear CTA. Aim for ~12 minutes of speaking time.", "likes": 48, "shares": 9},

    # ---------------- Coding & Development ----------------
    {"title": "Senior Code Reviewer", "category": "Coding & Development", "subcategory": "Code Review", "tool": "Claude", "industry": "Technology", "difficulty": "Advanced", "use_case": "Code quality", "content_type": "Code",
     "content": "Act as a senior engineer reviewing my code. Point out bugs, security issues, and performance problems first, then style and readability. For each issue give severity (High/Med/Low), the line, why it matters, and a corrected snippet. Be direct.\n\n```\n[PASTE CODE]\n```", "likes": 156, "shares": 63},
    {"title": "Explain This Code Like I'm 5", "category": "Coding & Development", "subcategory": "Programming", "tool": "ChatGPT", "industry": "Technology", "difficulty": "Beginner", "use_case": "Learning to code", "content_type": "Code",
     "content": "Explain the code below in plain English. Walk through what it does step by step, define any jargon, describe the inputs and outputs, and give one real-world analogy. Then note one thing that could go wrong.\n\n```\n[PASTE CODE]\n```", "likes": 129, "shares": 41},
    {"title": "Debug With Root Cause", "category": "Coding & Development", "subcategory": "Debugging", "tool": "Claude", "industry": "Technology", "difficulty": "Intermediate", "use_case": "Bug fixing", "content_type": "Code",
     "content": "I'm getting this error: [ERROR]. Here is the relevant code and what I expected vs what happened. Diagnose the root cause (not just the symptom), explain why it happens, give the fix, and suggest how to prevent this class of bug in future.\n\nCode:\n```\n[PASTE]\n```", "likes": 118, "shares": 37},
    {"title": "Generate a REST API Spec", "category": "Coding & Development", "subcategory": "APIs", "tool": "ChatGPT", "industry": "Technology", "difficulty": "Advanced", "use_case": "API design", "content_type": "Code",
     "content": "Design a RESTful API for [FEATURE]. Provide the resource model, all endpoints (method, path, purpose), request/response JSON examples, status codes, auth approach, and pagination strategy. Follow REST best practices and note 2 edge cases to handle.", "likes": 84, "shares": 26},

    # ---------------- Website & App Creation ----------------
    {"title": "Landing Page Copy That Converts", "category": "Website & App Creation", "subcategory": "Landing Pages", "tool": "Claude", "industry": "SaaS", "difficulty": "Intermediate", "use_case": "Website copy", "content_type": "Text",
     "content": "Write high-converting landing page copy for [PRODUCT]. Include: hero headline + subhead, 3 benefit sections (feature → benefit → proof), objection-handling FAQ (5 Qs), social proof section, and a strong final CTA. Target audience: [WHO]. Tone: [TONE].", "likes": 101, "shares": 34},
    {"title": "SaaS Wireframe Plan", "category": "Website & App Creation", "subcategory": "Wireframes", "tool": "ChatGPT", "industry": "SaaS", "difficulty": "Intermediate", "use_case": "Product design", "content_type": "Text",
     "content": "Act as a product designer. For a SaaS app that does [FUNCTION], describe the wireframe for the 5 core screens. For each screen list the key components, the primary user action, and the navigation. Keep it lean for an MVP.", "likes": 57, "shares": 13},

    # ---------------- E-commerce ----------------
    {"title": "Amazon Listing Optimizer", "category": "E-commerce", "subcategory": "Product Listings", "tool": "ChatGPT", "industry": "E-commerce", "difficulty": "Intermediate", "use_case": "Marketplace SEO", "content_type": "Text",
     "content": "Optimize my Amazon listing for [PRODUCT]. Provide: a keyword-rich title (under 200 chars), 5 benefit-driven bullet points, a persuasive product description, and 10 backend search terms. Focus on buyer intent keywords and address the top 3 customer objections.", "likes": 89, "shares": 28},
    {"title": "Shopify Product Description", "category": "E-commerce", "subcategory": "Product Descriptions", "tool": "Claude", "industry": "Retail", "difficulty": "Beginner", "use_case": "E-commerce copy", "content_type": "Text",
     "content": "Write a compelling Shopify product description for [PRODUCT]. Start with an emotional hook, describe key features as benefits, add a short specs list, and end with a scarcity/urgency CTA. Keep it skimmable with short paragraphs. Brand voice: [VOICE].", "likes": 66, "shares": 16},

    # ---------------- Finance ----------------
    {"title": "Personal Budget Builder", "category": "Finance", "subcategory": "Budgeting", "tool": "ChatGPT", "industry": "Finance", "difficulty": "Beginner", "use_case": "Personal finance", "content_type": "Text",
     "content": "Help me build a monthly budget using the 50/30/20 rule. My monthly take-home income is [AMOUNT] and my fixed costs are [LIST]. Create a budget table, flag where I'm overspending, and suggest 3 realistic ways to save more. (This is general information, not financial advice.)", "likes": 74, "shares": 21},
    {"title": "Explain a Stock Like a Analyst", "category": "Finance", "subcategory": "Stock Research", "tool": "Gemini", "industry": "Finance", "difficulty": "Intermediate", "use_case": "Investment research", "content_type": "Text",
     "content": "Give me an objective research overview of [COMPANY/TICKER]: what the business does, how it makes money, key strengths, key risks, and what metrics matter most for this type of company. Present both the bull and bear case. (Educational only, not financial advice.)", "likes": 52, "shares": 12},

    # ---------------- Career & Jobs ----------------
    {"title": "ATS-Optimized Resume Rewrite", "category": "Career & Jobs", "subcategory": "Resume/CV", "tool": "ChatGPT", "industry": "General", "difficulty": "Intermediate", "use_case": "Job applications", "content_type": "Text",
     "content": "Rewrite my resume bullet points to be ATS-friendly and results-driven. Use the formula 'Action verb + what I did + measurable result'. Mirror keywords from this job description: [JD]. Keep each bullet to one line. Here are my current bullets:\n[PASTE]", "likes": 147, "shares": 55},
    {"title": "Interview Answer With STAR", "category": "Career & Jobs", "subcategory": "Interview Preparation", "tool": "Claude", "industry": "General", "difficulty": "Beginner", "use_case": "Interview prep", "content_type": "Text",
     "content": "Help me answer the interview question '[QUESTION]' using the STAR method (Situation, Task, Action, Result). Ask me for the details you need, then craft a confident, concise 60-90 second answer in my voice. Avoid clichés.", "likes": 98, "shares": 30},
    {"title": "Cold LinkedIn Connection Message", "category": "Career & Jobs", "subcategory": "Networking", "tool": "ChatGPT", "industry": "General", "difficulty": "Beginner", "use_case": "Networking", "content_type": "Text",
     "content": "Write a short, genuine LinkedIn connection request to [PERSON/ROLE] at [COMPANY]. Reference something specific about them, explain why I'm reaching out, and keep it under 300 characters with no salesy tone. Give me 3 variations.", "likes": 63, "shares": 17},

    # ---------------- Education ----------------
    {"title": "Personal Study Plan", "category": "Education", "subcategory": "Study Guides", "tool": "ChatGPT", "industry": "Education", "difficulty": "Beginner", "use_case": "Exam prep", "content_type": "Text",
     "content": "Create a study plan for [SUBJECT/EXAM]. My exam is on [DATE] and I can study [HOURS] per day. Break the syllabus into daily topics, use spaced repetition, schedule practice tests, and include buffer/revision days. Return it as a week-by-week table.", "likes": 91, "shares": 25},
    {"title": "Explain a Concept 3 Ways", "category": "Education", "subcategory": "Homework Assistance", "tool": "Claude", "industry": "Education", "difficulty": "Beginner", "use_case": "Understanding topics", "content_type": "Text",
     "content": "Explain [CONCEPT] three ways: (1) like I'm 5, (2) like I'm a high-school student, (3) like I'm preparing for an exam with the technical details. End with a simple analogy and 3 practice questions with answers.", "likes": 85, "shares": 23},

    # ---------------- Science & Research ----------------
    {"title": "Literature Review Synthesizer", "category": "Science & Research", "subcategory": "Literature Reviews", "tool": "Claude", "industry": "Education", "difficulty": "Advanced", "use_case": "Academic research", "content_type": "Text",
     "content": "I'll paste abstracts from several papers on [TOPIC]. Synthesize them into a mini literature review: identify common themes, points of disagreement, methods used, gaps in the research, and suggest 2 future research questions. Cite each paper by author.\n\nAbstracts:\n[PASTE]", "likes": 47, "shares": 10},
    {"title": "Research Hypothesis Generator", "category": "Science & Research", "subcategory": "Hypothesis Generation", "tool": "Gemini", "industry": "Education", "difficulty": "Intermediate", "use_case": "Research design", "content_type": "Text",
     "content": "Based on my research area '[AREA]' and this observation '[OBSERVATION]', propose 5 testable hypotheses. For each, state the independent and dependent variables, a suggested method to test it, and a possible confounding factor to control for.", "likes": 33, "shares": 7},

    # ---------------- Health & Wellness ----------------
    {"title": "Beginner Workout Plan", "category": "Health & Wellness", "subcategory": "Workout Planning", "tool": "ChatGPT", "industry": "Healthcare", "difficulty": "Beginner", "use_case": "Fitness", "content_type": "Text",
     "content": "Create a 4-week beginner workout plan. Goal: [GOAL]. I can train [DAYS] days/week at [HOME/GYM] with [EQUIPMENT]. Include warm-up, main sets with reps, and cooldown, and progress the difficulty each week. (Informational only — consult a professional before starting.)", "likes": 108, "shares": 39},
    {"title": "7-Day Meal Plan", "category": "Health & Wellness", "subcategory": "Meal Planning", "tool": "Gemini", "industry": "Healthcare", "difficulty": "Beginner", "use_case": "Nutrition", "content_type": "Text",
     "content": "Build a 7-day meal plan for someone who wants [GOAL] with a daily target around [CALORIES] calories. Dietary preferences: [PREFS]. Include breakfast, lunch, dinner, and 2 snacks per day, plus a consolidated grocery list. (Informational, not medical advice.)", "likes": 95, "shares": 32},

    # ---------------- Lifestyle / Travel ----------------
    {"title": "7-Day Trip Itinerary", "category": "Travel", "subcategory": "Itineraries", "tool": "ChatGPT", "industry": "Travel", "difficulty": "Beginner", "use_case": "Trip planning", "content_type": "Text",
     "content": "Plan a 7-day itinerary for [DESTINATION] for [TRAVELERS] with a [BUDGET] budget. Interests: [INTERESTS]. For each day give morning/afternoon/evening activities, food recommendations, realistic travel times, and one hidden-gem tip. Group nearby sights to minimize backtracking.", "likes": 126, "shares": 49},
    {"title": "Weeknight Dinner From My Fridge", "category": "Lifestyle", "subcategory": "Recipes", "tool": "Gemini", "industry": "General", "difficulty": "Beginner", "use_case": "Cooking", "content_type": "Text",
     "content": "I have these ingredients: [LIST]. Suggest 3 quick dinner recipes I can make in under 30 minutes using mostly what I have. For the best one, give me step-by-step instructions, timing, and a simple substitution if I'm missing something.", "likes": 79, "shares": 18},

    # ---------------- Legal & Compliance ----------------
    {"title": "Plain-English Contract Explainer", "category": "Legal & Compliance", "subcategory": "Legal Document Analysis", "tool": "Claude", "industry": "Legal", "difficulty": "Intermediate", "use_case": "Contract review", "content_type": "Text",
     "content": "Explain this contract clause in plain English. Tell me what it means, what obligations it puts on me, any risks or red flags, and what questions I should ask before signing. (This is general information, not legal advice — consult a qualified lawyer.)\n\nClause:\n[PASTE]", "likes": 58, "shares": 14},
    {"title": "Privacy Policy Draft", "category": "Legal & Compliance", "subcategory": "Privacy Policies", "tool": "ChatGPT", "industry": "Technology", "difficulty": "Intermediate", "use_case": "Compliance drafting", "content_type": "Text",
     "content": "Draft a starter privacy policy for my [APP/WEBSITE] that collects [DATA TYPES]. Cover what we collect, how we use it, third parties, user rights, and contact info in clear sections. (Draft for review only — have a lawyer verify before publishing.)", "likes": 41, "shares": 8},

    # ---------------- Human Resources ----------------
    {"title": "Job Description Writer", "category": "Human Resources", "subcategory": "Job Descriptions", "tool": "ChatGPT", "industry": "General", "difficulty": "Beginner", "use_case": "Recruitment", "content_type": "Text",
     "content": "Write an inclusive, compelling job description for a [ROLE]. Include: a short company/role intro, responsibilities, must-have vs nice-to-have skills, what success looks like in 90 days, and a note on benefits. Avoid gendered language and unnecessary jargon.", "likes": 62, "shares": 15},
    {"title": "Structured Interview Questions", "category": "Human Resources", "subcategory": "Interview Questions", "tool": "Claude", "industry": "General", "difficulty": "Intermediate", "use_case": "Hiring", "content_type": "Text",
     "content": "Create a structured interview guide for a [ROLE]. Provide 8 questions grouped by competency (skills, problem-solving, culture-fit), what a strong vs weak answer looks like for each, and a 1-5 scoring rubric so I can evaluate candidates consistently.", "likes": 44, "shares": 9},

    # ---------------- Startup & Entrepreneurship ----------------
    {"title": "Validate My Startup Idea", "category": "Startup & Entrepreneurship", "subcategory": "Market Validation", "tool": "Claude", "industry": "SaaS", "difficulty": "Intermediate", "use_case": "Idea validation", "content_type": "Text",
     "content": "Act as a skeptical investor. Stress-test my startup idea: [IDEA]. Identify the riskiest assumptions, who exactly the customer is, why now, how big the market is, the likely CAC vs LTV concerns, and 3 cheap experiments I could run this week to validate demand.", "likes": 87, "shares": 27},
    {"title": "Brand Name Generator", "category": "Startup & Entrepreneurship", "subcategory": "Naming", "tool": "ChatGPT", "industry": "General", "difficulty": "Beginner", "use_case": "Branding", "content_type": "Text",
     "content": "Generate 20 brand name ideas for a [DESCRIBE BUSINESS]. Mix invented words, real words, and compound names. For my top 5 favorites (you pick), explain the meaning, check if it's easy to spell/say, and suggest a matching tagline. Vibe: [VIBE].", "likes": 71, "shares": 19},

    # ---------------- Design ----------------
    {"title": "Brand Color Palette", "category": "Design", "subcategory": "Color Palettes", "tool": "ChatGPT", "industry": "Marketing Agencies", "difficulty": "Beginner", "use_case": "Brand design", "content_type": "Text",
     "content": "Create a brand color palette for [BRAND] that feels [ADJECTIVES]. Give me a primary, secondary, and accent color with hex codes, plus neutral tones for text and backgrounds. Explain the psychology of each choice and show an example pairing for a button and heading.", "likes": 68, "shares": 16},
    {"title": "UX Copy Microcopy Pack", "category": "Design", "subcategory": "UX Design", "tool": "Claude", "industry": "SaaS", "difficulty": "Intermediate", "use_case": "Product UX", "content_type": "Text",
     "content": "Write UX microcopy for my app's [FLOW]. Provide: button labels, empty-state message, success toast, error message, and a helpful tooltip. Keep it clear, friendly, and concise, and make error messages reassuring with a next step.", "likes": 53, "shares": 11},

    # ---------------- Data & Analytics ----------------
    {"title": "Excel Formula Builder", "category": "Data & Analytics", "subcategory": "Excel", "tool": "ChatGPT", "industry": "General", "difficulty": "Beginner", "use_case": "Spreadsheets", "content_type": "Text",
     "content": "I need an Excel formula that [WHAT YOU WANT]. My data is laid out like this: [DESCRIBE COLUMNS/RANGE]. Give me the exact formula, explain each part, and show a quick example. If there's a cleaner alternative (like a pivot table), mention it.", "likes": 113, "shares": 40},
    {"title": "SQL Query From Plain English", "category": "Data & Analytics", "subcategory": "SQL", "tool": "Claude", "industry": "Technology", "difficulty": "Intermediate", "use_case": "Data querying", "content_type": "Code",
     "content": "Write a SQL query for this request: [WHAT YOU WANT]. My tables and columns are: [SCHEMA]. Give the query, explain the joins and filters, and note any indexes that would make it faster. Use readable formatting and aliases.", "likes": 90, "shares": 29},

    # ---------------- Office & Professional Work ----------------
    {"title": "Turn Notes Into a Slide Deck", "category": "Office & Professional Work", "subcategory": "Presentations", "tool": "Gemini", "industry": "General", "difficulty": "Intermediate", "use_case": "Presentations", "content_type": "Text",
     "content": "Turn my rough notes into a presentation outline. For each slide give a title, 3-4 bullet points, and a speaker note with what to say. Aim for [N] slides, a clear narrative arc, and one strong closing call to action.\n\nNotes:\n[PASTE]", "likes": 76, "shares": 21},
    {"title": "Professional Email Rewriter", "category": "Office & Professional Work", "subcategory": "Email", "tool": "ChatGPT", "industry": "General", "difficulty": "Beginner", "use_case": "Business communication", "content_type": "Text",
     "content": "Rewrite my draft email to be clear, professional, and polite while keeping it concise. Fix tone, structure it with a clear ask, and suggest a subject line. Give me 2 versions: one formal, one warmer.\n\nDraft:\n[PASTE]", "likes": 122, "shares": 45},

    # ---------------- Personal Development ----------------
    {"title": "90-Day Goal Roadmap", "category": "Personal Development", "subcategory": "Goal Setting", "tool": "Claude", "industry": "General", "difficulty": "Beginner", "use_case": "Goal planning", "content_type": "Text",
     "content": "Help me turn my goal '[GOAL]' into a 90-day roadmap. Break it into monthly milestones and weekly actions, define how I'll measure progress, list likely obstacles with a plan for each, and suggest one habit that would move the needle most.", "likes": 99, "shares": 31},
    {"title": "Daily Reflection Journal Coach", "category": "Personal Development", "subcategory": "Journaling", "tool": "ChatGPT", "industry": "General", "difficulty": "Beginner", "use_case": "Self-reflection", "content_type": "Text",
     "content": "Be my journaling coach. Ask me 5 short reflective questions about my day, one at a time, waiting for my answer before the next. At the end, summarize the themes, highlight one win, and suggest one small intention for tomorrow.", "likes": 67, "shares": 15},

    # ---------------- Trending & Viral ----------------
    {"title": "Viral 'Hot Take' Thread", "category": "Trending & Viral", "subcategory": "Trending Social Media Prompts", "tool": "ChatGPT", "industry": "Media", "difficulty": "Intermediate", "use_case": "Viral content", "content_type": "Text",
     "content": "Write a viral-style X/Twitter thread (8-10 posts) with a contrarian but defensible take on [TOPIC]. Open with a bold hook, back each claim with a reason or example, use short punchy lines, and end with a memorable one-liner and a soft CTA.", "likes": 137, "shares": 54},

    # ---------------- Prompt Templates ----------------
    {"title": "Master Persona Prompt Template", "category": "Prompt Templates", "subcategory": "Persona Prompts", "tool": "ChatGPT", "industry": "General", "difficulty": "Advanced", "use_case": "Prompt engineering", "content_type": "Text",
     "content": "You are [ROLE] with [YEARS] years of experience in [DOMAIN]. Your goal is to [OBJECTIVE]. Constraints: [CONSTRAINTS]. Audience: [AUDIENCE]. Tone: [TONE]. Before answering, ask me any clarifying questions. Then respond in this format: [FORMAT]. If you're unsure, say so instead of guessing.", "likes": 149, "shares": 60},
    {"title": "Structured JSON Output Prompt", "category": "Prompt Templates", "subcategory": "JSON Prompts", "tool": "Claude", "industry": "Technology", "difficulty": "Advanced", "use_case": "Structured output", "content_type": "Code",
     "content": "Extract the following from the text and return ONLY valid JSON matching this schema (no markdown, no commentary): {\"title\": string, \"summary\": string, \"tags\": string[], \"sentiment\": \"positive|neutral|negative\"}. If a field is unknown, use null.\n\nText:\n[PASTE]", "likes": 104, "shares": 35},

    # ---------------- Prompt Collections ----------------
    {"title": "50 Prompts for Content Creators (Starter)", "category": "Prompt Collections", "subcategory": "50 Prompts for Content Creators", "tool": "ChatGPT", "industry": "Media", "difficulty": "Beginner", "use_case": "Creator toolkit", "content_type": "Text",
     "content": "Act as my content strategist. Generate a starter pack of 50 content ideas for a creator in the [NICHE] niche, grouped into: educational, storytelling, behind-the-scenes, engagement/polls, and promotional. For each idea give a one-line hook I can use as the opening.", "likes": 118, "shares": 43},
    {"title": "25 Prompts for Real Estate Agents", "category": "Prompt Collections", "subcategory": "25 Prompts for Real Estate Agents", "tool": "ChatGPT", "industry": "Real Estate", "difficulty": "Beginner", "use_case": "Real estate marketing", "content_type": "Text",
     "content": "Generate 25 ready-to-use prompts for a real estate agent covering: listing descriptions, open-house social posts, cold outreach to sellers, neighborhood guides, and client follow-up emails. Present them grouped by category with a short label for each.", "likes": 61, "shares": 13},
]
