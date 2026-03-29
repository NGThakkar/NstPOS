#nullable disable

namespace CrazyPOS.Server.Models;

public partial class PromotionQualifier
{
    public long QualifierId { get; set; }

    public long PromotionId { get; set; }

    public string QualifierType { get; set; }

    public string QualifierOperator { get; set; }

    public string QualifierValue { get; set; }

    public virtual Promotion Promotion { get; set; }
}
