namespace CrazyPOS.Server.Dto
{
    public class InternalAgentCommandRequestDto
    {
        public string Command { get; set; } = string.Empty;
    }

    /// <summary>
    /// Represents a single action step in a command (supports multi-step commands)
    /// </summary>
    public class CommandStep
    {
        /// <summary>
        /// Action type: navigate_tab, add_products_to_cart, remove_from_cart, update_cart_quantity,
        /// clear_cart, apply_cart_discount, find_customer, create_customer, apply_customer_discount,
        /// view_customer_history, search_products, view_product_details, check_stock,
        /// view_recent_transactions, void_transaction, refund_transaction, print_receipt,
        /// apply_promotion, view_active_promotions, create_promotion, show_sales_summary,
        /// show_top_products, show_low_stock, open_settings, help, logout, none
        /// </summary>
        public string Action { get; set; } = "none";
        
        /// <summary>
        /// Target identifier (tab name, customer id, product id, etc.)
        /// </summary>
        public string? Target { get; set; }
        
        /// <summary>
        /// Product codes for cart operations
        /// </summary>
        public List<string> ProductCodes { get; set; } = new();
        
        /// <summary>
        /// Quantity for add/update operations
        /// </summary>
        public int? Quantity { get; set; }
        
        /// <summary>
        /// Discount value (percentage 0-100 or fixed amount)
        /// </summary>
        public decimal? DiscountValue { get; set; }
        
        /// <summary>
        /// Discount type: "percent" or "fixed"
        /// </summary>
        public string? DiscountType { get; set; }
        
        /// <summary>
        /// Search query for customer/product search
        /// </summary>
        public string? SearchQuery { get; set; }
        
        /// <summary>
        /// Search type: "name", "phone", "email", "code", "barcode", "category"
        /// </summary>
        public string? SearchType { get; set; }
        
        /// <summary>
        /// Promotion/promo code
        /// </summary>
        public string? PromotionCode { get; set; }
        
        /// <summary>
        /// Time period for reports: "today", "week", "month", "custom"
        /// </summary>
        public string? Period { get; set; }
        
        /// <summary>
        /// Number of items to return (for lists)
        /// </summary>
        public int? Limit { get; set; }
        
        /// <summary>
        /// Cart item index for remove/update operations
        /// </summary>
        public int? CartItemIndex { get; set; }
        
        /// <summary>
        /// Transaction ID for void/refund operations
        /// </summary>
        public string? TransactionId { get; set; }
        
        /// <summary>
        /// Additional parameters for extensibility
        /// </summary>
        public Dictionary<string, object>? Parameters { get; set; }
        
        /// <summary>
        /// Human-readable explanation of this step
        /// </summary>
        public string? Message { get; set; }
        
        /// <summary>
        /// Whether this step requires user confirmation before execution
        /// </summary>
        public bool RequiresConfirmation { get; set; }
    }

    /// <summary>
    /// Response for natural language command parsing (v2 with multi-step support)
    /// </summary>
    public class InternalAgentCommandResponseDto
    {
        /// <summary>
        /// Overall success of command parsing (not execution)
        /// </summary>
        public bool Success { get; set; }
        
        /// <summary>
        /// Human-readable summary message
        /// </summary>
        public string Message { get; set; } = string.Empty;
        
        /// <summary>
        /// For backward compatibility: primary action (first step's action)
        /// </summary>
        public string Action { get; set; } = "none";
        
        /// <summary>
        /// For backward compatibility: primary target (first step's target)
        /// </summary>
        public string? Target { get; set; }
        
        /// <summary>
        /// For backward compatibility: product codes (first step's codes)
        /// </summary>
        public List<string> ProductCodes { get; set; } = new();
        
        /// <summary>
        /// For backward compatibility: requires confirmation (true if any step requires it)
        /// </summary>
        public bool RequiresConfirmation { get; set; }
        
        /// <summary>
        /// Source of parsing: "internal-llm", "heuristic", "hybrid"
        /// </summary>
        public string Source { get; set; } = "internal-ollama";
        
        /// <summary>
        /// All command steps for multi-step execution (v2 feature)
        /// </summary>
        public List<CommandStep> Steps { get; set; } = new();
        
        /// <summary>
        /// Confidence score 0.0-1.0 (LLM-provided or heuristic-estimated)
        /// </summary>
        public float Confidence { get; set; } = 1.0f;
        
        /// <summary>
        /// Suggested clarifications if confidence is low
        /// </summary>
        public List<string> Suggestions { get; set; } = new();
    }

    public class InternalAgentHealthResponseDto
    {
        public bool Enabled { get; set; }
        public bool OllamaReachable { get; set; }
        public bool ModelAvailable { get; set; }
        public string ApiType { get; set; } = "unknown";
        public string Model { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
    }
}
