using CrazyPOS.Server.Dto;
using CrazyPOS.Server.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Buffers.Text;
using CrazyPOS.Server.Extension;

namespace CrazyPOS.Server.Controllers
{
    [Route("api/[controller]/[action]")]
    [ApiController]
    public class POSController : ControllerBase
    {
        private readonly IDbContextFactory<crazypos_devContext> _dbFactory;

        public POSController(IDbContextFactory<crazypos_devContext> dbFactory)
        {
            _dbFactory = dbFactory;
        }
        [HttpGet]
        [ActionName("GetProductDetails")]
        public IActionResult GetProductDetails()
        {
            List<Product> lstProducts = new List<Product>();
            List<Category> lstCategories = new List<Category>();
            List<ProductDto> lstProductDtos = new List<ProductDto>();
            using (var dbContext = _dbFactory.CreateDbContext())
            {
                lstProducts = dbContext.Products.ToList();
                lstCategories = dbContext.Categories.ToList();
            }

            lstProductDtos = (from prod in lstProducts
                              join cat in lstCategories on prod.Categoryid equals cat.Categoryid
                              select new ProductDto
                              {
                                  Productid = prod.Productid,
                                  Name = prod.Name,
                                  Price = prod.Price,
                                  Categoryid = prod.Categoryid,
                                  CategoryName = cat.Name,
                                  Stock = prod.Stock,
                                  Image = prod?.Image?.ToBase64(),
                                  Imgextension = prod.Imgextension.TrimStart('.'),
                                  Barcode = prod.Barcode,
                                  Description = prod.Description
                              }).ToList();

            return Ok(lstProductDtos);
        }

        [HttpGet]
        [ActionName("GetCategories")]
        public IActionResult GetCategories()
        {
            List<Category> lstCategories = new List<Category>();
            using (var dbContext = _dbFactory.CreateDbContext())
            {
                lstCategories = dbContext.Categories.ToList();
            }
            return Ok(lstCategories);
        }

        [HttpPost]
        [ActionName("AddProduct")]
        public async Task<IActionResult> AddProduct([FromForm] Product product, IFormFile image)
        {
            // Validate required fields
            if (string.IsNullOrWhiteSpace(product.Name))
            {
                return BadRequest("Product name is required");
            }

            if (product.Price <= 0)
            {
                return BadRequest("Product price must be greater than 0");
            }

            if (product.Stock < 0)
            {
                return BadRequest("Product stock cannot be negative");
            }

            if (product.Categoryid <= 0)
            {
                return BadRequest("Valid category is required");
            }

            if (image != null)
            {
                using var ms = new MemoryStream();
                await image.CopyToAsync(ms);
                var imageBytes = ms.ToArray();
                product.Image = imageBytes;
                product.Imgextension = Path.GetExtension(image.FileName);
            }

            using (var dbContext = _dbFactory.CreateDbContext())
            {
                dbContext.Products.Add(product);
                dbContext.SaveChanges();
            }
            return Ok(product);
        }

        [HttpPost]
        [ActionName("AddCategory")]
        public IActionResult AddCategory([FromBody] Category category)
        {
            if (string.IsNullOrWhiteSpace(category.Name))
            {
                return BadRequest("Category name is required");
            }

            using (var dbContext = _dbFactory.CreateDbContext())
            {
                dbContext.Categories.Add(category);
                dbContext.SaveChanges();
            }
            return Ok(category);
        }

        [HttpPut]
        [ActionName("UpdateCategory")]
        public IActionResult UpdateCategory([FromBody] Category category)
        {
            if (string.IsNullOrWhiteSpace(category.Name))
            {
                return BadRequest("Category name is required");
            }

            using (var dbContext = _dbFactory.CreateDbContext())
            {
                var existingCategory = dbContext.Categories.Find(category.Categoryid);
                if (existingCategory == null)
                {
                    return NotFound("Category not found");
                }

                existingCategory.Name = category.Name;
                dbContext.SaveChanges();
            }
            return Ok(category);
        }

        [HttpDelete]
        [ActionName("DeleteCategory")]
        public IActionResult DeleteCategory(long categoryId)
        {
            using (var dbContext = _dbFactory.CreateDbContext())
            {
                var category = dbContext.Categories.Find(categoryId);
                if (category == null)
                {
                    return NotFound("Category not found");
                }

                // Check if category has products
                var productsInCategory = dbContext.Products.Where(p => p.Categoryid == categoryId).Count();
                if (productsInCategory > 0)
                {
                    return BadRequest($"Cannot delete category. It has {productsInCategory} product(s).");
                }

                dbContext.Categories.Remove(category);
                dbContext.SaveChanges();
            }
            return Ok(new { message = "Category deleted successfully" });
        }

        [HttpPut]
        [ActionName("UpdateProduct")]
        public async Task<IActionResult> UpdateProduct([FromForm] Product product, IFormFile? image)
        {
            using (var dbContext = _dbFactory.CreateDbContext())
            {
                var existingProduct = dbContext.Products.Find(product.Productid);
                if (existingProduct == null)
                {
                    return NotFound("Product not found");
                }

                // Validate required fields
                if (string.IsNullOrWhiteSpace(product.Name))
                {
                    return BadRequest("Product name is required");
                }

                if (product.Price <= 0)
                {
                    return BadRequest("Product price must be greater than 0");
                }

                if (product.Stock < 0)
                {
                    return BadRequest("Product stock cannot be negative");
                }

                if (product.Categoryid <= 0)
                {
                    return BadRequest("Valid category is required");
                }

                existingProduct.Name = product.Name;
                existingProduct.Price = product.Price;
                existingProduct.Stock = product.Stock;
                existingProduct.Barcode = product.Barcode ?? existingProduct.Barcode;
                existingProduct.Description = product.Description ?? existingProduct.Description;
                existingProduct.Categoryid = product.Categoryid;

                if (image != null)
                {
                    using var ms = new MemoryStream();
                    await image.CopyToAsync(ms);
                    var imageBytes = ms.ToArray();
                    existingProduct.Image = imageBytes;
                    existingProduct.Imgextension = Path.GetExtension(image.FileName);
                }

                dbContext.SaveChanges();
            }
            return Ok(product);
        }

        [HttpDelete]
        [ActionName("DeleteProduct")]
        public IActionResult DeleteProduct(long productId)
        {
            using (var dbContext = _dbFactory.CreateDbContext())
            {
                var product = dbContext.Products.Find(productId);
                if (product == null)
                {
                    return NotFound("Product not found");
                }

                dbContext.Products.Remove(product);
                dbContext.SaveChanges();
            }
            return Ok(new { message = "Product deleted successfully" });
        }

        [HttpPost]
        [ActionName("CreateHoldOrder")]
        public IActionResult CreateHoldOrder([FromBody] CreateHoldOrderDto holdOrderDto)
        {
            if (string.IsNullOrWhiteSpace(holdOrderDto.CustomerName))
            {
                return BadRequest("Customer name is required");
            }

            if (holdOrderDto.Items == null || holdOrderDto.Items.Count == 0)
            {
                return BadRequest("At least one item is required");
            }

            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var holdOrder = new HoldOrder
                    {
                        CustomerName = holdOrderDto.CustomerName,
                        TotalAmount = holdOrderDto.TotalAmount,
                        OrderDate = DateTime.Now,
                        Status = "Active"
                    };

                    dbContext.HoldOrders.Add(holdOrder);
                    dbContext.SaveChanges();

                    // Add hold order items
                    foreach (var item in holdOrderDto.Items)
                    {
                        var holdOrderItem = new HoldOrderItem
                        {
                            HoldOrderId = holdOrder.Id,
                            Productid = item.Productid,
                            Quantity = item.Quantity,
                            Price = item.Price
                        };
                        dbContext.HoldOrderItems.Add(holdOrderItem);
                    }
                    dbContext.SaveChanges();

                    return Ok(new { message = "Order placed on hold successfully", holdOrderId = holdOrder.Id });
                }
            }
            catch (Exception ex)
            {
                return BadRequest($"Error creating hold order: {ex.Message}");
            }
        }

        [HttpGet]
        [ActionName("GetHoldOrders")]
        public IActionResult GetHoldOrders()
        {
            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var holdOrders = dbContext.HoldOrders
                        .Where(ho => ho.Status == "Active")
                        .AsEnumerable()  // Switch to LINQ to Objects for better reliability
                        .Select(ho => new HoldOrderDto
                        {
                            Holdorderid = ho.Id,
                            CustomerName = ho.CustomerName,
                            TotalAmount = ho.TotalAmount,
                            CreatedAt = ho.OrderDate,
                            UpdatedAt = ho.OrderDate,
                            Status = ho.Status,
                            Items = dbContext.HoldOrderItems
                                .Where(hoi => hoi.HoldOrderId == ho.Id)
                                .AsEnumerable()
                                .Join(dbContext.Products,
                                    hoi => hoi.Productid,
                                    p => p.Productid,
                                    (hoi, p) => new HoldOrderItemDto
                                    {
                                        Productid = hoi.Productid,
                                        ProductName = p.Name,
                                        Quantity = hoi.Quantity,
                                        Price = hoi.Price,
                                        Total = hoi.Price * hoi.Quantity
                                    })
                                .ToList()
                        })
                        .ToList();

                    System.Diagnostics.Debug.WriteLine($"GetHoldOrders: Found {holdOrders.Count} active orders");
                    return Ok(holdOrders);
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"GetHoldOrders Error: {ex.Message}");
                return BadRequest($"Error retrieving hold orders: {ex.Message}");
            }
        }

        [HttpDelete]
        [ActionName("DeleteHoldOrder")]
        public IActionResult DeleteHoldOrder(long holdOrderId)
        {
            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var holdOrder = dbContext.HoldOrders.Find(holdOrderId);
                    if (holdOrder == null)
                    {
                        return NotFound("Hold order not found");
                    }

                    // Delete related items first
                    var items = dbContext.HoldOrderItems.Where(i => i.HoldOrderId == holdOrderId).ToList();
                    foreach (var item in items)
                    {
                        dbContext.HoldOrderItems.Remove(item);
                    }

                    dbContext.HoldOrders.Remove(holdOrder);
                    dbContext.SaveChanges();

                    return Ok(new { message = "Hold order deleted successfully" });
                }
            }
            catch (Exception ex)
            {
                return BadRequest($"Error deleting hold order: {ex.Message}");
            }
        }

        [HttpGet]
        [ActionName("GetHoldOrderDetails")]
        public IActionResult GetHoldOrderDetails(long holdOrderId)
        {
            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var holdOrder = dbContext.HoldOrders.Find(holdOrderId);
                    if (holdOrder == null)
                    {
                        return NotFound("Hold order not found");
                    }

                    var items = (from hoi in dbContext.HoldOrderItems
                                 join p in dbContext.Products on hoi.Productid equals p.Productid
                                 where hoi.HoldOrderId == holdOrderId
                                 select new
                                 {
                                     productid = hoi.Productid,
                                     name = p.Name,
                                     price = hoi.Price,
                                     quantity = hoi.Quantity,
                                     image = p.Image,
                                     imgextension = p.Imgextension,
                                     description = p.Description,
                                     categoryid = p.Categoryid,
                                     stock = p.Stock,
                                     barcode = p.Barcode
                                 }).ToList();

                    return Ok(new
                    {
                        holdorderid = holdOrder.Id,
                        customerName = holdOrder.CustomerName,
                        totalAmount = holdOrder.TotalAmount,
                        items = items
                    });
                }
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving hold order details: {ex.Message}");
            }
        }

        // ===== INVENTORY ENDPOINTS =====

        [HttpGet]
        [ActionName("GetInventorySummary")]
        public IActionResult GetInventorySummary()
        {
            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var inventory = (from p in dbContext.Products
                                     select new InventorySummaryDto
                                     {
                                         Productid = p.Productid,
                                         ProductName = p.Name,
                                         CurrentStock = p.Stock ?? 0,
                                         ReorderLevel = 5,  // Default reorder level
                                         ReorderQuantity = 20,  // Default reorder quantity
                                         UnitPrice = p.Price,
                                         TotalValue = (p.Stock ?? 0) * (p.Price ?? 0),
                                         Status = (p.Stock ?? 0) == 0 ? "Out of Stock"
                                                : (p.Stock ?? 0) <= 5 ? "Low Stock"
                                                : "In Stock"
                                     })
                                     .OrderBy(x => x.Status == "Out of Stock" ? 0
                                                : x.Status == "Low Stock" ? 1
                                                : 2)
                                     .ToList();

                    return Ok(inventory);
                }
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving inventory summary: {ex.Message}");
            }
        }

        [HttpGet]
        [ActionName("GetInventoryMovementHistory")]
        public IActionResult GetInventoryMovementHistory(long? productId = null)
        {
            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var movements = dbContext.Inventories
                        .Where(i => productId == null || i.Productid == productId)
                        .Join(dbContext.Products,
                            i => i.Productid,
                            p => p.Productid,
                            (i, p) => new InventoryDto
                            {
                                InventoryId = i.Id,
                                Productid = i.Productid,
                                ProductName = p.Name,
                                Quantity = i.Quantity,
                                MovementType = i.MovementType,
                                Reference = i.Reference,
                                CreatedAt = i.CreatedAt,
                                CreatedBy = i.CreatedBy,
                                Notes = i.Notes
                            })
                        .OrderByDescending(x => x.CreatedAt)
                        .Take(500)  // Limit to last 500 movements
                        .ToList();

                    return Ok(movements);
                }
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving inventory movements: {ex.Message}");
            }
        }

        [HttpPost]
        [ActionName("RecordInventoryMovement")]
        public IActionResult RecordInventoryMovement([FromBody] InventoryMovementDto movementDto)
        {
            if (movementDto == null || movementDto.Productid <= 0)
            {
                return BadRequest("Invalid product ID");
            }

            if (string.IsNullOrWhiteSpace(movementDto.MovementType))
            {
                return BadRequest("Movement type is required");
            }

            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    // Get product
                    var product = dbContext.Products.Find(movementDto.Productid);
                    if (product == null)
                    {
                        return NotFound("Product not found");
                    }

                    // Create inventory movement record
                    var inventory = new Inventory
                    {
                        Productid = movementDto.Productid,
                        Quantity = movementDto.QuantityChange,
                        MovementType = movementDto.MovementType,
                        Reference = movementDto.Reference,
                        Notes = movementDto.Notes,
                        CreatedAt = DateTime.UtcNow,
                        CreatedBy = "System"  // In real app, use current user
                    };

                    dbContext.Inventories.Add(inventory);

                    // Update product stock
                    int newStock = (product.Stock ?? 0) + movementDto.QuantityChange;
                    if (newStock < 0)
                    {
                        return BadRequest("Cannot reduce stock below zero");
                    }

                    product.Stock = newStock;
                    dbContext.SaveChanges();

                    return Ok(new { message = "Inventory movement recorded", newStock = newStock });
                }
            }
            catch (Exception ex)
            {
                return BadRequest($"Error recording inventory movement: {ex.Message}");
            }
        }

        [HttpPost]
        [ActionName("AdjustInventory")]
        public IActionResult AdjustInventory(long productId, int newQuantity, string reason)
        {
            if (productId <= 0 || newQuantity < 0)
            {
                return BadRequest("Invalid product ID or quantity");
            }

            if (string.IsNullOrWhiteSpace(reason))
            {
                return BadRequest("Adjustment reason is required");
            }

            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var product = dbContext.Products.Find(productId);
                    if (product == null)
                    {
                        return NotFound("Product not found");
                    }

                    int oldStock = product.Stock ?? 0;
                    int quantityChange = newQuantity - oldStock;

                    // Record inventory movement
                    var inventory = new Inventory
                    {
                        Productid = productId,
                        Quantity = quantityChange,
                        MovementType = "Adjustment",
                        Reference = $"Manual Adjustment",
                        Notes = reason,
                        CreatedAt = DateTime.UtcNow,
                        CreatedBy = "System"
                    };

                    dbContext.Inventories.Add(inventory);
                    product.Stock = newQuantity;
                    dbContext.SaveChanges();

                    return Ok(new
                    {
                        message = "Inventory adjusted successfully",
                        oldStock = oldStock,
                        newStock = newQuantity,
                        quantityChanged = quantityChange
                    });
                }
            }
            catch (Exception ex)
            {
                return BadRequest($"Error adjusting inventory: {ex.Message}");
            }
        }

        [HttpGet]
        [ActionName("GetLowStockItems")]
        public IActionResult GetLowStockItems(int threshold = 5)
        {
            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var lowStockItems = dbContext.Products
                        .Where(p => (p.Stock ?? 0) <= threshold)
                        .Select(p => new InventorySummaryDto
                        {
                            Productid = p.Productid,
                            ProductName = p.Name,
                            CurrentStock = p.Stock ?? 0,
                            UnitPrice = p.Price,
                            TotalValue = (p.Stock ?? 0) * (p.Price ?? 0),
                            Status = (p.Stock ?? 0) == 0 ? "Out of Stock" : "Low Stock"
                        })
                        .OrderBy(x => x.CurrentStock)
                        .ToList();

                    return Ok(lowStockItems);
                }
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving low stock items: {ex.Message}");
            }
        }

        [HttpGet]
        [ActionName("GetInventoryStats")]
        public IActionResult GetInventoryStats()
        {
            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var stats = new
                    {
                        totalProducts = dbContext.Products.Count(),
                        totalStockValue = dbContext.Products.Sum(p => (p.Stock ?? 0) * (p.Price ?? 0)),
                        outOfStockCount = dbContext.Products.Count(p => (p.Stock ?? 0) == 0),
                        lowStockCount = dbContext.Products.Count(p => (p.Stock ?? 0) > 0 && (p.Stock ?? 0) <= 5),
                        totalInventoryMovements = dbContext.Inventories.Count(),
                        averageStockLevel = dbContext.Products.Average(p => (p.Stock ?? 0))
                    };

                    return Ok(stats);
                }
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving inventory stats: {ex.Message}");
            }
        }
    }
}
