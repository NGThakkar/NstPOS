using CrazyPOS.Server.Dto;
using CrazyPOS.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CrazyPOS.Server.Controllers;

[Authorize(Policy = "ManagerUp")]
[Route("api/[controller]/[action]")]
[ApiController]
public class ReportingController : ControllerBase
{
    private const int MaxDateRangeDays = 366;
    private const int MaxPageSize = 200;
    private readonly IReportingService _reportingService;

    public ReportingController(IReportingService reportingService)
    {
        _reportingService = reportingService;
    }

    [HttpGet]
    public async Task<IActionResult> GetDailySales(DateTime startDate, DateTime endDate, CancellationToken cancellationToken)
    {
        var rangeValidation = ValidateRange(startDate, endDate);
        if (rangeValidation != null)
        {
            return rangeValidation;
        }

        var report = await _reportingService.GetDailySalesAsync(startDate, endDate, cancellationToken);
        return Ok(report);
    }

    [HttpGet]
    public async Task<IActionResult> GetHourlySales(DateTime date, CancellationToken cancellationToken)
    {
        var report = await _reportingService.GetHourlySalesAsync(date, cancellationToken);
        return Ok(report);
    }

    [HttpGet]
    public async Task<IActionResult> GetCashierPerformance(
        DateTime startDate,
        DateTime endDate,
        int pageNumber = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var rangeValidation = ValidateRange(startDate, endDate);
        if (rangeValidation != null)
        {
            return rangeValidation;
        }

        if (pageNumber < 1)
        {
            return BadRequest(new { success = false, message = "Page number must be 1 or greater" });
        }

        if (pageSize < 1 || pageSize > MaxPageSize)
        {
            return BadRequest(new { success = false, message = $"Page size must be between 1 and {MaxPageSize}" });
        }

        var report = await _reportingService.GetCashierPerformanceAsync(startDate, endDate, pageNumber, pageSize, cancellationToken);
        return Ok(report);
    }

    [HttpGet]
    public async Task<IActionResult> GetCategoryPerformance(DateTime startDate, DateTime endDate, CancellationToken cancellationToken)
    {
        var rangeValidation = ValidateRange(startDate, endDate);
        if (rangeValidation != null)
        {
            return rangeValidation;
        }

        var report = await _reportingService.GetCategoryPerformanceAsync(startDate, endDate, cancellationToken);
        return Ok(report);
    }

    [HttpGet]
    public async Task<IActionResult> GetTopProducts(DateTime startDate, DateTime endDate, int limit = 10, CancellationToken cancellationToken = default)
    {
        var rangeValidation = ValidateRange(startDate, endDate);
        if (rangeValidation != null)
        {
            return rangeValidation;
        }

        if (limit < 1 || limit > 100)
        {
            return BadRequest(new { success = false, message = "Limit must be between 1 and 100" });
        }

        var report = await _reportingService.GetTopProductsAsync(startDate, endDate, limit, cancellationToken);
        return Ok(report);
    }

    [HttpGet]
    public async Task<IActionResult> GetPaymentMethodPerformance(DateTime startDate, DateTime endDate, CancellationToken cancellationToken)
    {
        var rangeValidation = ValidateRange(startDate, endDate);
        if (rangeValidation != null)
        {
            return rangeValidation;
        }

        var report = await _reportingService.GetPaymentMethodPerformanceAsync(startDate, endDate, cancellationToken);
        return Ok(report);
    }

    [HttpGet]
    public async Task<IActionResult> GetTopPerformers(DateTime startDate, DateTime endDate, int limit = 10, CancellationToken cancellationToken = default)
    {
        var rangeValidation = ValidateRange(startDate, endDate);
        if (rangeValidation != null)
        {
            return rangeValidation;
        }

        if (limit < 1 || limit > 100)
        {
            return BadRequest(new { success = false, message = "Limit must be between 1 and 100" });
        }

        var report = await _reportingService.GetTopPerformersAsync(startDate, endDate, limit, cancellationToken);
        return Ok(report);
    }

    private IActionResult? ValidateRange(DateTime startDate, DateTime endDate)
    {
        if (startDate.Date > endDate.Date)
        {
            return BadRequest(new { success = false, message = "Start date cannot be after end date" });
        }

        if ((endDate.Date - startDate.Date).TotalDays > MaxDateRangeDays)
        {
            return BadRequest(new { success = false, message = $"Date range cannot exceed {MaxDateRangeDays} days" });
        }

        return null;
    }
}