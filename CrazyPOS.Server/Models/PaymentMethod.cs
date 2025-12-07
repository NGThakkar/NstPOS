#nullable disable
using System;

namespace CrazyPOS.Server.Models;

public partial class PaymentMethod
{
    public long PaymentMethodId { get; set; }

    public string MethodName { get; set; }

    public string Description { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }
}
