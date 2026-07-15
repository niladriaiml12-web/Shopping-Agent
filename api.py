import os
import sqlite3
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import shutil

# Import agent and database path
from shopping_agent import agent, DB_PATH

app = FastAPI(title="BuyForYou API", description="Backend API for the BuyForYou AI Shopping Wingman")

# Enable CORS for Next.js dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TEMP_UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "temp_uploads")
os.makedirs(TEMP_UPLOAD_DIR, exist_ok=True)


class MessageItem(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[MessageItem]


@app.get("/api/products")
def get_products():
    """Retrieve all products from the database along with their ratings."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Get all products
        cursor.execute("SELECT id, name, category, price, description, is_organic FROM products")
        products_rows = cursor.fetchall()
        
        # Get average ratings and count
        cursor.execute("""
            SELECT product_id, AVG(rating), COUNT(*) 
            FROM reviews 
            GROUP BY product_id
        """)
        ratings_rows = cursor.fetchall()
        conn.close()
        
        ratings_map = {r[0]: {"average_rating": round(r[1], 2), "review_count": r[2]} for r in ratings_rows}
        
        products = []
        for row in products_rows:
            pid = row[0]
            rating_info = ratings_map.get(pid, {"average_rating": 0.0, "review_count": 0})
            products.append({
                "id": pid,
                "name": row[1],
                "category": row[2],
                "price": row[3],
                "description": row[4],
                "is_organic": bool(row[5]),
                "average_rating": rating_info["average_rating"],
                "review_count": rating_info["review_count"]
            })
            
        return products
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/orders")
def get_orders():
    """Retrieve order history."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT id, product_id, product_name, price, ordered_at FROM orders ORDER BY id DESC")
        rows = cursor.fetchall()
        conn.close()
        
        orders = [
            {
                "id": row[0],
                "product_id": row[1],
                "product_name": row[2],
                "price": row[3],
                "ordered_at": row[4]
            }
            for row in rows
        ]
        return orders
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """Save upload to a local folder and return absolute path so the agent can read it."""
    try:
        # Generate safe filename
        filename = file.filename
        file_path = os.path.join(TEMP_UPLOAD_DIR, filename)
        
        # Save file to disk
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Return absolute path
        abs_path = os.path.abspath(file_path)
        return {"filename": filename, "filepath": abs_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat")
def run_chat(request: ChatRequest):
    """Invoke the agent with the provided conversation history."""
    try:
        # Convert Pydantic request list of dicts to standard python list of dicts
        messages_input = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        
        # Invoke LangChain agent
        result = agent.invoke({"messages": messages_input})
        
        # Return the last response
        last_message = result["messages"][-1]
        
        return {"response": last_message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=True)
