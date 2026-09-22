"""PromptVeer taxonomy: categories, tools, industries, difficulties, content types, and gamification ranks."""

CATEGORIES = [
    {"name": "AI & Productivity", "emoji": "🧠", "subcategories": [
        "General AI Prompts", "Prompt Engineering", "AI Assistants", "Personal Productivity",
        "Task Automation", "Brainstorming", "Decision Making", "Problem Solving", "Research",
        "Summarization", "Note Taking", "Information Extraction", "Planning", "Time Management",
        "Personal Organization"]},
    {"name": "Business", "emoji": "💼", "subcategories": [
        "Business Strategy", "Business Plans", "Startup Ideas", "Market Research",
        "Competitive Analysis", "Business Operations", "Process Optimization", "SOP Creation",
        "Business Consulting", "Management", "Leadership", "Team Management", "Business Analysis",
        "Pitch Decks", "Investor Relations"]},
    {"name": "Marketing", "emoji": "📣", "subcategories": [
        "Digital Marketing", "Content Marketing", "Social Media Marketing", "SEO",
        "Email Marketing", "Affiliate Marketing", "Influencer Marketing", "Growth Marketing",
        "Performance Marketing", "Brand Strategy", "Marketing Strategy", "Market Research",
        "Customer Research", "Lead Generation", "Conversion Optimization", "Advertising"]},
    {"name": "Writing & Content", "emoji": "✍️", "subcategories": [
        "Blog Writing", "Article Writing", "Copywriting", "Storytelling", "Creative Writing",
        "Technical Writing", "Academic Writing", "Script Writing", "Ghostwriting", "Editing",
        "Proofreading", "Rewriting", "Summarization", "Headlines & Hooks", "Product Descriptions",
        "Case Studies", "White Papers"]},
    {"name": "Social Media", "emoji": "📱", "subcategories": [
        "Instagram", "TikTok", "YouTube", "Facebook", "LinkedIn", "X / Twitter", "Pinterest",
        "Reddit", "Threads", "Social Media Captions", "Reels", "Shorts", "Viral Hooks",
        "Content Calendars", "Community Management", "Social Media Strategy"]},
    {"name": "AI Image Generation", "emoji": "🎨", "subcategories": [
        "General Image Prompts", "Photorealistic Images", "Portraits", "Product Photography",
        "Fashion", "Architecture", "Interior Design", "Landscapes", "Travel", "Food Photography",
        "Advertising", "Logos & Branding", "Illustrations", "Digital Art", "Concept Art",
        "Character Design", "3D Art", "Anime", "Cinematic Images", "Posters", "Thumbnails",
        "Infographics", "Midjourney", "DALL·E", "ChatGPT Images", "Adobe Firefly",
        "Stable Diffusion", "Flux", "Ideogram", "Leonardo AI"]},
    {"name": "AI Video", "emoji": "🎬", "subcategories": [
        "Text-to-Video", "Image-to-Video", "Video Editing", "Cinematic Videos", "Product Videos",
        "Advertisements", "Social Media Videos", "YouTube Videos", "Reels & Shorts",
        "Explainer Videos", "Music Videos", "Film & Storytelling", "Character Animation",
        "UGC Videos", "AI Influencers", "Video Backgrounds", "Sora", "Runway", "Veo", "Kling",
        "Hailuo", "Higgsfield", "Pika", "Luma"]},
    {"name": "Audio & Music", "emoji": "🎧", "subcategories": [
        "Music Generation", "Songwriting", "Lyrics", "Voice Generation", "Voiceovers",
        "Podcasting", "Sound Effects", "Audio Editing", "Background Music", "Jingles",
        "Audiobooks", "Meditation Audio"]},
    {"name": "Coding & Development", "emoji": "💻", "subcategories": [
        "Programming", "Web Development", "App Development", "Mobile Development", "Frontend",
        "Backend", "Full Stack", "Python", "JavaScript", "TypeScript", "React", "Next.js", "PHP",
        "Java", "C#", "SQL", "APIs", "Database Design", "Debugging", "Code Review", "Refactoring",
        "Testing", "DevOps", "Cloud", "Cybersecurity"]},
    {"name": "Website & App Creation", "emoji": "🌐", "subcategories": [
        "Website Design", "Landing Pages", "SaaS", "E-commerce", "Mobile Apps", "Web Apps",
        "UI Design", "UX Design", "Wireframes", "Design Systems", "Website Copy", "SEO Websites",
        "Portfolio Websites", "Business Websites", "AI Apps", "No-Code Development"]},
    {"name": "E-commerce", "emoji": "🛒", "subcategories": [
        "Amazon", "Shopify", "Etsy", "eBay", "Walmart", "Product Research", "Product Listings",
        "Product Descriptions", "Product Titles", "SEO", "Advertising", "Customer Support",
        "Reviews", "Store Branding", "Conversion Optimization", "Dropshipping", "Print-on-Demand"]},
    {"name": "Finance", "emoji": "💰", "subcategories": [
        "Personal Finance", "Budgeting", "Saving", "Investing", "Financial Planning",
        "Expense Analysis", "Business Finance", "Accounting", "Financial Modeling",
        "Financial Reports", "Stock Research", "Cryptocurrency", "Real Estate", "Tax Planning"]},
    {"name": "Career & Jobs", "emoji": "👨‍💼", "subcategories": [
        "Resume/CV", "Cover Letters", "LinkedIn", "Job Search", "Interview Preparation",
        "Salary Negotiation", "Career Planning", "Career Change", "Personal Branding",
        "Networking", "Freelancing", "Remote Jobs", "Professional Emails", "Performance Reviews",
        "Leadership Development"]},
    {"name": "Education", "emoji": "🎓", "subcategories": [
        "Students", "Teachers", "Lesson Plans", "Study Guides", "Exam Preparation",
        "Homework Assistance", "Research", "Presentations", "Flashcards", "Quizzes",
        "Language Learning", "Mathematics", "Science", "History", "Literature",
        "Coding Education", "Special Education"]},
    {"name": "Science & Research", "emoji": "🧪", "subcategories": [
        "Academic Research", "Literature Reviews", "Data Analysis", "Scientific Writing",
        "Research Questions", "Hypothesis Generation", "Experiment Design", "Statistics",
        "Biology", "Chemistry", "Physics", "Environmental Science", "Medical Research"]},
    {"name": "Health & Wellness", "emoji": "🏥", "subcategories": [
        "Fitness", "Workout Planning", "Nutrition", "Meal Planning", "Mental Wellness",
        "Meditation", "Sleep", "Healthy Lifestyle", "Habit Building", "Health Research"]},
    {"name": "Lifestyle", "emoji": "🏠", "subcategories": [
        "Travel", "Food & Cooking", "Recipes", "Home Improvement", "Interior Design", "Gardening",
        "Parenting", "Relationships", "Hobbies", "Personal Development", "Journaling",
        "Goal Setting", "Habits", "Event Planning"]},
    {"name": "Travel", "emoji": "✈️", "subcategories": [
        "Trip Planning", "Itineraries", "Destination Research", "Hotels", "Flights",
        "Budget Travel", "Luxury Travel", "Solo Travel", "Family Travel", "Road Trips",
        "Food Travel", "Travel Content", "Travel Photography", "Visa & Immigration Information"]},
    {"name": "Legal & Compliance", "emoji": "🧑‍⚖️", "subcategories": [
        "Legal Research", "Contracts", "Business Agreements", "Terms & Conditions",
        "Privacy Policies", "Compliance", "HR Policies", "Legal Document Analysis",
        "Intellectual Property", "Employment", "Immigration"]},
    {"name": "Human Resources", "emoji": "🏢", "subcategories": [
        "Recruitment", "Job Descriptions", "Interview Questions", "Candidate Screening",
        "Onboarding", "Employee Communication", "Performance Reviews", "Training",
        "Employee Engagement", "HR Policies", "Workplace Communication"]},
    {"name": "Industry-Specific", "emoji": "🏗️", "subcategories": [
        "Real Estate", "Healthcare", "Education", "Hospitality", "Restaurants", "Travel",
        "Automotive", "Finance", "Insurance", "E-commerce", "Retail", "Construction",
        "Manufacturing", "Technology", "SaaS", "Legal", "Marketing Agencies", "Consulting",
        "Logistics", "Media", "Entertainment", "Nonprofits"]},
    {"name": "AI Tool-Specific", "emoji": "🤖", "subcategories": [
        "ChatGPT", "Claude", "Gemini", "Midjourney", "Sora", "Runway", "Veo", "Kling", "Flux",
        "Ideogram", "Leonardo", "Perplexity", "NotebookLM", "Cursor", "Lovable", "Bolt",
        "Replit", "Canva AI", "Adobe Firefly", "Higgsfield"]},
    {"name": "Startup & Entrepreneurship", "emoji": "🚀", "subcategories": [
        "Startup Ideas", "MVP Development", "Market Validation", "Business Models",
        "Customer Discovery", "Founder Productivity", "Pitch Decks", "Fundraising",
        "Investor Outreach", "Naming", "Branding", "Product Strategy", "Growth", "SaaS",
        "Solopreneur", "Side Hustles"]},
    {"name": "Design", "emoji": "🧑‍🎨", "subcategories": [
        "Graphic Design", "UI Design", "UX Design", "Branding", "Logo Design", "Typography",
        "Color Palettes", "Packaging", "Posters", "Presentations", "Infographics",
        "Social Media Design", "Web Design", "App Design"]},
    {"name": "Data & Analytics", "emoji": "📊", "subcategories": [
        "Data Analysis", "Excel", "Google Sheets", "SQL", "Dashboards", "Data Visualization",
        "Business Intelligence", "Statistics", "Forecasting", "Reporting", "Customer Analytics",
        "Marketing Analytics", "Financial Analytics"]},
    {"name": "Office & Professional Work", "emoji": "📑", "subcategories": [
        "Microsoft Word", "Excel", "PowerPoint", "Google Docs", "Google Sheets", "Google Slides",
        "Notion", "Slack", "Email", "Meeting Notes", "Reports", "Presentations", "Proposals",
        "Project Management"]},
    {"name": "Personal Development", "emoji": "❤️", "subcategories": [
        "Motivation", "Goal Setting", "Confidence", "Communication", "Leadership", "Productivity",
        "Habits", "Time Management", "Journaling", "Decision Making", "Learning",
        "Self-Reflection"]},
    {"name": "Trending & Viral", "emoji": "🔥", "subcategories": [
        "Viral ChatGPT Prompts", "Viral Image Prompts", "Viral Video Prompts", "Trending AI Styles",
        "Trending Social Media Prompts", "Celebrity-Style Concepts", "Viral Reels",
        "Viral TikTok Ideas", "Meme Prompts", "Trending Marketing Prompts"]},
    {"name": "Prompt Templates", "emoji": "🧩", "subcategories": [
        "One-Click Prompts", "Fill-in-the-Blank", "Role-Based Prompts", "Step-by-Step Prompts",
        "Chain-of-Thought", "Structured Output Prompts", "JSON Prompts", "Table Prompts",
        "Persona Prompts", "System Prompts", "Multi-Agent Prompts", "Workflow Prompts",
        "Prompt Chains"]},
    {"name": "Prompt Collections", "emoji": "⭐", "subcategories": [
        "50 Prompts for Entrepreneurs", "100 ChatGPT Prompts for Marketers",
        "25 Prompts for Job Seekers", "50 Prompts for YouTubers", "100 Midjourney Prompts",
        "50 Prompts for Freelancers", "30 Prompts for Students",
        "100 Prompts for Small Businesses", "50 Prompts for Content Creators",
        "25 Prompts for Real Estate Agents"]},
]

TOOLS = [
    "ChatGPT", "Claude", "Gemini", "Perplexity", "Midjourney", "DALL·E", "Stable Diffusion",
    "Adobe Firefly", "Flux", "Ideogram", "Leonardo AI", "Sora", "Runway", "Veo", "Kling",
    "Pika", "Luma", "Hailuo", "Higgsfield", "Cursor", "Lovable", "Bolt", "Replit", "Canva AI",
    "NotebookLM", "Suno", "ElevenLabs",
]

INDUSTRIES = [
    "Real Estate", "Healthcare", "Education", "Hospitality", "Restaurants", "Travel",
    "Automotive", "Finance", "Insurance", "E-commerce", "Retail", "Construction",
    "Manufacturing", "Technology", "SaaS", "Legal", "Marketing Agencies", "Consulting",
    "Logistics", "Media", "Entertainment", "Nonprofits", "General",
]

DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"]

CONTENT_TYPES = ["Text", "Image", "Video", "Audio", "Code"]

# ==================== GAMIFICATION RANKS (Mahabharata warriors) ====================
# score = prompts_uploaded*10 + likes_received*3 + shares_received*5
RANKS = [
    {"level": 1, "name": "Ghatotkach", "medal": "🛡️", "color": "#8D6E63", "min_score": 0,
     "title": "Recruit Warrior"},
    {"level": 2, "name": "Satyaki", "medal": "⚔️", "color": "#A1887F", "min_score": 30,
     "title": "Loyal Charioteer"},
    {"level": 3, "name": "Bhagadatta", "medal": "🐘", "color": "#78909C", "min_score": 75,
     "title": "Elephant Lord"},
    {"level": 4, "name": "Abhimanyu", "medal": "🏹", "color": "#4DB6AC", "min_score": 150,
     "title": "Fearless Prince"},
    {"level": 5, "name": "Bhisma", "medal": "🔱", "color": "#4FC3F7", "min_score": 300,
     "title": "The Grandsire"},
    {"level": 6, "name": "Bhima", "medal": "💪", "color": "#7E57C2", "min_score": 500,
     "title": "The Mighty"},
    {"level": 7, "name": "Ashwatthama", "medal": "💠", "color": "#26A69A", "min_score": 800,
     "title": "Immortal Warrior"},
    {"level": 8, "name": "Karna", "medal": "☀️", "color": "#FFB300", "min_score": 1200,
     "title": "The Sun Champion"},
    {"level": 9, "name": "Drona", "medal": "🎯", "color": "#FF7043", "min_score": 1800,
     "title": "The Grand Master"},
    {"level": 10, "name": "Arjuna", "medal": "👑", "color": "#FFD54F", "min_score": 2500,
     "title": "Supreme Archer"},
]


def compute_score(uploads: int, likes: int, shares: int) -> int:
    return uploads * 10 + likes * 3 + shares * 5


def rank_for_score(score: int) -> dict:
    current = RANKS[0]
    for r in RANKS:
        if score >= r["min_score"]:
            current = r
        else:
            break
    return current


def next_rank_for_score(score: int):
    for r in RANKS:
        if score < r["min_score"]:
            return r
    return None



# ==================== CURATED COLLECTIONS ====================
# Dynamic packs built from existing prompts via a filter spec.
COLLECTIONS = [
    {"id": "midjourney-mastery", "title": "Midjourney Mastery", "subtitle": "Stunning image prompts",
     "emoji": "🎨", "color": "#7C3AED", "filter": {"tool": "Midjourney"}},
    {"id": "chatgpt-essentials", "title": "ChatGPT Essentials", "subtitle": "Everyday power prompts",
     "emoji": "🤖", "color": "#3ED598", "filter": {"tool": "ChatGPT"}},
    {"id": "marketing-power", "title": "Marketing Power Pack", "subtitle": "Grow your brand fast",
     "emoji": "📣", "color": "#FF7043", "filter": {"category": "Marketing"}},
    {"id": "developer-toolkit", "title": "Developer Toolkit", "subtitle": "Ship code faster",
     "emoji": "💻", "color": "#4FC3F7", "filter": {"category": "Coding & Development"}},
    {"id": "career-launchpad", "title": "Career Launchpad", "subtitle": "Land your dream job",
     "emoji": "👨‍💼", "color": "#F5C542", "filter": {"category": "Career & Jobs"}},
    {"id": "ai-video-viral", "title": "AI Video Viral Kit", "subtitle": "Sora, Runway & more",
     "emoji": "🎬", "color": "#A78BFA", "filter": {"category": "AI Video"}},
    {"id": "writers-room", "title": "The Writers' Room", "subtitle": "Copy that converts",
     "emoji": "✍️", "color": "#EC4899", "filter": {"category": "Writing & Content"}},
    {"id": "founder-stack", "title": "Founder Stack", "subtitle": "Build & pitch your startup",
     "emoji": "🚀", "color": "#F59E0B", "filter": {"category": "Startup & Entrepreneurship"}},
]

COLLECTIONS_BY_ID = {c["id"]: c for c in COLLECTIONS}


# ==================== STREAK BADGES ====================
def streak_badge(streak: int):
    if streak >= 30:
        return {"emoji": "☄️", "label": "Legendary"}
    if streak >= 7:
        return {"emoji": "⚡", "label": "Blazing"}
    if streak >= 3:
        return {"emoji": "🔥", "label": "On Fire"}
    if streak >= 1:
        return {"emoji": "✨", "label": "Spark"}
    return {"emoji": "", "label": "No streak"}


# ==================== PREMIUM PACKAGES (infra only — all content free for MVP) ====================
PACKAGES = {
    "supporter": {"name": "Supporter", "amount": 4.99, "currency": "usd",
                  "tagline": "Back the arena", "perks": ["Supporter badge", "Our eternal gratitude"]},
    "pro_monthly": {"name": "PromptVeer Pro", "amount": 9.99, "currency": "usd",
                    "tagline": "Monthly membership", "perks": ["Unlock premium bundles", "Pro warrior badge", "Early access to new packs"]},
    "lifetime": {"name": "Lifetime Access", "amount": 49.99, "currency": "usd",
                 "tagline": "One-time, forever", "perks": ["All premium bundles forever", "Founding warrior badge", "Priority support"]},
}
