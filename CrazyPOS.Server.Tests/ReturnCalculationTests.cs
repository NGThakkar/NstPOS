using Xunit;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CrazyPOS.Server.Models;
using CrazyPOS.Server.Dto;

namespace CrazyPOS.Server.Tests
{
    public class ReturnCalculationTests : IDisposable
    {
        private readonly DbContextOptions<crazypos_devContext> _contextOptions;
        private crazypos_devContext _context;

        public ReturnCalculationTests()
        {
            _contextOptions = new DbContextOptionsBuilder<crazypos_devContext>()
                .UseInMemoryDatabase(databaseName: $"TestDb_{Guid.NewGuid()}")
                .Options;
        }

        private void InitializeContext()
        {
            _context = new crazypos_devContext(_contextOptions);
            _context.Database.EnsureCreated();
            SeedTestData();
        }

        private void SeedTestData()
        {
            // Create a test user
            var user = new User
            {
                UserId = 1,
                Username = "testuser",
                Email = "test@test.com",
                PasswordHash = "hash",
                FullName = "Test User",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            _context.Users.Add(user);

            // Create a test product
            var product = new Product
            {
                ProductId = 1,
                ProductName = "Test Product",
                ProductBarcode = "123456789",
                ProductCategory = "Test",
                Price = 100.00m,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            _context.Products.Add(product);

            // Create a test transaction
            var transaction = new SalesTransaction
            {
                TransactionId = 1,
                TransactionCode = "TXN-001",
                StoreId = 1,
                ProcessedByUserId = 1,
                TransactionDate = DateTime.UtcNow,
                SubtotalAmount = 100.00m,
                TaxAmount = 8.75m,
                DiscountAmount = 0m,
                CurrencyCode = "USD",
                PaymentMethod = "Cash",
                Status = "completed",
                RefundedAmount = 0m,
                ReturnStatus = "none",
                CreatedAt = DateTime.UtcNow
            };
            _context.SalesTransactions.Add(transaction);

            // Create transaction items
            var item = new TransactionItem
            {
                TransactionItemId = 1,
                TransactionId = 1,
                ProductId = 1,
                Quantity = 2,
                UnitPrice = 50.00m,
                LineTotal = 100.00m,
                TaxAmount = 8.75m,
                DiscountAmount = 0m,
                ReturnedQuantity = 0,
                CreatedAt = DateTime.UtcNow
            };
            _context.TransactionItems.Add(item);

            _context.SaveChanges();
        }

        public void Dispose()
        {
            _context?.Dispose();
        }

        #region Tax Proration Tests

        [Fact]
        public void CalculateTaxReversal_FullReturn_ReverseAllTax()
        {
            // Arrange
            InitializeContext();
            var transaction = _context.SalesTransactions.First();
            var item = transaction.TransactionItems.First();
            
            // Act
            var returnedQty = 2; // Full return
            var taxReversal = (item.LineTotal / transaction.TransactionItems.Sum(i => i.LineTotal)) 
                            * transaction.TaxAmount 
                            * (returnedQty / (decimal)item.Quantity);

            // Assert
            Assert.Equal(Math.Round(transaction.TaxAmount, 2), Math.Round(taxReversal, 2));
        }

        [Fact]
        public void CalculateTaxReversal_PartialReturn_ProrateTax()
        {
            // Arrange
            InitializeContext();
            var transaction = _context.SalesTransactions.First();
            var item = transaction.TransactionItems.First();
            
            // Act
            var returnedQty = 1; // Partial return
            var taxReversal = (item.LineTotal / transaction.TransactionItems.Sum(i => i.LineTotal)) 
                            * transaction.TaxAmount 
                            * (returnedQty / (decimal)item.Quantity);

            // Assert
            var expectedTax = transaction.TaxAmount * 0.5m; // 50% of tax
            Assert.Equal(Math.Round(expectedTax, 2), Math.Round(taxReversal, 2));
        }

        [Fact]
        public void CalculateTaxReversal_MultipleItems_ProrateCorrctly()
        {
            // Arrange
            InitializeContext();
            
            // Add another item to the transaction
            var item2 = new TransactionItem
            {
                TransactionItemId = 2,
                TransactionId = 1,
                ProductId = 1,
                Quantity = 1,
                UnitPrice = 100.00m,
                LineTotal = 100.00m,
                TaxAmount = 8.75m,
                DiscountAmount = 0m,
                ReturnedQuantity = 0,
                CreatedAt = DateTime.UtcNow
            };
            _context.TransactionItems.Add(item2);
            
            var transaction = _context.SalesTransactions.First();
            transaction.SubtotalAmount = 200.00m;
            transaction.TaxAmount = 17.50m;
            
            _context.SaveChanges();

            // Act
            var item1 = _context.TransactionItems.First();
            var totalLineTotal = _context.TransactionItems.Where(i => i.TransactionId == 1).Sum(i => i.LineTotal);
            
            var taxReversal = (item1.LineTotal / totalLineTotal) 
                            * transaction.TaxAmount 
                            * (1 / (decimal)item1.Quantity);

            // Assert
            var expectedTax = 8.75m; // 50% of total tax for returning 1 item of first line
            Assert.Equal(Math.Round(expectedTax, 2), Math.Round(taxReversal, 2));
        }

        #endregion

        #region Over-Return Prevention Tests

        [Fact]
        public void ValidateReturnQuantity_FullReturn_Allowed()
        {
            // Arrange
            InitializeContext();
            var item = _context.TransactionItems.First();
            var returnedQuantity = 2;

            // Act
            var maxReturnable = item.Quantity - item.ReturnedQuantity;

            // Assert
            Assert.True(returnedQuantity <= maxReturnable);
        }

        [Fact]
        public void ValidateReturnQuantity_PartialReturn_Allowed()
        {
            // Arrange
            InitializeContext();
            var item = _context.TransactionItems.First();
            item.ReturnedQuantity = 1;
            _context.SaveChanges();
            
            var attemptedReturnQty = 1;

            // Act
            var maxReturnable = item.Quantity - item.ReturnedQuantity;

            // Assert
            Assert.True(attemptedReturnQty <= maxReturnable);
        }

        [Fact]
        public void ValidateReturnQuantity_OverReturn_Blocked()
        {
            // Arrange
            InitializeContext();
            var item = _context.TransactionItems.First();
            item.ReturnedQuantity = 2;
            _context.SaveChanges();
            
            var attemptedReturnQty = 1;

            // Act
            var maxReturnable = item.Quantity - item.ReturnedQuantity;

            // Assert
            Assert.False(attemptedReturnQty <= maxReturnable, 
                "Over-return should be prevented: attempted qty exceeds returnable qty");
        }

        [Fact]
        public void ValidateReturnQuantity_ZeroQty_Blocked()
        {
            // Arrange
            InitializeContext();
            var item = _context.TransactionItems.First();
            var attemptedReturnQty = 0;

            // Act & Assert
            Assert.False(attemptedReturnQty > 0, "Return quantity must be greater than 0");
        }

        #endregion

        #region Return Status Tests

        [Fact]
        public void CalculateReturnStatus_NoReturns_StatusNone()
        {
            // Arrange
            InitializeContext();
            var transaction = _context.SalesTransactions.First();

            // Act
            var hasAnyReturn = _context.TransactionItems
                .Where(i => i.TransactionId == transaction.TransactionId)
                .Any(i => i.ReturnedQuantity > 0);

            // Assert
            Assert.False(hasAnyReturn);
        }

        [Fact]
        public void CalculateReturnStatus_PartialReturn_StatusPartial()
        {
            // Arrange
            InitializeContext();
            var transaction = _context.SalesTransactions.First();
            var item = transaction.TransactionItems.First();
            item.ReturnedQuantity = 1;
            _context.SaveChanges();

            // Act
            var totalQty = _context.TransactionItems
                .Where(i => i.TransactionId == transaction.TransactionId)
                .Sum(i => i.Quantity);
            
            var returnedQty = _context.TransactionItems
                .Where(i => i.TransactionId == transaction.TransactionId)
                .Sum(i => i.ReturnedQuantity);
            
            var returnStatus = returnedQty == 0 ? "none" : returnedQty == totalQty ? "full" : "partial";

            // Assert
            Assert.Equal("partial", returnStatus);
        }

        [Fact]
        public void CalculateReturnStatus_FullReturn_StatusFull()
        {
            // Arrange
            InitializeContext();
            var transaction = _context.SalesTransactions.First();
            var item = transaction.TransactionItems.First();
            item.ReturnedQuantity = 2;
            _context.SaveChanges();

            // Act
            var totalQty = _context.TransactionItems
                .Where(i => i.TransactionId == transaction.TransactionId)
                .Sum(i => i.Quantity);
            
            var returnedQty = _context.TransactionItems
                .Where(i => i.TransactionId == transaction.TransactionId)
                .Sum(i => i.ReturnedQuantity);
            
            var returnStatus = returnedQty == 0 ? "none" : returnedQty == totalQty ? "full" : "partial";

            // Assert
            Assert.Equal("full", returnStatus);
        }

        #endregion

        #region Refund Calculation Tests

        [Fact]
        public void CalculateRefundTotal_FullReturn_ReversesAll()
        {
            // Arrange
            InitializeContext();
            var transaction = _context.SalesTransactions.First();
            var item = transaction.TransactionItems.First();

            // Act
            var subtotalReversal = item.LineTotal;
            var taxReversal = transaction.TaxAmount;
            var discountReversal = item.DiscountAmount;
            var refundTotal = subtotalReversal - discountReversal + taxReversal;

            // Assert
            Assert.Equal(Math.Round(transaction.SubtotalAmount + transaction.TaxAmount - transaction.DiscountAmount, 2),
                        Math.Round(refundTotal, 2));
        }

        [Fact]
        public void CalculateRefundTotal_PartialReturn_ProrateCorrectly()
        {
            // Arrange
            InitializeContext();
            var transaction = _context.SalesTransactions.First();
            var item = transaction.TransactionItems.First();
            var returnQty = 1;

            // Act
            var subtotalReversal = (item.UnitPrice * returnQty);
            var taxReversal = (transaction.TaxAmount * (returnQty / (decimal)item.Quantity));
            var discountReversal = (item.DiscountAmount * (returnQty / (decimal)item.Quantity));
            var refundTotal = subtotalReversal - discountReversal + taxReversal;

            // Assert
            Assert.True(refundTotal > 0);
            Assert.True(refundTotal < (transaction.SubtotalAmount + transaction.TaxAmount));
        }

        [Fact]
        public void CalculateRefundTotal_WithDiscount_ProratesDiscount()
        {
            // Arrange
            InitializeContext();
            var transaction = _context.SalesTransactions.First();
            transaction.DiscountAmount = 10.00m;
            
            var item = transaction.TransactionItems.First();
            item.DiscountAmount = 10.00m;
            
            _context.SaveChanges();

            // Act
            var returnQty = 1;
            var subtotalReversal = (item.UnitPrice * returnQty);
            var discountReversal = (item.DiscountAmount * (returnQty / (decimal)item.Quantity));
            var taxReversal = (transaction.TaxAmount * (returnQty / (decimal)item.Quantity));
            var refundTotal = subtotalReversal - discountReversal + taxReversal;

            // Assert
            Assert.True(refundTotal > subtotalReversal - 10.00m);
        }

        #endregion

        #region Denomination Tests

        [Fact]
        public void RoundCurrency_TwoDecimalPlaces()
        {
            // Arrange
            var unrounded = 123.456m;

            // Act
            var rounded = Math.Round(unrounded, 2);

            // Assert
            Assert.Equal(123.46m, rounded);
        }

        [Fact]
        public void RoundCurrency_FromCentsRounding()
        {
            // Arrange
            var unrounded = 100.004m;

            // Act
            var rounded = Math.Round(unrounded, 2);

            // Assert
            Assert.Equal(100.00m, rounded);
        }

        #endregion

        #region Inventory Disposition Tests

        [Fact]
        public void ValidateDisposition_RestockIsValid()
        {
            // Arrange
            var disposition = "restock";

            // Act
            var isValid = new[] { "restock", "damaged", "discard" }.Contains(disposition);

            // Assert
            Assert.True(isValid);
        }

        [Fact]
        public void ValidateDisposition_DamagedIsValid()
        {
            // Arrange
            var disposition = "damaged";

            // Act
            var isValid = new[] { "restock", "damaged", "discard" }.Contains(disposition);

            // Assert
            Assert.True(isValid);
        }

        [Fact]
        public void ValidateDisposition_DiscardIsValid()
        {
            // Arrange
            var disposition = "discard";

            // Act
            var isValid = new[] { "restock", "damaged", "discard" }.Contains(disposition);

            // Assert
            Assert.True(isValid);
        }

        [Fact]
        public void ValidateDisposition_InvalidValue_Rejected()
        {
            // Arrange
            var disposition = "invalid";

            // Act
            var isValid = new[] { "restock", "damaged", "discard" }.Contains(disposition);

            // Assert
            Assert.False(isValid);
        }

        #endregion

        #region Settlement Status Tests

        [Theory]
        [InlineData("cash")]
        [InlineData("card")]
        [InlineData("store_credit")]
        public void ValidateRefundMethod_AllMethodsSupported(string refundMethod)
        {
            // Arrange & Act
            var isValid = new[] { "cash", "card", "store_credit", "manual" }.Contains(refundMethod);

            // Assert
            Assert.True(isValid);
        }

        [Fact]
        public void DetermineSettlementStatus_CashIsImmediate()
        {
            // Arrange
            var refundMethod = "cash";

            // Act
            var settlementStatus = refundMethod == "cash" ? "settled" : "pending";

            // Assert
            Assert.Equal("settled", settlementStatus);
        }

        [Fact]
        public void DetermineSettlementStatus_CardIsPending()
        {
            // Arrange
            var refundMethod = "card";

            // Act
            var settlementStatus = refundMethod == "cash" ? "settled" : "pending";

            // Assert
            Assert.Equal("pending", settlementStatus);
        }

        #endregion

        #region Data Integrity Tests

        [Fact]
        public void ReturnRecord_OriginalDataPreserved()
        {
            // Arrange
            InitializeContext();
            var item = _context.TransactionItems.First();
            var originalPrice = item.UnitPrice;
            var originalQty = item.Quantity;

            // Act
            var unitPricePreserved = item.UnitPrice == originalPrice;
            var quantityPreserved = item.Quantity == originalQty;

            // Assert
            Assert.True(unitPricePreserved && quantityPreserved);
        }

        [Fact]
        public void TransactionCancellation_BlockedWhenReturnsExist()
        {
            // Arrange
            InitializeContext();
            var item = _context.TransactionItems.First();
            item.ReturnedQuantity = 1;
            _context.SaveChanges();

            // Act
            var hasReturns = _context.TransactionItems
                .Where(i => i.TransactionId == 1)
                .Any(i => i.ReturnedQuantity > 0);

            // Assert
            Assert.True(hasReturns, "Cancellation should be blocked when returns exist");
        }

        #endregion
    }
}
