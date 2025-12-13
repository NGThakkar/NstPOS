using CrazyPOS.Server.Dto;
using CrazyPOS.Server.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace CrazyPOS.Server.Controllers
{
    [Route("api/[controller]/[action]")]
    [ApiController]
    public class CustomerController : ControllerBase
    {
        private readonly IDbContextFactory<crazypos_devContext> _dbFactory;

        public CustomerController(IDbContextFactory<crazypos_devContext> dbFactory)
        {
            _dbFactory = dbFactory;
        }

        /// <summary>
        /// Get all active customers
        /// </summary>
        [HttpGet]
        [ActionName("GetAllCustomers")]
        public IActionResult GetAllCustomers(int pageNumber = 1, int pageSize = 50)
        {
            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var customers = dbContext.Customers
                        .Where(c => c.IsActive)
                        .OrderByDescending(c => c.CreatedAt)
                        .Skip((pageNumber - 1) * pageSize)
                        .Take(pageSize)
                        .Select(c => new CustomerSearchDto
                        {
                            CustomerId = c.CustomerId,
                            CustomerCode = c.CustomerCode,
                            FullName = c.FirstName + " " + c.LastName,
                            Email = c.Email,
                            PhoneNumber = c.PhoneNumber,
                            TotalPurchases = c.TotalPurchases,
                            TotalOutstanding = c.TotalOutstanding,
                            LoyaltyStatus = c.LoyaltyStatus
                        })
                        .ToList();

                    return Ok(customers);
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error retrieving customers: {ex.Message}" });
            }
        }

        /// <summary>
        /// Search customers by name, email, or phone
        /// </summary>
        [HttpGet]
        [ActionName("SearchCustomers")]
        public IActionResult SearchCustomers(string searchTerm)
        {
            if (string.IsNullOrWhiteSpace(searchTerm))
            {
                return BadRequest(new { success = false, message = "Search term is required" });
            }

            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var searchLower = searchTerm.ToLower();
                    var customers = dbContext.Customers
                        .Where(c => c.IsActive && (
                            c.FirstName.ToLower().Contains(searchLower) ||
                            c.LastName.ToLower().Contains(searchLower) ||
                            c.CustomerCode.ToLower().Contains(searchLower) ||
                            c.Email.ToLower().Contains(searchLower) ||
                            c.PhoneNumber.Contains(searchTerm)
                        ))
                        .OrderByDescending(c => c.CreatedAt)
                        .Take(20)
                        .Select(c => new CustomerSearchDto
                        {
                            CustomerId = c.CustomerId,
                            CustomerCode = c.CustomerCode,
                            FullName = c.FirstName + " " + c.LastName,
                            Email = c.Email,
                            PhoneNumber = c.PhoneNumber,
                            TotalPurchases = c.TotalPurchases,
                            TotalOutstanding = c.TotalOutstanding,
                            LoyaltyStatus = c.LoyaltyStatus
                        })
                        .ToList();

                    return Ok(customers);
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error searching customers: {ex.Message}" });
            }
        }

        /// <summary>
        /// Get customer details by ID
        /// </summary>
        [HttpGet]
        [ActionName("GetCustomer")]
        public IActionResult GetCustomer(long customerId)
        {
            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var customer = dbContext.Customers.FirstOrDefault(c => c.CustomerId == customerId);

                    if (customer == null)
                    {
                        return NotFound(new { success = false, message = "Customer not found" });
                    }

                    var customerDto = new CustomerDto
                    {
                        CustomerId = customer.CustomerId,
                        CustomerCode = customer.CustomerCode,
                        FirstName = customer.FirstName,
                        LastName = customer.LastName,
                        Email = customer.Email,
                        PhoneNumber = customer.PhoneNumber,
                        Address = customer.Address,
                        City = customer.City,
                        State = customer.State,
                        ZipCode = customer.ZipCode,
                        Country = customer.Country,
                        TotalPurchases = customer.TotalPurchases,
                        TotalOutstanding = customer.TotalOutstanding,
                        DateOfBirth = customer.DateOfBirth,
                        Gender = customer.Gender,
                        LoyaltyStatus = customer.LoyaltyStatus,
                        LoyaltyPoints = customer.LoyaltyPoints,
                        Notes = customer.Notes,
                        IsActive = customer.IsActive,
                        CreatedAt = customer.CreatedAt,
                        LastUpdated = customer.LastUpdated
                    };

                    return Ok(customerDto);
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error retrieving customer: {ex.Message}" });
            }
        }

        /// <summary>
        /// Create a new customer
        /// </summary>
        [HttpPost]
        [ActionName("CreateCustomer")]
        public async Task<IActionResult> CreateCustomer([FromBody] CreateCustomerDto customerDto)
        {
            if (customerDto == null || string.IsNullOrWhiteSpace(customerDto.FirstName) || string.IsNullOrWhiteSpace(customerDto.LastName))
            {
                return BadRequest(new { success = false, message = "First name and last name are required" });
            }

            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    // Generate unique customer code
                    string customerCode = $"CUST-{DateTime.Now:yyyyMMddHHmmss}";

                    var customer = new Customer
                    {
                        CustomerCode = customerCode,
                        FirstName = customerDto.FirstName,
                        LastName = customerDto.LastName,
                        Email = customerDto.Email,
                        PhoneNumber = customerDto.PhoneNumber,
                        Address = customerDto.Address,
                        City = customerDto.City,
                        State = customerDto.State,
                        ZipCode = customerDto.ZipCode,
                        Country = customerDto.Country,
                        DateOfBirth = customerDto.DateOfBirth,
                        Gender = customerDto.Gender,
                        Notes = customerDto.Notes,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        LastUpdated = DateTime.UtcNow
                    };

                    dbContext.Customers.Add(customer);
                    await dbContext.SaveChangesAsync();

                    return Ok(new
                    {
                        success = true,
                        message = "Customer created successfully",
                        customerId = customer.CustomerId,
                        customerCode = customer.CustomerCode
                    });
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error creating customer: {ex.Message}" });
            }
        }

        /// <summary>
        /// Update customer information
        /// </summary>
        [HttpPut]
        [ActionName("UpdateCustomer")]
        public async Task<IActionResult> UpdateCustomer([FromBody] UpdateCustomerDto customerDto)
        {
            if (customerDto == null || customerDto.CustomerId <= 0)
            {
                return BadRequest(new { success = false, message = "Customer ID is required" });
            }

            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var customer = await dbContext.Customers.FindAsync(customerDto.CustomerId);

                    if (customer == null)
                    {
                        return NotFound(new { success = false, message = "Customer not found" });
                    }

                    customer.FirstName = customerDto.FirstName ?? customer.FirstName;
                    customer.LastName = customerDto.LastName ?? customer.LastName;
                    customer.Email = customerDto.Email ?? customer.Email;
                    customer.PhoneNumber = customerDto.PhoneNumber ?? customer.PhoneNumber;
                    customer.Address = customerDto.Address ?? customer.Address;
                    customer.City = customerDto.City ?? customer.City;
                    customer.State = customerDto.State ?? customer.State;
                    customer.ZipCode = customerDto.ZipCode ?? customer.ZipCode;
                    customer.Country = customerDto.Country ?? customer.Country;
                    customer.DateOfBirth = customerDto.DateOfBirth != DateTime.MinValue ? customerDto.DateOfBirth : customer.DateOfBirth;
                    customer.Gender = customerDto.Gender ?? customer.Gender;
                    customer.LoyaltyStatus = customerDto.LoyaltyStatus ?? customer.LoyaltyStatus;
                    customer.LoyaltyPoints = customerDto.LoyaltyPoints > 0 ? customerDto.LoyaltyPoints : customer.LoyaltyPoints;
                    customer.Notes = customerDto.Notes ?? customer.Notes;
                    customer.LastUpdated = DateTime.UtcNow;

                    dbContext.Customers.Update(customer);
                    await dbContext.SaveChangesAsync();

                    return Ok(new { success = true, message = "Customer updated successfully" });
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error updating customer: {ex.Message}" });
            }
        }

        /// <summary>
        /// Delete customer (soft delete)
        /// </summary>
        [HttpDelete]
        [ActionName("DeleteCustomer")]
        public async Task<IActionResult> DeleteCustomer(long customerId)
        {
            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var customer = await dbContext.Customers.FindAsync(customerId);

                    if (customer == null)
                    {
                        return NotFound(new { success = false, message = "Customer not found" });
                    }

                    customer.IsActive = false;
                    customer.LastUpdated = DateTime.UtcNow;

                    dbContext.Customers.Update(customer);
                    await dbContext.SaveChangesAsync();

                    return Ok(new { success = true, message = "Customer deleted successfully" });
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error deleting customer: {ex.Message}" });
            }
        }

        /// <summary>
        /// Get customer transaction history
        /// </summary>
        [HttpGet]
        [ActionName("GetCustomerTransactions")]
        public IActionResult GetCustomerTransactions(long customerId, int pageNumber = 1, int pageSize = 20)
        {
            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var transactions = dbContext.SalesTransactions
                        .Where(t => t.CustomerId == customerId)
                        .OrderByDescending(t => t.TransactionDate)
                        .Skip((pageNumber - 1) * pageSize)
                        .Take(pageSize)
                        .Select(t => new
                        {
                            t.TransactionId,
                            t.TransactionCode,
                            t.TransactionDate,
                            t.TotalAmount,
                            t.PaymentMethod,
                            t.Status
                        })
                        .ToList();

                    return Ok(transactions);
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error retrieving transactions: {ex.Message}" });
            }
        }

        /// <summary>
        /// Update customer loyalty points
        /// </summary>
        [HttpPost]
        [ActionName("UpdateLoyaltyPoints")]
        public async Task<IActionResult> UpdateLoyaltyPoints(long customerId, int points)
        {
            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var customer = await dbContext.Customers.FindAsync(customerId);

                    if (customer == null)
                    {
                        return NotFound(new { success = false, message = "Customer not found" });
                    }

                    customer.LoyaltyPoints += points;
                    customer.LastUpdated = DateTime.UtcNow;

                    dbContext.Customers.Update(customer);
                    await dbContext.SaveChangesAsync();

                    return Ok(new { success = true, message = "Loyalty points updated successfully", loyaltyPoints = customer.LoyaltyPoints });
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error updating loyalty points: {ex.Message}" });
            }
        }

        /// <summary>
        /// Get loyalty rewards threshold configuration
        /// </summary>
        [HttpGet]
        [ActionName("GetLoyaltyConfig")]
        public IActionResult GetLoyaltyConfig()
        {
            return Ok(new
            {
                pointsPerDollar = 1,
                pointsPerPurchase = 5,
                rewardThreshold = 100,
                silverStatusThreshold = 5000,
                goldStatusThreshold = 10000,
                platinumStatusThreshold = 25000
            });
        }
    }
}
