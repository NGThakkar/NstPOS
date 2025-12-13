#nullable disable
using System;
using System.Collections.Generic;

namespace CrazyPOS.Server.Models;

public partial class Customer
{
    public long CustomerId { get; set; }

    public string CustomerCode { get; set; }

    public string FirstName { get; set; }

    public string LastName { get; set; }

    public string Email { get; set; }

    public string PhoneNumber { get; set; }

    public string Address { get; set; }

    public string City { get; set; }

    public string State { get; set; }

    public string ZipCode { get; set; }

    public string Country { get; set; }

    public decimal TotalPurchases { get; set; } = 0;

    public decimal TotalOutstanding { get; set; } = 0;

    public DateTime DateOfBirth { get; set; }

    public string Gender { get; set; }

    public string LoyaltyStatus { get; set; } = "Regular";

    public int LoyaltyPoints { get; set; } = 0;

    public string Notes { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; }

    public DateTime LastUpdated { get; set; }

    // Navigation properties
    public virtual ICollection<SalesTransaction> SalesTransactions { get; set; } = new List<SalesTransaction>();
}
