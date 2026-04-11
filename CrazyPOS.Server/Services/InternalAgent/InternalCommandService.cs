using System.Net.Http.Json;
using System.Text.RegularExpressions;
using System.Text.Json;
using System.Net;
using CrazyPOS.Server.Dto;
using Microsoft.Extensions.Options;

namespace CrazyPOS.Server.Services.InternalAgent
{
    public class InternalCommandService : IInternalCommandService
    {
        private static readonly HashSet<string> AllowedTabs =
        [
            "dashboard",
            "sales",
            "inventory",
            "customers",
            "promotions",
            "analytics",
            "users",
            "transactions",
            "settings",
            "products",
            "categories"
        ];

        private readonly IHttpClientFactory _httpClientFactory;
        private readonly InternalAgentSettings _settings;
        private readonly ILogger<InternalCommandService> _logger;

        public InternalCommandService(
            IHttpClientFactory httpClientFactory,
            IOptions<InternalAgentSettings> settings,
            ILogger<InternalCommandService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _settings = settings.Value;
            _logger = logger;
        }

        public async Task<InternalAgentCommandResponseDto> ParseCommandAsync(string command, CancellationToken cancellationToken = default)
        {
            if (!_settings.Enabled)
            {
                return new InternalAgentCommandResponseDto
                {
                    Success = false,
                    Message = "Internal agent is disabled by configuration.",
                    Action = "none"
                };
            }

            if (string.IsNullOrWhiteSpace(command))
            {
                return new InternalAgentCommandResponseDto
                {
                    Success = false,
                    Message = "Command is required.",
                    Action = "none"
                };
            }

            // Fast path for simple/safe commands so they continue to work even when LLM endpoint is unavailable.
            var heuristicResult = ParseByHeuristics(command);
            if (heuristicResult.Action != "none")
            {
                heuristicResult.Source = "heuristic";
                return heuristicResult;
            }

            try
            {
                var client = _httpClientFactory.CreateClient("InternalAgentLlm");
                using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                timeoutCts.CancelAfter(TimeSpan.FromSeconds(_settings.TimeoutSeconds));

                var prompt = BuildPrompt(command);
                var payload = new
                {
                    model = _settings.Model,
                    prompt,
                    stream = false,
                    options = new
                    {
                        temperature = 0
                    }
                };

                var rawModelResponse = await GenerateModelResponseAsync(client, payload, timeoutCts.Token);
                var parsed = ParseModelJson(rawModelResponse);

                if (parsed != null)
                {
                    parsed.Source = "internal-llm";
                    return parsed;
                }

                _logger.LogWarning("Internal agent response was not parseable JSON. Falling back to keyword parser.");
                var fallback = ParseByHeuristics(command);
                fallback.Source = "heuristic";
                return fallback;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Internal agent command parse failed. Falling back to heuristics.");
                var fallback = ParseByHeuristics(command);
                fallback.Source = "heuristic";
                return fallback;
            }
        }

        public async Task<InternalAgentHealthResponseDto> CheckHealthAsync(CancellationToken cancellationToken = default)
        {
            if (!_settings.Enabled)
            {
                return new InternalAgentHealthResponseDto
                {
                    Enabled = false,
                    OllamaReachable = false,
                    ModelAvailable = false,
                    ApiType = "disabled",
                    Model = _settings.Model,
                    Message = "Internal agent is disabled by configuration."
                };
            }

            try
            {
                var client = _httpClientFactory.CreateClient("InternalAgentLlm");
                using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                timeoutCts.CancelAfter(TimeSpan.FromSeconds(_settings.TimeoutSeconds));
                var configuredModel = _settings.Model.Trim();

                var discovery = await DiscoverModelsAsync(client, timeoutCts.Token);
                var availableModels = discovery.Models;

                var modelAvailable = availableModels.Any(m =>
                    string.Equals(m.Trim(), configuredModel, StringComparison.OrdinalIgnoreCase));

                return new InternalAgentHealthResponseDto
                {
                    Enabled = true,
                    OllamaReachable = true,
                    ModelAvailable = modelAvailable,
                    ApiType = discovery.ApiType,
                    Model = configuredModel,
                    Message = modelAvailable
                        ? "Ollama is reachable and model is available."
                        : $"{discovery.ApiType} endpoint is reachable but configured model was not found."
                };
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Internal agent health check failed.");
                return new InternalAgentHealthResponseDto
                {
                    Enabled = true,
                    OllamaReachable = false,
                    ModelAvailable = false,
                    ApiType = "unknown",
                    Model = _settings.Model,
                    Message = $"Ollama health check failed: {ex.Message}"
                };
            }
        }

        private static string BuildPrompt(string command)
        {
            return """
You are a strict JSON command parser for a POS (Point of Sale) web application.
Parse the user's natural language command into structured action steps.

## Allowed Actions

### Cart Operations
- `add_products_to_cart` - Add products by code (e.g., "add P001 and P002")
- `remove_from_cart` - Remove item by cart index (e.g., "remove the second item")
- `update_cart_quantity` - Change quantity (e.g., "make it 5 units")
- `clear_cart` - Empty entire cart (requires confirmation)
- `apply_cart_discount` - Apply discount to cart (e.g., "give 10% off" or "$5 discount")

### Customer Operations
- `find_customer` - Search by name, phone, or email (e.g., "find customer John")
- `create_customer` - Add new customer (requires details)
- `apply_customer_discount` - Apply customer-specific pricing
- `view_customer_history` - Show past transactions (e.g., "show John's orders")

### Product Operations
- `search_products` - Find by name, code, category (e.g., "search for coffee")
- `view_product_details` - Show product info (e.g., "show details for P123")
- `check_stock` - Query inventory levels (e.g., "how many P001 in stock?")

### Transaction Operations
- `view_recent_transactions` - Show last N sales (e.g., "show today's sales")
- `void_transaction` - Cancel transaction (requires confirmation + transaction ID)
- `refund_transaction` - Process refund (requires confirmation + transaction ID)
- `print_receipt` - Reprint last receipt

### Promotion Operations
- `apply_promotion` - Apply promo code (e.g., "use code MORNING10")
- `view_active_promotions` - List current offers
- `create_promotion` - Create new promo (requires details + confirmation)

### Analytics/Reporting
- `show_sales_summary` - Sales for period (e.g., "show today's sales" or "this week's revenue")
- `show_top_products` - Best sellers (e.g., "top 10 products")
- `show_low_stock` - Items needing reorder

### Navigation & System
- `navigate_tab` - Switch tabs: dashboard, sales, inventory, customers, promotions, analytics, users, transactions, settings, products, categories
- `open_settings` - Quick settings access
- `help` - Show available commands
- `logout` - End session (requires confirmation)
- `none` - Unsupported or ambiguous command

## Output Schema
Return a JSON object with this structure:
```json
{
  "steps": [
    {
      "action": "action_name",
      "target": "identifier_or_null",
      "productCodes": ["P001", "P002"],
      "quantity": 3,
      "discountValue": 10,
      "discountType": "percent",
      "searchQuery": "John",
      "searchType": "name",
      "promotionCode": "MORNING10",
      "period": "today",
      "limit": 10,
      "cartItemIndex": 2,
      "transactionId": "TXN123",
      "message": "Adding P001 and P002 to cart",
      "requiresConfirmation": false
    }
  ],
  "confidence": 0.95,
  "suggestions": ["Did you mean to apply the discount before tax?"],
  "message": "I'll add 2 products and apply a discount"
}
```

## Rules
1. Return ONLY valid JSON, no markdown, no explanations outside JSON
2. For multi-step commands, return all steps in order (e.g., "add coffee and apply discount" → 2 steps)
3. Extract product codes matching patterns like P001, P-123, SKU456, barcode numbers
4. Extract quantities from phrases like "2 coffees", "three units", "qty 5"
5. For discounts, determine if percentage ("10%", "ten percent") or fixed ("$5", "5 dollars")
6. Set `requiresConfirmation=true` for: void_transaction, refund_transaction, clear_cart, logout, create_customer, create_promotion
7. If command is ambiguous, set action="none" and provide suggestions
8. Set confidence: 1.0 for clear commands, 0.5-0.8 for somewhat ambiguous, <0.5 for guesswork

## Examples

User: "Add P001 and P002 to my cart"
→ {"steps": [{"action": "add_products_to_cart", "productCodes": ["P001", "P002"], "message": "Adding 2 products to cart", "requiresConfirmation": false}], "confidence": 1.0}

User: "Find customer Sarah and show her last 5 orders"
→ {"steps": [{"action": "find_customer", "searchQuery": "Sarah", "searchType": "name", "message": "Searching for customer Sarah"}, {"action": "view_customer_history", "limit": 5, "message": "Showing last 5 orders", "requiresConfirmation": false}], "confidence": 0.95}

User: "Apply 10% discount and then checkout"
→ {"steps": [{"action": "apply_cart_discount", "discountValue": 10, "discountType": "percent", "message": "Applying 10% discount"}, {"action": "navigate_tab", "target": "sales", "message": "Proceeding to checkout"}], "confidence": 0.9}

User: "Show me today's sales"
→ {"steps": [{"action": "show_sales_summary", "period": "today", "message": "Retrieving today's sales summary", "requiresConfirmation": false}], "confidence": 1.0}

User: "Remove the second item from cart"
→ {"steps": [{"action": "remove_from_cart", "cartItemIndex": 2, "message": "Removing item at position 2", "requiresConfirmation": false}], "confidence": 0.95}

User: "Void transaction TXN789"
→ {"steps": [{"action": "void_transaction", "transactionId": "TXN789", "message": "Voiding transaction TXN789", "requiresConfirmation": true}], "confidence": 0.98}

User: "I want coffee"
→ {"steps": [{"action": "search_products", "searchQuery": "coffee", "message": "Searching for products matching 'coffee'", "requiresConfirmation": false}], "confidence": 0.7, "suggestions": ["Did you mean to add coffee to cart?", "Should I search by product name or category?"]}

User: "Navigate to inventory"
→ {"steps": [{"action": "navigate_tab", "target": "inventory", "message": "Opening inventory tab", "requiresConfirmation": false}], "confidence": 1.0}

Now parse this user command:
""" + command;
        }

        private static InternalAgentCommandResponseDto? ParseModelJson(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw))
            {
                return null;
            }

            try
            {
                using var doc = JsonDocument.Parse(raw);
                var root = doc.RootElement;

                // Parse steps array (v2 format)
                var steps = new List<CommandStep>();
                if (root.TryGetProperty("steps", out var stepsEl) && stepsEl.ValueKind == JsonValueKind.Array)
                {
                    foreach (var stepEl in stepsEl.EnumerateArray())
                    {
                        var step = ParseCommandStep(stepEl);
                        if (step != null)
                        {
                            steps.Add(step);
                        }
                    }
                }

                // Fallback: parse single-step format (v1 backward compatibility)
                if (steps.Count == 0)
                {
                    var singleStep = ParseCommandStep(root);
                    if (singleStep != null && singleStep.Action != "none")
                    {
                        steps.Add(singleStep);
                    }
                }

                var message = root.TryGetProperty("message", out var messageEl)
                    ? messageEl.GetString()
                    : (steps.Count > 0 ? steps[0].Message : "Command parsed.");

                var confidence = root.TryGetProperty("confidence", out var confidenceEl)
                    ? confidenceEl.GetSingle()
                    : 1.0f;

                var suggestions = new List<string>();
                if (root.TryGetProperty("suggestions", out var suggestionsEl) && suggestionsEl.ValueKind == JsonValueKind.Array)
                {
                    foreach (var sug in suggestionsEl.EnumerateArray())
                    {
                        var sugText = sug.GetString();
                        if (!string.IsNullOrWhiteSpace(sugText))
                        {
                            suggestions.Add(sugText);
                        }
                    }
                }

                // Build response with backward compatibility fields
                var response = new InternalAgentCommandResponseDto
                {
                    Success = steps.Count > 0 && steps.All(s => s.Action != "none"),
                    Message = message ?? "Command parsed.",
                    Action = steps.FirstOrDefault()?.Action ?? "none",
                    Target = steps.FirstOrDefault()?.Target,
                    ProductCodes = steps.FirstOrDefault()?.ProductCodes ?? new List<string>(),
                    RequiresConfirmation = steps.Any(s => s.RequiresConfirmation),
                    Source = "internal-llm",
                    Steps = steps,
                    Confidence = confidence,
                    Suggestions = suggestions
                };

                return response;
            }
            catch
            {
                return null;
            }
        }

        private static CommandStep? ParseCommandStep(JsonElement element)
        {
            try
            {
                var action = element.TryGetProperty("action", out var actionEl)
                    ? actionEl.GetString()?.Trim().ToLowerInvariant()
                    : "none";

                var target = element.TryGetProperty("target", out var targetEl)
                    ? targetEl.GetString()?.Trim().ToLowerInvariant()
                    : null;

                var productCodes = new List<string>();
                if (element.TryGetProperty("productCodes", out var codesEl) && codesEl.ValueKind == JsonValueKind.Array)
                {
                    foreach (var item in codesEl.EnumerateArray())
                    {
                        var code = item.GetString()?.Trim();
                        if (!string.IsNullOrWhiteSpace(code))
                        {
                            productCodes.Add(code);
                        }
                    }
                }

                var quantity = element.TryGetProperty("quantity", out var qtyEl)
                    ? qtyEl.GetInt32()
                    : (int?)null;

                var discountValue = element.TryGetProperty("discountValue", out var discValEl)
                    ? discValEl.GetDecimal()
                    : (decimal?)null;

                var discountType = element.TryGetProperty("discountType", out var discTypeEl)
                    ? discTypeEl.GetString()?.Trim().ToLowerInvariant()
                    : null;

                var searchQuery = element.TryGetProperty("searchQuery", out var searchQEl)
                    ? searchQEl.GetString()
                    : null;

                var searchType = element.TryGetProperty("searchType", out var searchTEl)
                    ? searchTEl.GetString()?.Trim().ToLowerInvariant()
                    : null;

                var promotionCode = element.TryGetProperty("promotionCode", out var promoEl)
                    ? promoEl.GetString()
                    : null;

                var period = element.TryGetProperty("period", out var periodEl)
                    ? periodEl.GetString()?.Trim().ToLowerInvariant()
                    : null;

                var limit = element.TryGetProperty("limit", out var limitEl)
                    ? limitEl.GetInt32()
                    : (int?)null;

                var cartItemIndex = element.TryGetProperty("cartItemIndex", out var idxEl)
                    ? idxEl.GetInt32()
                    : (int?)null;

                var transactionId = element.TryGetProperty("transactionId", out var txnEl)
                    ? txnEl.GetString()
                    : null;

                var message = element.TryGetProperty("message", out var msgEl)
                    ? msgEl.GetString()
                    : null;

                var requiresConfirmation = element.TryGetProperty("requiresConfirmation", out var confirmEl)
                    && confirmEl.ValueKind == JsonValueKind.True;

                return new CommandStep
                {
                    Action = action ?? "none",
                    Target = target,
                    ProductCodes = productCodes,
                    Quantity = quantity,
                    DiscountValue = discountValue,
                    DiscountType = discountType,
                    SearchQuery = searchQuery,
                    SearchType = searchType,
                    PromotionCode = promotionCode,
                    Period = period,
                    Limit = limit,
                    CartItemIndex = cartItemIndex,
                    TransactionId = transactionId,
                    Message = message,
                    RequiresConfirmation = requiresConfirmation
                };
            }
            catch
            {
                return null;
            }
        }

        private static InternalAgentCommandResponseDto ParseByHeuristics(string command)
        {
            var normalized = command.Trim().ToLowerInvariant();
            var steps = new List<CommandStep>();

            // Multi-step detection: split by common connectors
            var subCommands = SplitIntoSubCommands(command);
            foreach (var subCommand in subCommands)
            {
                var subNormalized = subCommand.Trim().ToLowerInvariant();
                var step = ParseSingleStepByHeuristics(subNormalized, subCommand);
                if (step != null && step.Action != "none")
                {
                    steps.Add(step);
                }
            }

            // If no steps parsed, try the full command as one
            if (steps.Count == 0)
            {
                var singleStep = ParseSingleStepByHeuristics(normalized, command);
                if (singleStep != null && singleStep.Action != "none")
                {
                    steps.Add(singleStep);
                }
            }

            // Build response
            var response = new InternalAgentCommandResponseDto
            {
                Success = steps.Count > 0,
                Message = steps.Count > 0 ? string.Join("; ", steps.Select(s => s.Message ?? s.Action)) : "No supported action found.",
                Action = steps.FirstOrDefault()?.Action ?? "none",
                Target = steps.FirstOrDefault()?.Target,
                ProductCodes = steps.FirstOrDefault()?.ProductCodes ?? new List<string>(),
                RequiresConfirmation = steps.Any(s => s.RequiresConfirmation),
                Source = "heuristic",
                Steps = steps,
                Confidence = steps.Count > 0 ? 0.7f : 0.3f,
                Suggestions = steps.Count == 0 ? GenerateSuggestions(command) : new List<string>()
            };

            return response;
        }

        private static List<string> SplitIntoSubCommands(string command)
        {
            // Split by common connectors while preserving the command text
            var connectors = new[] { " then ", " and ", " after that ", ", then ", ", and " };
            var parts = new List<string> { command };

            foreach (var connector in connectors)
            {
                if (command.ToLowerInvariant().Contains(connector))
                {
                    parts = command.Split(new[] { connector }, StringSplitOptions.RemoveEmptyEntries)
                        .Select(p => p.Trim())
                        .Where(p => !string.IsNullOrWhiteSpace(p))
                        .ToList();
                    break;
                }
            }

            return parts;
        }

        private static CommandStep? ParseSingleStepByHeuristics(string normalized, string original)
        {
            // Product/cart operations
            var extractedCodes = ExtractProductCodes(original);
            var quantity = ExtractQuantity(original);

            if (extractedCodes.Count > 0 && (normalized.Contains("add") || normalized.Contains("cart")))
            {
                return new CommandStep
                {
                    Action = "add_products_to_cart",
                    ProductCodes = extractedCodes,
                    Quantity = quantity,
                    Message = $"Adding {string.Join(", ", extractedCodes)} to cart",
                    RequiresConfirmation = false
                };
            }

            if (normalized.Contains("remove") && normalized.Contains("cart"))
            {
                var index = ExtractOrdinalPosition(normalized);
                return new CommandStep
                {
                    Action = "remove_from_cart",
                    CartItemIndex = index,
                    Message = index.HasValue ? $"Removing item at position {index}" : "Removing item from cart",
                    RequiresConfirmation = false
                };
            }

            if (normalized.Contains("clear") && normalized.Contains("cart"))
            {
                return new CommandStep
                {
                    Action = "clear_cart",
                    Message = "Clearing all items from cart",
                    RequiresConfirmation = true
                };
            }

            // Discount operations
            if (normalized.Contains("discount") || normalized.Contains("off") || normalized.Contains("%"))
            {
                var (discountValue, discountType) = ExtractDiscount(original);
                if (discountValue.HasValue)
                {
                    return new CommandStep
                    {
                        Action = "apply_cart_discount",
                        DiscountValue = discountValue,
                        DiscountType = discountType,
                        Message = $"Applying {discountValue}{(discountType == "percent" ? "%" : "")} discount",
                        RequiresConfirmation = false
                    };
                }
            }

            // Customer operations
            if (normalized.Contains("find customer") || normalized.Contains("search customer") || normalized.Contains("look up"))
            {
                var customerName = ExtractCustomerName(original);
                return new CommandStep
                {
                    Action = "find_customer",
                    SearchQuery = customerName ?? "customer",
                    SearchType = "name",
                    Message = $"Searching for customer {(customerName ?? "")}".Trim(),
                    RequiresConfirmation = false
                };
            }

            if (normalized.Contains("customer") && (normalized.Contains("history") || normalized.Contains("orders") || normalized.Contains("transactions")))
            {
                var limit = ExtractQuantity(original) ?? 5;
                return new CommandStep
                {
                    Action = "view_customer_history",
                    Limit = limit,
                    Message = $"Showing last {limit} orders",
                    RequiresConfirmation = false
                };
            }

            // Product search
            if (normalized.Contains("search") || normalized.Contains("find product") || normalized.Contains("look for"))
            {
                var searchQuery = ExtractSearchTerm(original);
                return new CommandStep
                {
                    Action = "search_products",
                    SearchQuery = searchQuery ?? "product",
                    Message = $"Searching for products matching '{(searchQuery ?? "product")}'",
                    RequiresConfirmation = false
                };
            }

            // Stock check
            if ((normalized.Contains("stock") || normalized.Contains("inventory") || normalized.Contains("quantity")) 
                && (normalized.Contains("check") || normalized.Contains("how many") || normalized.Contains("left")))
            {
                var codes = ExtractProductCodes(original);
                return new CommandStep
                {
                    Action = "check_stock",
                    ProductCodes = codes,
                    Target = codes.FirstOrDefault(),
                    Message = codes.Count > 0 ? $"Checking stock for {string.Join(", ", codes)}" : "Checking inventory",
                    RequiresConfirmation = false
                };
            }

            // Sales/reporting
            if (normalized.Contains("sales") && (normalized.Contains("show") || normalized.Contains("today") || normalized.Contains("week") || normalized.Contains("month")))
            {
                var period = DeterminePeriod(normalized);
                return new CommandStep
                {
                    Action = "show_sales_summary",
                    Period = period,
                    Message = $"Retrieving {period} sales summary",
                    RequiresConfirmation = false
                };
            }

            if (normalized.Contains("top") && (normalized.Contains("product") || normalized.Contains("item") || normalized.Contains("seller")))
            {
                var limit = ExtractQuantity(original) ?? 10;
                return new CommandStep
                {
                    Action = "show_top_products",
                    Limit = limit,
                    Message = $"Showing top {limit} products",
                    RequiresConfirmation = false
                };
            }

            // Transaction operations
            if (normalized.Contains("void") && normalized.Contains("transaction"))
            {
                var txnId = ExtractTransactionId(original);
                return new CommandStep
                {
                    Action = "void_transaction",
                    TransactionId = txnId,
                    Message = txnId != null ? $"Voiding transaction {txnId}" : "Voiding transaction",
                    RequiresConfirmation = true
                };
            }

            if (normalized.Contains("refund") && normalized.Contains("transaction"))
            {
                var txnId = ExtractTransactionId(original);
                return new CommandStep
                {
                    Action = "refund_transaction",
                    TransactionId = txnId,
                    Message = txnId != null ? $"Processing refund for {txnId}" : "Processing refund",
                    RequiresConfirmation = true
                };
            }

            // Promotion
            if (normalized.Contains("promo") || normalized.Contains("coupon") || normalized.Contains("code"))
            {
                var promoCode = ExtractPromoCode(original);
                if (!string.IsNullOrWhiteSpace(promoCode))
                {
                    return new CommandStep
                    {
                        Action = "apply_promotion",
                        PromotionCode = promoCode,
                        Message = $"Applying promotion code {promoCode}",
                        RequiresConfirmation = false
                    };
                }
            }

            // Logout
            if (normalized.Contains("logout") || normalized.Contains("log out") || normalized.Contains("sign out"))
            {
                return new CommandStep
                {
                    Action = "logout",
                    Message = "Logging out",
                    RequiresConfirmation = true
                };
            }

            // Tab navigation
            foreach (var tab in AllowedTabs)
            {
                if (normalized.Contains(tab))
                {
                    return new CommandStep
                    {
                        Action = "navigate_tab",
                        Target = tab,
                        Message = $"Opening {tab}",
                        RequiresConfirmation = false
                    };
                }
            }

            // Settings
            if (normalized.Contains("settings") || normalized.Contains("config") || normalized.Contains("preference"))
            {
                return new CommandStep
                {
                    Action = "open_settings",
                    Message = "Opening settings",
                    RequiresConfirmation = false
                };
            }

            // Help
            if (normalized.Contains("help") || normalized.Contains("what can") || normalized.Contains("available command"))
            {
                return new CommandStep
                {
                    Action = "help",
                    Message = "Showing available commands",
                    RequiresConfirmation = false
                };
            }

            return null;
        }

        private static List<string> GenerateSuggestions(string command)
        {
            var suggestions = new List<string>();
            var normalized = command.ToLowerInvariant();

            if (normalized.Contains("product") || normalized.Contains("item"))
            {
                suggestions.Add("Did you mean to add products to cart?");
                suggestions.Add("Should I search for products by name or code?");
            }

            if (normalized.Contains("customer") || normalized.Contains("client"))
            {
                suggestions.Add("Did you want to find a customer or view their history?");
            }

            if (normalized.Contains("discount") || normalized.Contains("off"))
            {
                suggestions.Add("Should I apply a percentage or fixed amount discount?");
            }

            if (normalized.Contains("sales") || normalized.Contains("report"))
            {
                suggestions.Add("Did you want to see today's sales or a specific period?");
            }

            return suggestions;
        }

        private static int? ExtractOrdinalPosition(string command)
        {
            var ordinals = new Dictionary<string, int>
            {
                { "first", 1 }, { "1st", 1 }, { "second", 2 }, { "2nd", 2 },
                { "third", 3 }, { "3rd", 3 }, { "fourth", 4 }, { "4th", 4 },
                { "fifth", 5 }, { "5th", 5 }, { "last", -1 }
            };

            foreach (var kvp in ordinals)
            {
                if (command.Contains(kvp.Key))
                {
                    return kvp.Value;
                }
            }

            return null;
        }

        private static (decimal? value, string type) ExtractDiscount(string command)
        {
            // Percentage: "10%", "ten percent", "10 percent"
            var percentMatch = Regex.Match(command, @"(\d+)\s*(?:percent|%)", RegexOptions.IgnoreCase);
            if (percentMatch.Success)
            {
                return (decimal.Parse(percentMatch.Groups[1].Value), "percent");
            }

            // Fixed amount: "$5", "5 dollars", "$5.00"
            var fixedMatch = Regex.Match(command, @"\$?(\d+(?:\.\d{1,2})?)\s*(?:dollars?|usd)?", RegexOptions.IgnoreCase);
            if (fixedMatch.Success)
            {
                return (decimal.Parse(fixedMatch.Groups[1].Value), "fixed");
            }

            return (null, null);
        }

        private static string? ExtractCustomerName(string command)
        {
            // Look for patterns like "customer John" or "customer John Smith"
            var match = Regex.Match(command, @"customer\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)", RegexOptions.IgnoreCase);
            if (match.Success)
            {
                return match.Groups[1].Value;
            }

            return null;
        }

        private static string? ExtractSearchTerm(string command)
        {
            // Extract search term after "search for", "find", etc.
            var match = Regex.Match(command, @"(?:search for|find|look for)\s+(.+?)(?:\s*$|\s+(?:in|by|for))", RegexOptions.IgnoreCase);
            if (match.Success)
            {
                return match.Groups[1].Value.Trim();
            }

            return null;
        }

        private static string? ExtractTransactionId(string command)
        {
            // Look for patterns like "TXN123", "transaction 123", "#123"
            var match = Regex.Match(command, @"(?:txn|transaction|tx|id|#)?\s*([A-Z]{0,3}\d{3,})", RegexOptions.IgnoreCase);
            if (match.Success)
            {
                return match.Groups[1].Value.ToUpperInvariant();
            }

            return null;
        }

        private static string? ExtractPromoCode(string command)
        {
            // Look for patterns like "MORNING10", "code SAVE20", "promo SUMMER"
            var match = Regex.Match(command, @"(?:code|promo|promotion)?\s*([A-Z][A-Z0-9]{2,})", RegexOptions.IgnoreCase);
            if (match.Success)
            {
                return match.Groups[1].Value.ToUpperInvariant();
            }

            return null;
        }

        private static string DeterminePeriod(string command)
        {
            if (command.Contains("today") || command.Contains("daily")) return "today";
            if (command.Contains("week") || command.Contains("weekly")) return "week";
            if (command.Contains("month") || command.Contains("monthly")) return "month";
            if (command.Contains("year") || command.Contains("yearly")) return "year";
            return "today";
        }



        private static List<string> ExtractProductCodes(string command)
        {
            // Match various product code patterns:
            // P001, P-001, SKU123, PROD-456, barcode numbers, etc.
            var patterns = new[]
            {
                @"\b([A-Z]{1,4}[-]?\d{2,})\b",           // P001, PROD-123, SKU-456
                @"\b(\d{4,})\b",                          // Plain barcodes (4+ digits)
                @"\b([A-Z]{2,}\d{2,})\b"                  // ABC123 format
            };

            var codes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var pattern in patterns)
            {
                var matches = Regex.Matches(command, pattern, RegexOptions.IgnoreCase);
                foreach (Match match in matches)
                {
                    var code = match.Groups[1].Value.Trim().ToUpperInvariant();
                    if (!string.IsNullOrWhiteSpace(code) && code.Length <= 20)
                    {
                        codes.Add(code);
                    }
                }
            }

            return codes.ToList();
        }

        private static int? ExtractQuantity(string command)
        {
            // Match: "2 coffees", "three units", "qty 5", "quantity 10"
            var numberWords = new Dictionary<string, int>
            {
                { "one", 1 }, { "two", 2 }, { "three", 3 }, { "four", 4 }, { "five", 5 },
                { "six", 6 }, { "seven", 7 }, { "eight", 8 }, { "nine", 9 }, { "ten", 10 },
                { "eleven", 11 }, { "twelve", 12 }, { "thirteen", 13 }, { "fourteen", 14 },
                { "fifteen", 15 }, { "sixteen", 16 }, { "seventeen", 17 }, { "eighteen", 18 },
                { "nineteen", 19 }, { "twenty", 20 }
            };

            // Numeric: "2", "5 units", "qty 10"
            var numericMatch = Regex.Match(command, @"(?:qty|quantity|units?|items?)?\s*(\d+)\s*(?:units?|items?|pcs?)?", RegexOptions.IgnoreCase);
            if (numericMatch.Success)
            {
                return int.Parse(numericMatch.Groups[1].Value);
            }

            // Word numbers: "two coffees", "three items"
            foreach (var kvp in numberWords)
            {
                if (Regex.IsMatch(command, $@"\b{kvp.Key}\b", RegexOptions.IgnoreCase))
                {
                    return kvp.Value;
                }
            }

            return null;
        }

        private async Task<string?> GenerateModelResponseAsync(HttpClient client, object promptPayload, CancellationToken cancellationToken)
        {
            var prompt = BuildPromptFromPayload(promptPayload);
            var failures = new List<string>();

            var generateResponse = await client.PostAsJsonAsync("/api/generate", promptPayload, cancellationToken);
            if (generateResponse.IsSuccessStatusCode)
            {
                var llmResponse = await generateResponse.Content.ReadFromJsonAsync<OllamaGenerateResponse>(cancellationToken: cancellationToken);
                return llmResponse?.Response;
            }
            failures.Add($"/api/generate => {(int)generateResponse.StatusCode} {generateResponse.ReasonPhrase}");

            var chatPayload = new
            {
                model = _settings.Model,
                stream = false,
                messages = new[]
                {
                    new { role = "user", content = prompt }
                }
            };

            var chatResponse = await client.PostAsJsonAsync("/api/chat", chatPayload, cancellationToken);
            if (chatResponse.IsSuccessStatusCode)
            {
                var chatResult = await chatResponse.Content.ReadFromJsonAsync<OllamaChatResponse>(cancellationToken: cancellationToken);
                return chatResult?.Message?.Content;
            }
            failures.Add($"/api/chat => {(int)chatResponse.StatusCode} {chatResponse.ReasonPhrase}");

            var openAiPayload = new
            {
                model = _settings.Model,
                messages = new[]
                {
                    new { role = "user", content = prompt }
                },
                temperature = 0
            };

            var openAiResponse = await client.PostAsJsonAsync("/v1/chat/completions", openAiPayload, cancellationToken);
            if (openAiResponse.IsSuccessStatusCode)
            {
                var openAiResult = await openAiResponse.Content.ReadFromJsonAsync<OpenAiChatCompletionsResponse>(cancellationToken: cancellationToken);
                return openAiResult?.Choices?.FirstOrDefault()?.Message?.Content;
            }
            failures.Add($"/v1/chat/completions => {(int)openAiResponse.StatusCode} {openAiResponse.ReasonPhrase}");

            throw new HttpRequestException(
                $"No compatible LLM endpoint found at base URL '{client.BaseAddress}'. Tried: {string.Join("; ", failures)}");
        }

        private async Task<ApiDiscoveryResult> DiscoverModelsAsync(HttpClient client, CancellationToken cancellationToken)
        {
            var models = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var apiType = "unknown";

            var tagsResponse = await client.GetAsync("/api/tags", cancellationToken);
            if (tagsResponse.IsSuccessStatusCode)
            {
                var tags = await tagsResponse.Content.ReadFromJsonAsync<OllamaTagsResponse>(cancellationToken: cancellationToken);
                foreach (var model in tags?.Models ?? [])
                {
                    apiType = "ollama";
                    if (!string.IsNullOrWhiteSpace(model.Name))
                    {
                        models.Add(model.Name.Trim());
                    }
                    if (!string.IsNullOrWhiteSpace(model.Model))
                    {
                        models.Add(model.Model.Trim());
                    }
                }
            }

            var openAiModelsResponse = await client.GetAsync("/v1/models", cancellationToken);
            if (openAiModelsResponse.IsSuccessStatusCode)
            {
                if (apiType == "unknown")
                {
                    apiType = "openai-compatible";
                }
                var openAiModels = await openAiModelsResponse.Content.ReadFromJsonAsync<OpenAiModelsResponse>(cancellationToken: cancellationToken);
                foreach (var model in openAiModels?.Data ?? [])
                {
                    if (!string.IsNullOrWhiteSpace(model.Id))
                    {
                        models.Add(model.Id.Trim());
                    }
                }
            }

            if (models.Count == 0)
            {
                throw new HttpRequestException(
                    $"Model discovery failed at base URL '{client.BaseAddress}'. Neither /api/tags nor /v1/models responded successfully.");
            }

            return new ApiDiscoveryResult
            {
                ApiType = apiType,
                Models = models.ToList()
            };
        }

        private static string BuildPromptFromPayload(object payload)
        {
            var json = JsonSerializer.Serialize(payload);
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("prompt", out var promptEl))
            {
                return promptEl.GetString() ?? string.Empty;
            }

            return string.Empty;
        }

        private class OllamaGenerateResponse
        {
            public string? Response { get; set; }
        }

        private class OllamaChatResponse
        {
            public OllamaChatMessage? Message { get; set; }
        }

        private class OllamaChatMessage
        {
            public string? Content { get; set; }
        }

        private class OpenAiChatCompletionsResponse
        {
            public List<OpenAiChoice> Choices { get; set; } = [];
        }

        private class OpenAiChoice
        {
            public OpenAiMessage? Message { get; set; }
        }

        private class OpenAiMessage
        {
            public string? Content { get; set; }
        }

        private class OllamaTagsResponse
        {
            public List<OllamaModelTag> Models { get; set; } = [];
        }

        private class OpenAiModelsResponse
        {
            public List<OpenAiModel> Data { get; set; } = [];
        }

        private class OpenAiModel
        {
            public string? Id { get; set; }
        }

        private class OllamaModelTag
        {
            public string? Name { get; set; }
            public string? Model { get; set; }
        }
        private class ApiDiscoveryResult
        {
            public string ApiType { get; set; } = "unknown";
            public List<string> Models { get; set; } = [];
        }
    }
}
