#nullable disable
using System;

namespace CrazyPOS.Server.Models;

public partial class DailySalesSummary
{
    public long SummaryId { get; set; }

    public DateTime SummaryDate { get; set; }

    public decimal? TotalSales { get; set; }

    public decimal? TotalTax { get; set; }

    public decimal? TotalDiscount { get; set; }

    public int? TransactionCount { get; set; }

    public int? ItemsSold { get; set; }

    public DateTime CreatedAt { get; set; }
}
