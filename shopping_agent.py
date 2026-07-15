import base64
import json
import os
import sqlite3
import uuid
import re
from typing import Optional, List, Dict, Any

from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_groq import ChatGroq
from duckduckgo_search import DDGS

from reviews_api import get_product_rating

load_dotenv()

DB_PATH = os.path.join(os.path.dirname(__file__), "store.db")

# Initialize models
# Fallback to standard Groq models if custom one has issues, but keep the default
try:
    llm = ChatGroq(model="qwen/qwen3-32b", temperature=0)
except Exception:
    llm = ChatGroq(model="llama3-70b-8192", temperature=0)

try:
    vision_llm = ChatGroq(model="meta-llama/llama-4-scout-17b-16e-instruct", temperature=0)
except Exception:
    vision_llm = ChatGroq(model="llama-3.2-11b-vision-preview", temperature=0)

def clean_llm_response(response: str) -> str:
    cleaned = re.sub(r'<think>.*?</think>', '', response, flags=re.DOTALL)
    if "```json" in cleaned:
        cleaned = cleaned.split("```json")[1].split("```")[0]
    elif "```" in cleaned:
        cleaned = cleaned.split("```")[1].split("```")[0]
    return cleaned.strip()

category_map = {
    "honey": "honey",
    "oil": "oil",
    "nuts": "nuts",
    "seeds": "seeds",
    "grains": "grains",
    "tea": "tea",
    "coffee": "coffee",
    "snacks": "snacks",
    "dairy": "dairy-alt",
    "vegetable": "vegetables",
    "fruit": "fruits",
    "spice": "spices"
}

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            state_json TEXT
        )
    """)
    conn.commit()
    conn.close()

init_db()

def get_db_connection():
    return sqlite3.connect(DB_PATH)

def load_session(session_id: str) -> dict:
    if not session_id:
        session_id = "default"
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT state_json FROM sessions WHERE session_id = ?", (session_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return json.loads(row[0])
    return {
        "state_name": "idle",
        "intent": {},
        "current_question": "",
        "options": [],
        "mission": None,
        "candidates": [],
        "comparisons": [],
        "recommendations": []
    }

def save_session(session_id: str, state: dict):
    if not session_id:
        session_id = "default"
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO sessions (session_id, state_json) 
        VALUES (?, ?) 
        ON CONFLICT(session_id) DO UPDATE SET state_json = excluded.state_json
    """, (session_id, json.dumps(state)))
    conn.commit()
    conn.close()

# ---------------------------------------------------------------------------
# API Search Helpers
# ---------------------------------------------------------------------------

def search_google_shopping(query: str) -> list:
    try:
        results = []
        search_query = f"{query} price in india buy online"
        with DDGS() as ddgs:
            for r in ddgs.text(search_query, region='in-en', max_results=5):
                results.append({
                    "title": r.get("title", ""),
                    "snippet": r.get("body", ""),
                    "link": r.get("href", ""),
                    "source": "Web Search (DDG)"
                })
        return results
    except Exception as e:
        print(f"DDGS Error in shopping search: {e}")
        return []

def search_youtube_reviews(product_name: str) -> list:
    api_key = os.environ.get("YOUTUBE_API_KEY")
    if not api_key:
        return []
    try:
        from googleapiclient.discovery import build
        youtube = build("youtube", "v3", developerKey=api_key)
        request = youtube.search().list(
            q=f"{product_name} review",
            part="snippet",
            maxResults=2,
            type="video"
        )
        response = request.execute()
        videos = []
        for item in response.get("items", []):
            videos.append({
                "title": item["snippet"]["title"],
                "video_id": item["id"]["videoId"],
                "channel": item["snippet"]["channelTitle"]
            })
        return videos
    except Exception as e:
        print(f"YouTube Error: {e}")
        return []

def search_reddit_opinions(product_name: str) -> str:
    try:
        search_query = f"site:reddit.com {product_name} review opinions"
        combined_text = ""
        with DDGS() as ddgs:
            for r in ddgs.text(search_query, max_results=3):
                combined_text += r.get("body", "") + "\n"
        return combined_text
    except Exception as e:
        print(f"DDGS Error in reddit search: {e}")
        return ""

def discover_products(intent: dict) -> list:
    category = intent.get("product_category", "").lower()
    if not category:
        return []
    
    local_prods = []
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Try name or category match in local DB
    cursor.execute("""
        SELECT id, name, category, price, description, is_organic 
        FROM products 
        WHERE name LIKE ? OR category LIKE ?
    """, (f"%{category}%", f"%{category}%"))
    rows = cursor.fetchall()
    
    if not rows:
        # Check category map
        for key, val in category_map.items():
            if key in category:
                cursor.execute("""
                    SELECT id, name, category, price, description, is_organic 
                    FROM products 
                    WHERE category = ?
                """, (val,))
                rows = cursor.fetchall()
                break
                
    conn.close()
    
    for r in rows:
        local_prods.append({
            "id": r[0],
            "name": r[1],
            "category": r[2],
            "price": r[3],
            "description": r[4],
            "is_organic": bool(r[5]),
            "source": "Local Store",
            "link": "#",
            "delivery": "1-2 days"
        })
        
    if local_prods:
        return local_prods
        
    # Search online using DDGS
    serp_results = search_google_shopping(category)
    external_prods = []
    if serp_results:
        for idx, item in enumerate(serp_results[:5]):
            price_val = 0.0
            
            # Try extracting INR price using regex
            text_to_search = item.get("title", "") + " " + item.get("snippet", "")
            price_match = re.search(r'(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d+)?)', text_to_search, re.IGNORECASE)
            if price_match:
                p_clean = price_match.group(1).replace(',', '')
                try:
                    price_val = float(p_clean)
                except ValueError:
                    pass
            elif item.get("price"):
                p_clean = re.sub(r'[^\d\.]', '', str(item["price"]))
                if p_clean:
                    try:
                        price_val = float(p_clean)
                    except ValueError:
                        pass
                        
            external_prods.append({
                "id": 1000 + idx,
                "name": item.get("title", "Product")[:60],
                "category": category,
                "price": price_val if price_val > 0 else 999.0,
                "description": item.get("snippet", ""),
                "is_organic": "organic" in item.get("title", "").lower() or "organic" in item.get("snippet", "").lower(),
                "source": item.get("source", "Web Search"),
                "link": item.get("link", "#"),
                "delivery": item.get("delivery", "3-5 business days")
            })
            
    return external_prods

def gather_intelligence(product_name: str) -> dict:
    # 1. YouTube Reviews
    youtube_videos = search_youtube_reviews(product_name)
    # 2. Reddit / Web opinions
    reddit_opinions = search_reddit_opinions(product_name)
    
    return {
        "youtube": youtube_videos,
        "reddit": reddit_opinions
    }

# ---------------------------------------------------------------------------
# Flow Handlers
# ---------------------------------------------------------------------------

def is_checkout_intent(user_message: str, state: dict) -> bool:
    if not state.get("recommendations"):
        return False
    msg = user_message.lower()
    checkout_triggers = ["order", "buy", "checkout", "yes", "sure", "confirm", "le bhai", "le lo", "place order"]
    for trig in checkout_triggers:
        if trig in msg:
            return True
    return False

def handle_checkout(user_message: str, state: dict) -> tuple:
    pids = [r["id"] for r in state.get("recommendations", [])]
    if not pids:
        return "Sorry, I couldn't find any products in your active recommendations to checkout. What would you like to buy?", {"type": "text"}
        
    id_match = re.search(r'(?:id|#)?\s*:?\s*(\d+)', user_message, re.IGNORECASE)
    product_id = None
    if id_match:
        val = int(id_match.group(1))
        if val in pids:
            product_id = val
        elif val <= len(pids) and val > 0:
            product_id = pids[val - 1]
            
    if not product_id and len(pids) == 1:
        product_id = pids[0]
        
    if not product_id:
        product_id = pids[0] # Default fallback
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT name, price FROM products WHERE id = ?", (product_id,))
    row = cursor.fetchone()
    
    product_name = "Premium Product"
    price = 99.99
    if row:
        product_name, price = row
    else:
        for r in state.get("recommendations", []):
            if r["id"] == product_id:
                product_name = r["name"]
                price = r["price"]
                break
        cursor.execute("INSERT OR IGNORE INTO products (id, name, price) VALUES (?, ?, ?)", (product_id, product_name, price))
        
    cursor.execute(
        "INSERT INTO orders (product_id, product_name, price) VALUES (?, ?, ?)",
        (product_id, product_name, price),
    )
    order_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    response_text = f"Order #{order_id} confirmed! '{product_name}' has been successfully ordered for ${price:.2f}. Thank you for shopping with us!"
    ui_metadata = {
        "type": "checkout_confirmation",
        "order": {
            "orderId": str(order_id),
            "productName": product_name,
            "price": str(price)
        }
    }
    
    state["recommendations"] = []
    state["state_name"] = "idle"
    
    return response_text, ui_metadata

def is_mission_intent(user_message: str) -> bool:
    msg = user_message.lower()
    mission_keywords = ["moving to", "joining", "travelling to", "starting", "opening a", "setting up"]
    for kw in mission_keywords:
        if kw in msg:
            return True
    for word in ["hostel", "gym", "college", "trek", "wedding", "goa", "youtube channel", "gaming room"]:
        if word in msg:
            return True
    return False

def handle_mission(user_message: str, state: dict) -> tuple:
    prompt = f"""
    The user is starting a buying mission: "{user_message}".
    Act as Agent 2: Context Builder Agent.
    Create a practical checklist of 5 to 8 products they will need for this situation.
    For each item, specify:
    - item: name of the item
    - price: a realistic estimated cost range (e.g. 500-1500)
    - priority: "Essential" or "Optional"
    - reason: short sentence explaining why they need it.
    
    Return ONLY a valid JSON object matching this schema:
    {{
        "title": "Short title describing the mission (e.g. Moving into a Hostel)",
        "checklist": [
            {{
                "item": "Mattress",
                "estimated_cost_low": 2000,
                "estimated_cost_high": 4000,
                "priority": "Essential",
                "reason": "Hostels do not provide comfortable beds."
            }}
        ]
    }}
    Do not output markdown code blocks. Return raw JSON only.
    """
    try:
        response = llm.invoke([SystemMessage(content=prompt)]).content
        response = clean_llm_response(response)
        data = json.loads(response)
        
        total_low = sum([item["estimated_cost_low"] for item in data["checklist"]])
        total_high = sum([item["estimated_cost_high"] for item in data["checklist"]])
        
        state["state_name"] = "mission"
        state["mission"] = data
        
        text = f"I've set up a custom checklist for your mission: **{data['title']}**. Here are the items you should check out:"
        ui_metadata = {
            "type": "mission",
            "mission": {
                "title": data["title"],
                "checklist": [
                    {
                        "item": item["item"],
                        "price": f"${item['estimated_cost_low']}-${item['estimated_cost_high']}",
                        "priority": item["priority"],
                        "reason": item["reason"]
                    }
                    for item in data["checklist"]
                ],
                "total_cost_estimate": f"${total_low}-${total_high}"
            }
        }
        return text, ui_metadata
    except Exception as e:
        print(f"Mission Agent Error: {e}")
        text = "I failed to generate a mission checklist, let me give you a default list."
        ui_metadata = {
            "type": "mission",
            "mission": {
                "title": "My Shopping Mission",
                "checklist": [
                    {"item": "Essential Item 1", "price": "$10-$20", "priority": "Essential", "reason": "Basic necessity"},
                    {"item": "Optional Item 2", "price": "$50-$100", "priority": "Optional", "reason": "Nice to have"}
                ],
                "total_cost_estimate": "$60-$120"
            }
        }
        return text, ui_metadata

def is_shopping_goal(user_message: str) -> bool:
    msg = user_message.lower()
    shopping_words = ["need", "want", "buy", "search", "find", "suggest", "recommend", "honey", "oil", "tea", "coffee", "oats", "almonds", "headphones", "laptop", "phone"]
    for w in shopping_words:
        if w in msg:
            return True
    return False

def handle_new_goal(user_message: str, state: dict) -> tuple:
    prompt = f"""
    The user wants to shop: "{user_message}".
    Act as Agent 1: Intent Understanding Agent.
    Extract the product category (e.g. headphones, raw honey), budget, and organic status.
    
    If the product is an electronic or complex item (e.g. headphones, laptops, phone, smart watch), we MUST conduct a quick interview (2-3 questions) to find the use-case. Set should_interview to true.
    If it is a grocery or simple item (e.g. honey, olive oil, almonds, green tea), set should_interview to false (we can recommend immediately).
    
    If should_interview is true, identify the first follow-up question and 4-8 button options for the user.
    
    Return ONLY a valid JSON object matching this schema:
    {{
        "product_category": "headphones",
        "budget": null,
        "is_organic": null,
        "should_interview": true,
        "next_question": "What is the primary use-case for these headphones?",
        "options": ["🎮 Gaming", "🎵 Music", "🏃 Gym", "💼 Office", "🎧 Mixed Usage"]
    }}
    Do not output markdown code blocks. Return raw JSON only.
    """
    try:
        response = llm.invoke([SystemMessage(content=prompt)]).content
        response = clean_llm_response(response)
        data = json.loads(response)
        
        state["intent"] = {
            "product_category": data.get("product_category") or user_message,
            "budget": data.get("budget"),
            "is_organic": data.get("is_organic"),
            "preferences": {}
        }
        state["asked_questions"] = []
        
        if data.get("should_interview") and data.get("next_question"):
            state["state_name"] = "interviewing"
            state["current_question"] = data["next_question"]
            state["options"] = data["options"]
            state["asked_questions"].append(data["next_question"])
            
            ui_metadata = {
                "type": "interview",
                "interview": {
                    "question": data["next_question"],
                    "options": data["options"]
                }
            }
            return data["next_question"], ui_metadata
        else:
            return run_search_and_recommend(state)
    except Exception as e:
        print(f"New Goal Error: {e}")
        state["intent"] = {"product_category": user_message}
        return run_search_and_recommend(state)

def handle_interview_response(user_message: str, state: dict) -> tuple:
    intent = state.get("intent", {})
    asked = state.get("asked_questions", [])
    current_q = state.get("current_question", "")
    
    prompt = f"""
    Previous Intent: {json.dumps(intent)}
    Question asked: "{current_q}"
    User Answer: "{user_message}"
    
    Act as Agent 1: Intent Understanding Agent.
    Update the intent specifications based on the user's answer.
    Decide if we should ask the next follow-up question. Limit the total interview questions to 3. Currently we asked: {len(asked)}.
    If we have enough info or reached the limit, set should_interview to false.
    If we need to ask another question, generate it and 4-8 button options.
    
    Return ONLY a valid JSON object:
    {{
        "updated_intent": {{ ... }},
        "should_interview": true/false,
        "next_question": "question text" or null,
        "options": ["Opt 1", "Opt 2"] or null
    }}
    Do not output markdown code blocks. Return raw JSON only.
    """
    try:
        response = llm.invoke([SystemMessage(content=prompt)]).content
        response = clean_llm_response(response)
        data = json.loads(response)
        state["intent"] = data.get("updated_intent", intent)
        
        if data.get("should_interview") and data.get("next_question") and len(asked) < 3:
            state["current_question"] = data["next_question"]
            state["options"] = data["options"]
            state["asked_questions"].append(data["next_question"])
            
            ui_metadata = {
                "type": "interview",
                "interview": {
                    "question": data["next_question"],
                    "options": data["options"]
                }
            }
            return data["next_question"], ui_metadata
        else:
            state["state_name"] = "idle"
            return run_search_and_recommend(state)
    except Exception as e:
        print(f"Interview response handling error: {e}")
        state["state_name"] = "idle"
        return run_search_and_recommend(state)

def run_search_and_recommend(state: dict) -> tuple:
    intent = state.get("intent", {})
    category = intent.get("product_category", "product")
    
    # 1. Product Discovery
    candidates = discover_products(intent)
    
    # Realistic fallback candidates if SerpAPI/DB return nothing
    if not candidates:
        if "headphone" in category.lower():
            candidates = [
                {"id": 501, "name": "Sony WH-CH720N Wireless Over-Ear Headphones", "category": "headphones", "price": 4999, "description": "Comfortable noise cancelling over-ear headphones with 35 hours battery life.", "is_organic": False, "source": "Amazon", "link": "#", "delivery": "Tomorrow"},
                {"id": 502, "name": "Sennheiser Accentum Wireless", "category": "headphones", "price": 8999, "description": "Premium sound quality, hybrid ANC, 50 hours battery life.", "is_organic": False, "source": "BestBuy", "link": "#", "delivery": "2 days"},
                {"id": 503, "name": "boAt Rockerz 450", "category": "headphones", "price": 1499, "description": "Affordable on-ear wireless headphones with punchy bass.", "is_organic": False, "source": "Flipkart", "link": "#", "delivery": "3 days"}
            ]
        else:
            candidates = [
                {"id": 601, "name": f"Premium {category.title()}", "category": category, "price": 29.99, "description": "Top quality choice.", "is_organic": "organic" in category.lower(), "source": "Amazon", "link": "#", "delivery": "2 days"},
                {"id": 602, "name": f"Value {category.title()}", "category": category, "price": 14.99, "description": "Best budget-friendly alternative.", "is_organic": "organic" in category.lower(), "source": "Walmart", "link": "#", "delivery": "3-5 days"}
            ]
            
    candidates = candidates[:3]
    
    # 2. Intel gathering
    intel_data = []
    for c in candidates:
        # Use simple intel summaries to avoid unnecessary api bills or limits
        intel = gather_intelligence(c["name"])
        intel_data.append({
            "product": c,
            "youtube": intel["youtube"],
            "reddit": intel["reddit"][:1000] if intel["reddit"] else ""
        })
        
    # 3. LLM synthesis
    prompt = f"""
    The user is looking for: {json.dumps(intent)}
    
    Candidates found with review intel:
    {json.dumps(intel_data)}
    
    Act as the Multi-Agent AI buying system.
    Evaluate the candidates and generate:
    1. A Review Trust % (checking fake reviews).
    2. A proprietary AI Trust Score out of 100 with breakdowns matching:
       - price_value (max 20)
       - review_authenticity (max 20)
       - community_approval (max 20)
       - build_quality (max 15)
       - longevity (max 10)
       - warranty (max 10)
       - brand_support (max 5)
       These must sum up exactly to the trust_score.
    3. Community Sentiment (Likes and Dislikes).
    4. Price History Trend: return a list of 6 monthly price points in INR (e.g. [5200, 5000, 5100, 4800, 4999, 4999]).
    5. Deal recommendation verdict: "Buy", "Wait" or "Skip" with deal_reason.
    6. Side-by-side comparison table values. Choose 4 specs to compare. All prices MUST be in INR (₹).
    7. Merchant purchase links.
    
    Create a warm, friendly recommendation message in plain text (no markdown formatting like **bold** or *italics* in the message text itself). Summarize why you chose the best option and explain the trade-offs of the others. Make sure to explicitly mention prices in Indian Rupees (₹).
    
    Return ONLY a valid JSON object matching this schema:
    {{
        "response": "Recommendation explanation text...",
        "ui_metadata": {{
            "type": "recommendation",
            "recommendations": [
                {{
                    "id": 501,
                    "name": "Product Name",
                    "trust_score": 94,
                    "trust_breakdown": {{
                        "price_value": 20,
                        "review_authenticity": 18,
                        "community_approval": 17,
                        "build_quality": 19,
                        "longevity": 10,
                        "warranty": 5,
                        "brand_support": 5
                    }},
                    "price": 4999,
                    "expected_price_next_month": 4299,
                    "deal_verdict": "Wait",
                    "deal_reason": "Price drop expected during next month's sale.",
                    "organic": false,
                    "pros": ["Comfortable fit", "Great active noise cancellation"],
                    "cons": ["Weak mic quality"],
                    "community_sentiment": {{
                        "likes": ["ANC", "Battery life"],
                        "dislikes": ["Wired mode latency"]
                    }},
                    "review_trust_percent": 88,
                    "price_history": [5200, 5100, 5000, 4900, 4999, 4999],
                    "links": [
                        {{"name": "Amazon", "url": "https://amazon.com", "price": 4999, "delivery": "Tomorrow"}},
                        {{"name": "Flipkart", "url": "https://flipkart.com", "price": 5099, "delivery": "3 days"}}
                    ],
                    "recommended_for": ["Gamers", "Students"],
                    "not_recommended_for": ["Audiophiles"]
                }}
            ],
            "comparison": {{
                "headers": ["Price", "Battery Life", "ANC", "Warranty"],
                "products": [
                    {{
                        "name": "Product Name",
                        "values": ["₹4999", "35 Hours", "Good", "1 Year"]
                    }}
                ]
            }}
        }}
    }}
    Do not output markdown code blocks. Return raw JSON only.
    """
    try:
        response = llm.invoke([SystemMessage(content=prompt)]).content
        response = clean_llm_response(response)
        data = json.loads(response)
        state["recommendations"] = data["ui_metadata"]["recommendations"]
        return data["response"], data["ui_metadata"]
    except Exception as e:
        print(f"LLM Synthesis Error: {e}")
        state["recommendations"] = [
            {
                "id": c["id"],
                "name": c["name"],
                "price": c["price"],
                "deal_verdict": "Buy",
                "deal_reason": "Highly rated value product.",
                "trust_score": 85,
                "trust_breakdown": {
                    "price_value": 15,
                    "review_authenticity": 15,
                    "community_approval": 15,
                    "build_quality": 15,
                    "longevity": 10,
                    "warranty": 10,
                    "brand_support": 5
                },
                "pros": ["Good value", "Decent build"],
                "cons": ["Basic options"],
                "review_trust_percent": 90,
                "price_history": [c["price"], c["price"], c["price"]],
                "links": [{"name": c["source"], "url": c["link"], "price": c["price"], "delivery": c["delivery"]}]
            }
            for c in candidates
        ]
        ui_metadata = {
            "type": "recommendation",
            "recommendations": state["recommendations"],
            "comparison": {
                "headers": ["Price", "Source"],
                "products": [{"name": c["name"], "values": [f"₹{c['price']}", c["source"]]} for c in candidates]
            }
        }
        return "Here are the top choices I found.", ui_metadata

# ---------------------------------------------------------------------------
# Describe Product Image (Vision LLM)
# ---------------------------------------------------------------------------

def describe_product_image(image_path: str) -> str:
    with open(image_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode()

    ext = os.path.splitext(image_path)[1].lower().lstrip(".")
    mime = "image/jpeg" if ext in ("jpg", "jpeg") else f"image/{ext}"

    message = HumanMessage(content=[
        {
            "type": "image_url",
            "image_url": {"url": f"data:{mime};base64,{image_data}"},
        },
        {
            "type": "text",
            "text": (
                "Identify this product. Return ONLY a JSON object:\n"
                "{\n"
                "  \"product_type\": \"type\",\n"
                "  \"search_query\": \"keyword\",\n"
                "  \"is_organic\": true/false/null,\n"
                "  \"description\": \"sentence\"\n"
                "}"
            ),
        },
    ])
    try:
        response = vision_llm.invoke([message])
        content = clean_llm_response(response.content)
        return content
    except Exception as e:
        print(f"Vision error: {e}")
        return json.dumps({
            "product_type": "grocery",
            "search_query": "honey",
            "is_organic": True,
            "description": "Scanned product image"
        })

# ---------------------------------------------------------------------------
# LangChain Interface Class
# ---------------------------------------------------------------------------

class BuyForYouOrchestrator:
    def invoke(self, state_input: dict) -> dict:
        session_id = state_input.get("session_id", "default")
        messages = state_input.get("messages", [])
        
        if not messages:
            return {"messages": [AIMessage(content="Hello! I'm BuyForYou, your AI shopping consultant. How can I help you buy confidently today?")]}
            
        last_msg = messages[-1]["content"]
        
        # Check if the user is uploading an image
        image_path = None
        if last_msg.startswith("I uploaded a product image"):
            # Extract image path
            path_match = re.search(r'Image path:\s*(.*)', last_msg)
            if path_match:
                image_path = path_match.group(1).strip()
                
        # If it is an image upload, analyze it first
        if image_path:
            description_json = describe_product_image(image_path)
            try:
                desc = json.loads(description_json)
                q = desc.get("search_query", "honey")
                user_query = f"Find similar products to: {q}"
            except Exception:
                user_query = "Find honey products"
        else:
            user_query = last_msg

        # Run orchestrator logic
        response_text, ui_metadata = run_orchestrator(session_id, user_query)
        
        # Encode ui_metadata inside the AIMessage or return it separately.
        # Since api.py extracts result["messages"][-1].content, we can construct the AIMessage
        # to hold a JSON string containing BOTH response and ui_metadata!
        # This keeps the interface extremely simple and robust.
        payload = {
            "response": response_text,
            "ui_metadata": ui_metadata
        }
        
        return {
            "messages": [AIMessage(content=json.dumps(payload))]
        }

def run_orchestrator(session_id: str, user_message: str) -> tuple:
    state = load_session(session_id)
    
    # 1. Checkout request
    if is_checkout_intent(user_message, state):
        response_text, ui_metadata = handle_checkout(user_message, state)
        save_session(session_id, state)
        return response_text, ui_metadata
        
    # 2. Mission Mode request
    if is_mission_intent(user_message) and state["state_name"] != "interviewing":
        response_text, ui_metadata = handle_mission(user_message, state)
        save_session(session_id, state)
        return response_text, ui_metadata
        
    # 3. Interviewing state
    if state["state_name"] == "interviewing":
        response_text, ui_metadata = handle_interview_response(user_message, state)
        save_session(session_id, state)
        return response_text, ui_metadata
        
    # 4. New shopping goal
    if is_shopping_goal(user_message):
        response_text, ui_metadata = handle_new_goal(user_message, state)
        save_session(session_id, state)
        return response_text, ui_metadata
        
    # 5. Default chatbot talk
    response_text = llm.invoke([
        SystemMessage(content="You are BuyForYou, a friendly AI shopping wingman. The user is just chatting. Answer warmly. Tell them they can tell you what they want to buy (e.g. 'I need headphones') or describe a situation (e.g. 'I'm moving to a hostel') and you'll find the best options."),
        HumanMessage(content=user_message)
    ]).content
    
    return response_text, {"type": "text"}

agent = BuyForYouOrchestrator()

if __name__ == "__main__":
    test_result = agent.invoke({
        "session_id": "test_session",
        "messages": [
            {"role": "user", "content": "I need headphones"}
        ]
    })
    print("Test run result:")
    print(test_result["messages"][-1].content)
