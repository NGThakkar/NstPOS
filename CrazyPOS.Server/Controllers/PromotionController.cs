using CrazyPOS.Server.Auth;
using CrazyPOS.Server.Dto;
using CrazyPOS.Server.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrazyPOS.Server.Controllers
{
    [Authorize]
    [Route("api/[controller]/[action]")]
    [ApiController]
    public class PromotionController : ControllerBase
    {
        private readonly IDbContextFactory<crazypos_devContext> _dbFactory;
        private readonly ICurrentUserService _currentUser;

        public PromotionController(IDbContextFactory<crazypos_devContext> dbFactory, ICurrentUserService currentUser)
        {
            _dbFactory = dbFactory;
            _currentUser = currentUser;
        }

        [HttpGet]
        [ActionName("GetPromotions")]
        public async Task<IActionResult> GetPromotions()
        {
            try
            {
                await using var dbContext = await _dbFactory.CreateDbContextAsync();

                var promotions = await dbContext.Promotions
                    .Include(p => p.PromotionQualifiers)
                    .OrderByDescending(p => p.CreatedAt)
                    .Select(p => ToDto(p))
                    .ToListAsync();

                return Ok(promotions);
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error retrieving promotions: {ex.Message}" });
            }
        }

        [HttpPost]
        [Authorize(Policy = "ManagerUp")]
        [ActionName("CreatePromotion")]
        public async Task<IActionResult> CreatePromotion([FromBody] CreatePromotionDto request)
        {
            if (!IsPromotionPayloadValid(request, out var validationError))
            {
                return BadRequest(new { success = false, message = validationError });
            }

            try
            {
                await using var dbContext = await _dbFactory.CreateDbContextAsync();

                if (!string.IsNullOrWhiteSpace(request.PromotionCode))
                {
                    var codeExists = await dbContext.Promotions.AnyAsync(p => p.PromotionCode == request.PromotionCode);
                    if (codeExists)
                    {
                        return BadRequest(new { success = false, message = "Promotion code already exists" });
                    }
                }

                var promotion = new Promotion
                {
                    PromotionCode = string.IsNullOrWhiteSpace(request.PromotionCode) ? null : request.PromotionCode.Trim(),
                    Name = request.Name.Trim(),
                    Description = request.Description,
                    PromotionType = request.PromotionType.Trim(),
                    ValueType = request.ValueType.Trim(),
                    ValueAmount = request.ValueAmount,
                    MaxDiscountAmount = request.MaxDiscountAmount,
                    MinBasketAmount = request.MinBasketAmount,
                    AppliesTo = request.AppliesTo.Trim(),
                    TargetCategoryId = request.TargetCategoryId,
                    TargetProductId = request.TargetProductId,
                    Stackable = request.Stackable,
                    RequiresApproval = request.RequiresApproval,
                    StartsAt = NormalizeDateTimeForStorage(request.StartsAt),
                    EndsAt = NormalizeDateTimeForStorage(request.EndsAt),
                    UsageLimit = request.UsageLimit,
                    UsageCount = 0,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = _currentUser.UserId,
                    PromotionQualifiers = request.Qualifiers
                        .Where(q => !string.IsNullOrWhiteSpace(q.QualifierType) && !string.IsNullOrWhiteSpace(q.QualifierOperator) && !string.IsNullOrWhiteSpace(q.QualifierValue))
                        .Select(q => new PromotionQualifier
                        {
                            QualifierType = q.QualifierType.Trim(),
                            QualifierOperator = q.QualifierOperator.Trim(),
                            QualifierValue = q.QualifierValue.Trim()
                        })
                        .ToList()
                };

                dbContext.Promotions.Add(promotion);
                await dbContext.SaveChangesAsync();

                var dto = await dbContext.Promotions
                    .Include(p => p.PromotionQualifiers)
                    .Where(p => p.PromotionId == promotion.PromotionId)
                    .Select(p => ToDto(p))
                    .FirstAsync();

                return Ok(dto);
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error creating promotion: {ex.Message}" });
            }
        }

        [HttpPut]
        [Authorize(Policy = "ManagerUp")]
        [ActionName("UpdatePromotion")]
        public async Task<IActionResult> UpdatePromotion([FromBody] UpdatePromotionDto request)
        {
            if (request == null || request.PromotionId <= 0)
            {
                return BadRequest(new { success = false, message = "Valid promotion ID is required" });
            }

            if (!IsPromotionPayloadValid(request, out var validationError))
            {
                return BadRequest(new { success = false, message = validationError });
            }

            try
            {
                await using var dbContext = await _dbFactory.CreateDbContextAsync();
                var promotion = await dbContext.Promotions
                    .Include(p => p.PromotionQualifiers)
                    .FirstOrDefaultAsync(p => p.PromotionId == request.PromotionId);

                if (promotion == null)
                {
                    return NotFound(new { success = false, message = "Promotion not found" });
                }

                if (!string.IsNullOrWhiteSpace(request.PromotionCode))
                {
                    var codeExists = await dbContext.Promotions
                        .AnyAsync(p => p.PromotionId != request.PromotionId && p.PromotionCode == request.PromotionCode);
                    if (codeExists)
                    {
                        return BadRequest(new { success = false, message = "Promotion code already exists" });
                    }
                }

                promotion.PromotionCode = string.IsNullOrWhiteSpace(request.PromotionCode) ? null : request.PromotionCode.Trim();
                promotion.Name = request.Name.Trim();
                promotion.Description = request.Description;
                promotion.PromotionType = request.PromotionType.Trim();
                promotion.ValueType = request.ValueType.Trim();
                promotion.ValueAmount = request.ValueAmount;
                promotion.MaxDiscountAmount = request.MaxDiscountAmount;
                promotion.MinBasketAmount = request.MinBasketAmount;
                promotion.AppliesTo = request.AppliesTo.Trim();
                promotion.TargetCategoryId = request.TargetCategoryId;
                promotion.TargetProductId = request.TargetProductId;
                promotion.Stackable = request.Stackable;
                promotion.RequiresApproval = request.RequiresApproval;
                promotion.StartsAt = NormalizeDateTimeForStorage(request.StartsAt);
                promotion.EndsAt = NormalizeDateTimeForStorage(request.EndsAt);
                promotion.UsageLimit = request.UsageLimit;
                promotion.UpdatedAt = DateTime.UtcNow;
                promotion.UpdatedBy = _currentUser.UserId;

                dbContext.PromotionQualifiers.RemoveRange(promotion.PromotionQualifiers);
                promotion.PromotionQualifiers = request.Qualifiers
                    .Where(q => !string.IsNullOrWhiteSpace(q.QualifierType) && !string.IsNullOrWhiteSpace(q.QualifierOperator) && !string.IsNullOrWhiteSpace(q.QualifierValue))
                    .Select(q => new PromotionQualifier
                    {
                        QualifierType = q.QualifierType.Trim(),
                        QualifierOperator = q.QualifierOperator.Trim(),
                        QualifierValue = q.QualifierValue.Trim(),
                        PromotionId = promotion.PromotionId
                    })
                    .ToList();

                await dbContext.SaveChangesAsync();

                var dto = await dbContext.Promotions
                    .Include(p => p.PromotionQualifiers)
                    .Where(p => p.PromotionId == promotion.PromotionId)
                    .Select(p => ToDto(p))
                    .FirstAsync();

                return Ok(dto);
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error updating promotion: {ex.Message}" });
            }
        }

        [HttpPost]
        [Authorize(Policy = "ManagerUp")]
        [ActionName("SetPromotionStatus")]
        public async Task<IActionResult> SetPromotionStatus([FromBody] SetPromotionStatusDto request)
        {
            if (request == null || request.PromotionId <= 0)
            {
                return BadRequest(new { success = false, message = "Valid promotion ID is required" });
            }

            try
            {
                await using var dbContext = await _dbFactory.CreateDbContextAsync();
                var promotion = await dbContext.Promotions.FirstOrDefaultAsync(p => p.PromotionId == request.PromotionId);

                if (promotion == null)
                {
                    return NotFound(new { success = false, message = "Promotion not found" });
                }

                promotion.IsActive = request.IsActive;
                promotion.UpdatedAt = DateTime.UtcNow;
                promotion.UpdatedBy = _currentUser.UserId;

                await dbContext.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    promotionId = promotion.PromotionId,
                    isActive = promotion.IsActive
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error setting promotion status: {ex.Message}" });
            }
        }

        private static bool IsPromotionPayloadValid(CreatePromotionDto request, out string message)
        {
            if (request == null)
            {
                message = "Request body is required";
                return false;
            }

            if (string.IsNullOrWhiteSpace(request.Name))
            {
                message = "Promotion name is required";
                return false;
            }

            if (string.IsNullOrWhiteSpace(request.PromotionType))
            {
                message = "Promotion type is required";
                return false;
            }

            if (string.IsNullOrWhiteSpace(request.ValueType))
            {
                message = "Value type is required";
                return false;
            }

            if (string.IsNullOrWhiteSpace(request.AppliesTo))
            {
                message = "AppliesTo is required";
                return false;
            }

            if (request.ValueAmount <= 0)
            {
                message = "ValueAmount must be greater than zero";
                return false;
            }

            if (request.EndsAt.HasValue && request.EndsAt.Value < request.StartsAt)
            {
                message = "EndsAt cannot be earlier than StartsAt";
                return false;
            }

            message = string.Empty;
            return true;
        }

        private static PromotionDto ToDto(Promotion promotion)
        {
            return new PromotionDto
            {
                PromotionId = promotion.PromotionId,
                PromotionCode = promotion.PromotionCode,
                Name = promotion.Name,
                Description = promotion.Description,
                PromotionType = promotion.PromotionType,
                ValueType = promotion.ValueType,
                ValueAmount = promotion.ValueAmount,
                MaxDiscountAmount = promotion.MaxDiscountAmount,
                MinBasketAmount = promotion.MinBasketAmount,
                AppliesTo = promotion.AppliesTo,
                TargetCategoryId = promotion.TargetCategoryId,
                TargetProductId = promotion.TargetProductId,
                Stackable = promotion.Stackable,
                RequiresApproval = promotion.RequiresApproval,
                StartsAt = NormalizeDateTimeForStorage(promotion.StartsAt),
                EndsAt = NormalizeDateTimeForStorage(promotion.EndsAt),
                UsageLimit = promotion.UsageLimit,
                UsageCount = promotion.UsageCount,
                IsActive = promotion.IsActive,
                Qualifiers = promotion.PromotionQualifiers
                    .Select(q => new PromotionQualifierDto
                    {
                        QualifierId = q.QualifierId,
                        QualifierType = q.QualifierType,
                        QualifierOperator = q.QualifierOperator,
                        QualifierValue = q.QualifierValue
                    })
                    .ToList()
            };
        }

        private static DateTime NormalizeDateTimeForStorage(DateTime value)
        {
            return DateTime.SpecifyKind(value, DateTimeKind.Unspecified);
        }

        private static DateTime? NormalizeDateTimeForStorage(DateTime? value)
        {
            return value.HasValue ? NormalizeDateTimeForStorage(value.Value) : null;
        }
    }
}
