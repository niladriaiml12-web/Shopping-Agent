"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Sparkles, 
  Upload, 
  Image as ImageIcon,
  CheckCircle2, 
  ShoppingBag, 
  Star, 
  X,
  RefreshCw,
  Clock
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Product {
  num: string;
  name: string;
  id: string;
  price: string;
  rating: string;
  organic: string;
}

interface OrderConfirmation {
  orderId: string;
  productName: string;
  price: string;
}

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  onImageUpload: (file: File) => Promise<string | null>;
  isLoading: boolean;
  activeTab: string;
}

export default function ChatInterface({
  messages,
  onSendMessage,
  onImageUpload,
  isLoading,
  activeTab
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [scanState, setScanState] = useState<"idle" | "uploading" | "scanning" | "detected" | "done">("idle");
  const [scanFilename, setScanFilename] = useState("");
  const [scanResult, setScanResult] = useState<any>(null);
  const [loadingStep, setLoadingStep] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Suggestions for chat
  const suggestions = [
    { text: "Organic honey under $20 bol", val: "I want organic raw honey under $20" },
    { text: "Healthy oats dhoond", val: "Show me organic oats or grain cereal with 4+ rating" },
    { text: "Best olive oil value match", val: "I need organic extra virgin olive oil with highest rating" },
    { text: "Green tea under $15", val: "Suggest organic green tea under $15" }
  ];

  // Witty Hinglish loading steps
  const loadingMessages = [
    "Internet ke kone kone se dhoond raha hoon...",
    "Logon ki bakchodi filter kar raha hoon...",
    "Paisa bachana bhi ek talent hai, compare chal raha hai...",
    "Almost mil gaya, filtering out best option...",
  ];

  // Rotate loading sub-messages
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % loadingMessages.length);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    onSendMessage(text);
    setInput("");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanState("uploading");
    setScanFilename(file.name);
    
    try {
      const savedPath = await onImageUpload(file);
      if (savedPath) {
        setScanState("scanning");
        // Simulate visual scanning duration
        setTimeout(() => {
          setScanState("detected");
          setScanResult({
            product: file.name.toLowerCase().includes("honey") ? "Organic Raw Honey" : "Premium Product Label",
            confidence: "98%"
          });
          
          setTimeout(() => {
            setScanState("done");
            // Auto search after scan
            onSendMessage(`I uploaded a product image. Please analyze it and find similar products in the store. Image path: ${savedPath}`);
          }, 1500);
        }, 2000);
      } else {
        setScanState("idle");
      }
    } catch (err) {
      console.error(err);
      setScanState("idle");
    }
  };

  // Helper: Parse product recommendations from text
  const parseRecommendations = (text: string): Product[] => {
    const products: Product[] = [];
    const lines = text.split("\n");
    
    // Format: #1. Organic Raw Honey (ID:1) — $14.99 ★4.62 — organic
    const productRegex = /#\s*(\d+)\.\s+([^\(]+)\(ID:\s*(\d+)\)\s*—\s*\$\s*(\d+(?:\.\d+)?)\s*★\s*(\d+(?:\.\d+)?)\s*—\s*(organic|non-organic|.*)/i;

    lines.forEach((line) => {
      const match = line.trim().match(productRegex);
      if (match) {
        products.push({
          num: match[1],
          name: match[2].trim(),
          id: match[3],
          price: match[4],
          rating: match[5],
          organic: match[6].trim()
        });
      }
    });

    return products;
  };

  // Helper: Parse Order Confirmation from text
  const parseOrderConfirmation = (text: string): OrderConfirmation | null => {
    // Format: Order #1 confirmed! 'Organic Raw Honey' has been successfully ordered for $14.99
    const orderRegex = /Order\s+#(\d+)\s+confirmed!\s+['"]([^'"]+)['"]\s+has\s+been\s+successfully\s+ordered\s+for\s+\$(\d+(?:\.\d+)?)/i;
    const match = text.match(orderRegex);
    if (match) {
      return {
        orderId: match[1],
        productName: match[2],
        price: match[3]
      };
    }
    return null;
  };

  return (
    <div className="flex-1 flex flex-col bg-white border border-[#E5E7EB] rounded-3xl shadow-sm min-h-[600px] overflow-hidden">
      {/* Chat Header */}
      <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-4 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <div className="flex h-3 w-3 items-center justify-center rounded-full bg-[#10B981] animate-pulse" />
          <div>
            <h2 className="text-sm font-bold text-[#1E293B] flex items-center gap-1.5">
              <span>🤖 BuyForYou AI</span>
              <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md font-semibold uppercase">
                Shopping Wingman
              </span>
            </h2>
            <p className="text-[11px] text-[#64748B]">Ready for action</p>
          </div>
        </div>
        
        {/* Tab-driven upload action */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1E293B] bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all cursor-pointer"
        >
          <Upload className="h-3.5 w-3.5" />
          <span>Photo Phenko</span>
        </button>
        <input 
          ref={fileInputRef}
          type="file" 
          accept="image/*" 
          className="hidden" 
          onChange={handleFileChange}
        />
      </div>

      {/* Message Screen */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-h-[500px]">
        {/* Welcome Message */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center max-w-md mx-auto">
            <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4 shadow-sm border border-blue-100">
              <Sparkles className="h-7 w-7 text-blue-600 animate-pulse" />
            </div>
            <h3 className="text-xl font-extrabold text-[#1E293B]">
              Shopping ka Scene Simple Bana!
            </h3>
            <p className="text-sm text-[#64748B] mt-2 leading-relaxed">
              Main hoon tumhara personal shopping wingman. Mujhe batao kya chahiye — search, reviews analyze, comparison aur ordering sab main sambhal loonga!
            </p>
            
            {/* suggestions */}
            <div className="grid grid-cols-2 gap-2.5 mt-8 w-full">
              {suggestions.map((sug, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(sug.val)}
                  className="p-3 text-xs text-[#1E293B] text-left font-medium bg-gray-50 border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 rounded-xl transition-all"
                >
                  {sug.text} &rarr;
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Image scanning state visualization */}
        {scanState !== "idle" && (
          <div className="border border-blue-100 bg-blue-50/40 rounded-2xl p-5 flex items-center gap-4 relative overflow-hidden">
            {scanState === "scanning" && (
              <div className="absolute left-0 right-0 h-0.5 bg-blue-500 animate-scan shadow-md shadow-blue-500/50" />
            )}
            
            <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center border border-blue-100 shadow-xs relative">
              <ImageIcon className="h-6 w-6 text-blue-600" />
            </div>
            
            <div className="flex-1">
              <h4 className="text-xs font-bold text-[#1E293B] truncate max-w-[200px]">
                {scanFilename}
              </h4>
              <p className="text-[11px] text-[#64748B] mt-0.5">
                {scanState === "uploading" && "Uploading picture..."}
                {scanState === "scanning" && "Analyzing product label (Scanning details)..."}
                {scanState === "detected" && `Detected: ${scanResult?.product} (${scanResult?.confidence} confidence)`}
                {scanState === "done" && "Found similar products in catalog! Initiating search..."}
              </p>
            </div>
            
            <div className="text-right">
              <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase animate-pulse">
                {scanState}
              </span>
            </div>
          </div>
        )}

        {/* Render Chat History */}
        {messages.map((msg, index) => {
          const isAI = msg.role === "assistant";
          const products = isAI ? parseRecommendations(msg.content) : [];
          const orderConfirm = isAI ? parseOrderConfirmation(msg.content) : null;
          
          // Filter out the raw list from the assistant output if we parsed cards
          // but keep standard textual conversation
          const cleanText = isAI 
            ? msg.content.replace(/#\d+\.\s+.*?—\s*(organic|non-organic|.*)/gi, "").trim()
            : msg.content;

          return (
            <div
              key={index}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {/* Profile Icon for AI */}
              {isAI && (
                <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                  🤖
                </div>
              )}

              <div className="max-w-[85%] flex flex-col gap-2.5">
                {/* Text Bubble */}
                {cleanText && (
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white shadow-xs rounded-tr-none"
                        : "bg-gray-100 text-[#1E293B] rounded-tl-none border border-gray-200/50"
                    }`}
                  >
                    {msg.role === "user" && msg.content.startsWith("I uploaded a product image") ? (
                      <span className="flex items-center gap-1.5">
                        <ImageIcon className="h-4 w-4" />
                        <span>Searching similar items from photo</span>
                      </span>
                    ) : (
                      <p className="whitespace-pre-line">{cleanText}</p>
                    )}
                  </div>
                )}

                {/* If Order Confirmation Parsed, render success badge card */}
                {orderConfirm && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 text-center shadow-xs max-w-sm mt-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-16 w-16 bg-emerald-100/30 rounded-bl-full flex items-center justify-center" />
                    <div className="h-12 w-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto mb-3.5 shadow-sm shadow-emerald-500/20">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <h4 className="text-base font-extrabold text-emerald-950">
                      Order Confirmed 🎉
                    </h4>
                    <p className="text-xs text-emerald-700 mt-1">
                      Boss... Shopping ho gayi. Ab bas delivery ka wait karo 😎
                    </p>
                    
                    <div className="bg-white/80 backdrop-blur-xs rounded-xl p-3 border border-emerald-100 mt-4 text-left text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Order ID:</span>
                        <span className="font-bold text-[#1E293B]">#{orderConfirm.orderId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Product:</span>
                        <span className="font-bold text-[#1E293B] truncate max-w-[160px]">{orderConfirm.productName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Amount Paid:</span>
                        <span className="font-bold text-blue-600">${parseFloat(orderConfirm.price).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between pt-1.5 border-t border-gray-100">
                        <span className="text-[#64748B] flex items-center gap-1"><Clock className="h-3 w-3" /> ETA:</span>
                        <span className="font-bold text-emerald-700">3-5 Business Days</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* If Product Recommendations parsed, render them as premium product cards */}
                {products.length > 0 && (
                  <div className="mt-2 space-y-4">
                    {/* Floating recommendation verdict banner */}
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3 shadow-xs">
                      <div className="h-8 w-8 rounded-xl bg-white border border-blue-100 flex items-center justify-center shrink-0">
                        💡
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-blue-950">🤖 AI Verdict (Best Option)</h4>
                        <p className="text-xs text-blue-800 mt-0.5 leading-relaxed">
                          {products.length === 1 
                            ? `Yeh check out karo. Best rating match hai for your filter criteria!`
                            : `Buy #${products[0].num} (${products[0].name}). Same quality, top tier rating stars (★${products[0].rating}) and values.`
                          }
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {products.map((prod) => (
                        <div
                          key={prod.id}
                          className="bg-white border border-gray-200 hover:border-blue-300 rounded-2xl p-4 transition-all duration-300 hover:shadow-md flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex justify-between items-start">
                              <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase">
                                {prod.organic.includes("organic") ? "Organic 🌿" : "Natural"}
                              </span>
                              <span className="text-[10px] text-[#64748B] font-medium">
                                ID: #{prod.id}
                              </span>
                            </div>
                            
                            <h4 className="text-sm font-bold text-[#1E293B] mt-2.5 line-clamp-1">
                              {prod.name}
                            </h4>
                            
                            <div className="flex items-center gap-1 mt-1 text-xs">
                              <div className="flex text-amber-500">
                                <Star className="h-3 w-3 fill-current" />
                              </div>
                              <span className="font-semibold text-[#1E293B]">{prod.rating}</span>
                              <span className="text-[#64748B] text-[10px]">(Janta Approved)</span>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-[#64748B]">Yehi Hai Asli Deal</span>
                              <span className="text-base font-extrabold text-[#1E293B]">${parseFloat(prod.price).toFixed(2)}</span>
                            </div>
                            
                            <button
                              onClick={() => onSendMessage(`Order product ID ${prod.id}`)}
                              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                            >
                              Le Bhai, Order Kar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Witty loading status */}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold animate-bounce shrink-0 shadow-xs">
              🤖
            </div>
            <div className="bg-gray-100 text-[#1E293B] rounded-2xl rounded-tl-none border border-gray-200/50 px-4 py-3 text-sm max-w-[85%] shadow-xs">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
                <span className="font-medium text-xs text-[#64748B]">
                  {loadingMessages[loadingStep]}
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-[#E5E7EB] p-4 bg-gray-50/50">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
          className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading || uploading}
            placeholder='e.g. Organic honey under $20 bol... baaki tension meri.'
            className="flex-1 bg-transparent border-0 outline-none text-sm text-[#1E293B] py-2 placeholder-gray-400"
          />
          <button
            type="submit"
            disabled={isLoading || uploading || !input.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-100 disabled:text-[#64748B] transition-all cursor-pointer shadow-xs"
            aria-label="Send query"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
