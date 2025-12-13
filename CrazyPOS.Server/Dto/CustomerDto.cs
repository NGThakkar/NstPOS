namespace CrazyPOS.Server.Dto
{
    public class CustomerDto
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
        public decimal TotalPurchases { get; set; }
        public decimal TotalOutstanding { get; set; }
        public DateTime DateOfBirth { get; set; }
        public string Gender { get; set; }
        public string LoyaltyStatus { get; set; }
        public int LoyaltyPoints { get; set; }
        public string Notes { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime LastUpdated { get; set; }

        public string FullName => $"{FirstName} {LastName}";
    }

    public class CreateCustomerDto
    {
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Email { get; set; }
        public string PhoneNumber { get; set; }
        public string Address { get; set; }
        public string City { get; set; }
        public string State { get; set; }
        public string ZipCode { get; set; }
        public string Country { get; set; }
        public DateTime DateOfBirth { get; set; }
        public string Gender { get; set; }
        public string Notes { get; set; }
    }

    public class UpdateCustomerDto
    {
        public long CustomerId { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Email { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? ZipCode { get; set; }
        public string? Country { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? Gender { get; set; }
        public string? LoyaltyStatus { get; set; }
        public int? LoyaltyPoints { get; set; }
        public string? Notes { get; set; }
    }

    public class CustomerSearchDto
    {
        public long CustomerId { get; set; }
        public string CustomerCode { get; set; }
        public string FullName { get; set; }
        public string Email { get; set; }
        public string PhoneNumber { get; set; }
        public decimal TotalPurchases { get; set; }
        public decimal TotalOutstanding { get; set; }
        public string LoyaltyStatus { get; set; }
    }
}
