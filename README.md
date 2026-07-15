# BuyForYou
Your Personal AI Buying Agent

Stop Searching.
Start Deciding.

## The Core Philosophy
People don't struggle to BUY.
People struggle to DECIDE.

BuyForYou exists to remove decision fatigue.

Instead of showing thousands of products, BuyForYou interviews the user, understands the real need, searches the entire internet, collects trustworthy opinions, filters fake reviews, compares products intelligently, explains WHY one product is better, and finally helps the user buy with confidence.

---

## Getting Started

BuyForYou is an agentic AI buying consultant comprising:
1. A **Next.js** React Frontend.
2. A **FastAPI** Python API Server running a multi-agent workflow.

### Setup and Running

1. **Install Python packages**:
   ```bash
   pip install -r requirements.txt
   pip install fastapi uvicorn python-dotenv tavily-python google-api-python-client google-search-results praw
   ```
2. **Configure Environment**:
   Create a `.env` file in the root directory:
   ```env
   GOOGLE_API_KEY="your-google-api-key"
   GROQ_API_KEY="your-groq-key"
   TAVILY_API_KEY="your-tavily-key"
   SERPAPI_API_KEY="your-serpapi-key"
   YOUTUBE_API_KEY="your-youtube-key"
   ```
3. **Run the Backend API**:
   ```bash
   python api.py
   ```
4. **Run the Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to start deciding!
