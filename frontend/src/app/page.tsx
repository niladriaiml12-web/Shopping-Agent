"use client";

import React, { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import ChatInterface from "@/components/ChatInterface";
import Features from "@/components/Features";
import { Sparkles, ArrowRight, Zap, ShoppingBag, Calendar, CheckCircle2, ShieldAlert, Upload, RefreshCw } from "lucide-react";

interface Order {
  id: number;
  product_id: number;
  product_name: string;
  price: number;
  ordered_at: string;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("discover");
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [sessionId, setSessionId] = useState("");

  const chatSectionRef = useRef<HTMLDivElement>(null);

  // Fetch recent orders from FastAPI API
  const refreshOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/orders");
      if (res.ok) {
        const data = await res.json();
        setRecentOrders(data);
      }
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Run on mount
  useEffect(() => {
    // Generate session ID
    setSessionId("sess_" + Math.random().toString(36).substring(2, 15));
    refreshOrders();
  }, []);

  const handleSendMessage = async (text: string) => {
    // 1. Append User message
    const updatedMessages = [...messages, { role: "user", content: text }];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      // 2. Post to API with session_id
      const res = await fetch("http://127.0.0.1:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages, session_id: sessionId }),
      });

      if (!res.ok) {
        throw new Error("API request failed");
      }

      const data = await res.json();
      
      // 3. Append Assistant response (with ui_metadata)
      setMessages((prev) => [...prev, { role: "assistant", content: data.response, ui_metadata: data.ui_metadata }]);
      
      // 4. If this is an order confirmation, refresh orders list after short delay
      if (data.response.toLowerCase().includes("confirmed")) {
        setTimeout(refreshOrders, 1000);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { 
          role: "assistant", 
          content: "Sorry boss... connection issue ho gayi. Please ensure Python FastAPI API is running on port 8000." 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("File upload failed");
      }

      const data = await res.json();
      return data.filepath; // Return absolute path
    } catch (err) {
      console.error("Image upload failed:", err);
      alert("Oops! Image send karne mein problem aayi.");
      return null;
    }
  };

  const scrollToChat = () => {
    chatSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleQuickSearch = (query: string) => {
    scrollToChat();
    handleSendMessage(query);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Navigation */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} onProfileClick={() => setActiveTab("orders")} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 md:py-16">
        
        {activeTab === "discover" && (
          <>
            {/* Hero Section */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-24">
              <div className="lg:col-span-7 flex flex-col select-none text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-full max-w-max">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Your Personal AI Buying Agent</span>
                </div>
                
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mt-6 text-[#1E293B] leading-[1.05]">
                  Stop <span className="text-blue-600">Searching</span>.
                </h1>
                <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-[#1E293B] leading-[1.1] mt-2">
                  Start <span className="text-cyan-500">Deciding</span>.
                </h2>
                
                <p className="mt-6 text-lg md:text-xl text-[#64748B] max-w-xl font-medium leading-relaxed">
                  BuyForYou exists to remove decision fatigue. We interview you, analyze reviews, calculate Trust Scores, and find exactly what matches your requirements.
                </p>
                
                <div className="mt-8 flex flex-wrap gap-4">
                  <button 
                    onClick={scrollToChat}
                    className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-md shadow-blue-500/20 hover:shadow-lg transition-all duration-200 flex items-center gap-2 cursor-pointer"
                  >
                    <span>Start Shopping</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => {
                      scrollToChat();
                      // Wait short duration for scroll to trigger
                      setTimeout(() => {
                        const fileBtn = document.querySelector('button[aria-label="Photo Phenko"]') as HTMLButtonElement;
                        fileInputRefClick();
                      }, 400);
                    }}
                    className="px-6 py-3.5 bg-white border border-gray-200 hover:border-gray-300 text-[#1E293B] font-bold rounded-2xl transition-all duration-200 hover:shadow-xs cursor-pointer"
                  >
                    Photo Phenko (Upload)
                  </button>
                </div>
              </div>

              {/* Floating AI Mascot Illustration */}
              <div className="lg:col-span-5 hidden lg:flex justify-center select-none">
                <div className="relative w-80 h-80 rounded-full bg-blue-50/50 border border-blue-100/50 flex items-center justify-center animate-pulse-slow">
                  <div className="absolute inset-0 bg-radial-gradient from-blue-400/10 to-transparent rounded-full" />
                  {/* Floating glass panel card */}
                  <div className="glass-panel w-64 p-5 rounded-3xl shadow-xl flex flex-col gap-4 border border-white/60 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-blue-600 text-white font-extrabold flex items-center justify-center rounded-2xl shadow-sm">
                        🤖
                      </div>
                      <div className="text-left">
                        <h4 className="text-xs font-bold text-[#1E293B]">BuyForYou AI</h4>
                        <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                          <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full" /> Online
                        </span>
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] text-[#64748B] italic leading-relaxed text-left">
                      &quot;Honey bol, ya oil... pricing compare karke top reviews ke saath custom checkout karunga. Tension mat le boss.&quot;
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-blue-600 font-bold border-t border-gray-100 pt-3">
                      <span>✓ Auto Reviews Filter</span>
                      <span>✓ Easy Order</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* AI Assistant Chat Section */}
            <div ref={chatSectionRef} className="scroll-mt-24">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Chat block */}
                <div className="lg:col-span-8">
                  <ChatInterface 
                    messages={messages} 
                    onSendMessage={handleSendMessage} 
                    onImageUpload={handleImageUpload}
                    isLoading={isLoading}
                    activeTab={activeTab}
                  />
                </div>
                
                {/* Sidebar block */}
                <div className="lg:col-span-4">
                  <Sidebar 
                    onQuickSearch={handleQuickSearch} 
                    onUploadClick={() => {
                      scrollToChat();
                      setTimeout(fileInputRefClick, 300);
                    }}
                    recentOrders={recentOrders}
                    loadingOrders={loadingOrders}
                    refreshOrders={refreshOrders}
                  />
                </div>
              </div>
            </div>

            {/* Features section */}
            <Features />
          </>
        )}

        {/* Shop By Image Tab */}
        {activeTab === "image" && (
          <div className="max-w-3xl mx-auto select-none text-left">
            <h2 className="text-3xl font-extrabold text-[#1E293B]">Shop by Image</h2>
            <p className="text-[#64748B] mt-1 text-sm">
              Photo phenko, label pehchaan ke catalog se matching deals nikaal lenge.
            </p>
            <div className="bg-white border border-[#E5E7EB] rounded-3xl p-8 mt-6 text-center border-dashed border-2 flex flex-col items-center justify-center min-h-[300px]">
              <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-xs border border-blue-100 mb-4">
                <Upload className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-[#1E293B]">Choose product image file</h3>
              <p className="text-xs text-[#64748B] max-w-xs mt-1 leading-relaxed">
                Drag and drop your JPEG, PNG, or WebP photo here, or browse local folders.
              </p>
              <button 
                onClick={fileInputRefClick}
                className="mt-6 px-5 py-2.5 bg-[#1E293B] hover:bg-[#1E293B]/90 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Choose Image
              </button>
            </div>
          </div>
        )}

        {/* AI Assistant Tab */}
        {activeTab === "assistant" && (
          <div className="max-w-4xl mx-auto">
            <ChatInterface 
              messages={messages} 
              onSendMessage={handleSendMessage} 
              onImageUpload={handleImageUpload}
              isLoading={isLoading}
              activeTab={activeTab}
            />
          </div>
        )}

        {/* Detailed Orders Tab */}
        {activeTab === "orders" && (
          <div className="max-w-4xl mx-auto text-left select-none">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-3xl font-extrabold text-[#1E293B]">Order History</h2>
                <p className="text-[#64748B] text-sm">All confirmed transactions recorded in SQLite store.db</p>
              </div>
              <button 
                onClick={refreshOrders}
                className="px-4 py-2 border border-gray-200 text-sm font-semibold rounded-xl hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer bg-white"
              >
                <RefreshCw className={`h-4 w-4 ${loadingOrders ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {loadingOrders ? (
              <div className="space-y-4">
                <div className="h-16 bg-white border border-gray-100 rounded-2xl animate-pulse" />
                <div className="h-16 bg-white border border-gray-100 rounded-2xl animate-pulse" />
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="bg-white border border-[#E5E7EB] rounded-3xl p-12 text-center">
                <ShoppingBag className="h-12 w-12 text-[#64748B] mx-auto opacity-30 mb-3" />
                <h3 className="text-sm font-bold text-[#1E293B]">No orders yet</h3>
                <p className="text-xs text-[#64748B] mt-0.5">Start browsing with the AI Assistant to place your first order.</p>
              </div>
            ) : (
              <div className="bg-white border border-[#E5E7EB] rounded-3xl overflow-hidden shadow-xs">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">Order ID</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">Product Name</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">Order Date</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-[#64748B] uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-[#64748B] uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100 text-sm">
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-[#1E293B] font-bold">#{order.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-[#1E293B] font-semibold">{order.product_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-[#64748B] flex items-center gap-1.5 mt-0.5">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{order.ordered_at}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-[#1E293B] font-extrabold">${order.price.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-emerald-600 font-semibold">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 border border-emerald-100">
                            Confirmed
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5E7EB] bg-white py-12 mt-24">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-[#64748B]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#1E293B]">BuyForYou</span>
            <span>&bull; Made with AI with 💙</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-[#1E293B] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[#1E293B] transition-colors">Terms</a>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-[#1E293B] transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );

  // Helper trigger
  function fileInputRefClick() {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fileInput?.click();
  }
}
