namespace CrazyPOS.Server.Dto
{
    public class PromotionDto
    {
        public long PromotionId { get; set; }
        public string PromotionCode { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string PromotionType { get; set; }
        public string ValueType { get; set; }
        public decimal ValueAmount { get; set; }
        public decimal? MaxDiscountAmount { get; set; }
        public decimal? MinBasketAmount { get; set; }
        public string AppliesTo { get; set; }
        public long? TargetCategoryId { get; set; }
        public long? TargetProductId { get; set; }
        public bool Stackable { get; set; }
        public bool RequiresApproval { get; set; }
        public DateTime StartsAt { get; set; }
        public DateTime? EndsAt { get; set; }
        public int? UsageLimit { get; set; }
        public int UsageCount { get; set; }
        public bool IsActive { get; set; }
        public List<PromotionQualifierDto> Qualifiers { get; set; } = new();
    }

    public class PromotionQualifierDto
    {
        public long? QualifierId { get; set; }
        public string QualifierType { get; set; }
        public string QualifierOperator { get; set; }
        public string QualifierValue { get; set; }
    }

    public class CreatePromotionDto
    {
        public string PromotionCode { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string PromotionType { get; set; }
        public string ValueType { get; set; }
        public decimal ValueAmount { get; set; }
        public decimal? MaxDiscountAmount { get; set; }
        public decimal? MinBasketAmount { get; set; }
        public string AppliesTo { get; set; }
        public long? TargetCategoryId { get; set; }
        public long? TargetProductId { get; set; }
        public bool Stackable { get; set; }
        public bool RequiresApproval { get; set; }
        public DateTime StartsAt { get; set; }
        public DateTime? EndsAt { get; set; }
        public int? UsageLimit { get; set; }
        public List<PromotionQualifierDto> Qualifiers { get; set; } = new();
    }

    public class UpdatePromotionDto : CreatePromotionDto
    {
        public long PromotionId { get; set; }
    }

    public class SetPromotionStatusDto
    {
        public long PromotionId { get; set; }
        public bool IsActive { get; set; }
    }
}
