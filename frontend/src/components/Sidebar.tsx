"use client";

import React from "react";
import { 
  Upload, 
  Search, 
  ShoppingBag, 
  Heart, 
  Sparkles, 
  ChevronRight,
  RefreshCw
} from "lucide-react";

interface Order {
  id: number;
  product_id: number;
  product_name: string;
  price: number;
  ordered_at: string;
}

interface SidebarProps {
  onQuickSearch: (query: string) => void;
  onUploadClick: () => void;
  recentOrders: Order[];
  loadingOrders: boolean;
  refreshOrders: () => void;
}

export default function Sidebar({ 
  onQuickSearch, 
  onUploadClick, 
  recentOrders, 
  loadingOrders,
  refreshOrders 
}: SidebarProps) {
  
  const popularCategories = [
    { name: "Organic Honey", query: "organic honey" },
    { name: "Cold-Pressed Oils", query: "oil" },
    { name: "Nuts & Seeds", query: "nuts" },
    { name: "Healthy Grains", query: "grains" },
    { name: "Teas & Coffee", query: "coffee" },
  ];

  const recentSearches = [
    "Organic honey under ₹800",
    "Extra Virgin Olive Oil",
    "Healthy breakfast oats",
    "Coffee under ₹600",
  ];

  return (
    <aside className="w-full lg:w-80 flex flex-col gap-6 select-none">
      {/* Quick Actions */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs">
        <h3 className="text-xs font-semibold tracking-wider text-[#64748B] uppercase mb-4">
          Quick Actions
        </h3>
        <div className="flex flex-col gap-2">
          <button 
            onClick={onUploadClick}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold text-[#1E293B] bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 hover:border-gray-300 transition-all text-left"
          >
            <Upload className="h-4 w-4 text-blue-600" />
            <span>Photo Phenko (Upload)</span>
          </button>
          <button 
            onClick={() => onQuickSearch("I want organic raw honey under $20")}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold text-[#1E293B] bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 hover:border-gray-300 transition-all text-left"
          >
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span>Find Best Honey</span>
          </button>
        </div>
      </div>

      {/* Recent Searches */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs">
        <h3 className="text-xs font-semibold tracking-wider text-[#64748B] uppercase mb-3">
          Recent Searches
        </h3>
        <div className="flex flex-col gap-1.5">
          {recentSearches.map((search, i) => (
            <button
              key={i}
              onClick={() => onQuickSearch(search)}
              className="flex items-center justify-between text-sm text-[#64748B] hover:text-[#1E293B] hover:bg-gray-50 px-2 py-1.5 rounded-lg transition-all text-left w-full group"
            >
              <span className="truncate mr-2">{search}</span>
              <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#64748B]" />
            </button>
          ))}
        </div>
      </div>

      {/* Recent Orders from Database */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs flex flex-col max-h-[300px]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold tracking-wider text-[#64748B] uppercase">
            Recent Orders
          </h3>
          <button 
            onClick={refreshOrders}
            className="text-[#64748B] hover:text-blue-600 p-1 rounded-full hover:bg-gray-50 transition-all"
            disabled={loadingOrders}
            title="Refresh order history"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingOrders ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        <div className="flex flex-col gap-3 overflow-y-auto pr-1">
          {loadingOrders ? (
            <div className="flex flex-col gap-2 py-4">
              <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
              <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
            </div>
          ) : recentOrders.length === 0 ? (
            <p className="text-xs text-[#64748B] italic text-center py-4">
              No orders placed yet.
            </p>
          ) : (
            recentOrders.slice(0, 4).map((order) => (
              <div 
                key={order.id}
                className="border-b border-gray-100 last:border-0 pb-2.5 last:pb-0 text-left"
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-[#1E293B] truncate max-w-[150px]">
                    {order.product_name}
                  </span>
                  <span className="text-xs font-bold text-blue-600">
                    ${order.price.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[10px] text-[#64748B]">
                    ID: #{order.id}
                  </span>
                  <span className="text-[10px] text-[#64748B]">
                    {order.ordered_at ? order.ordered_at.split(" ")[0] : "Just now"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Popular Categories */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs">
        <h3 className="text-xs font-semibold tracking-wider text-[#64748B] uppercase mb-3">
          Popular Categories
        </h3>
        <div className="flex flex-wrap gap-2">
          {popularCategories.map((cat, i) => (
            <button
              key={i}
              onClick={() => onQuickSearch(`Show me items in ${cat.query} category`)}
              className="text-xs font-medium bg-[#F7F8FA] border border-gray-200 text-[#1E293B] px-3 py-1.5 rounded-full hover:bg-gray-100 hover:border-gray-300 transition-all cursor-pointer"
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
