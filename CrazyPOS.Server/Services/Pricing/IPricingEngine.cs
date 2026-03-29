using CrazyPOS.Server.Dto;
using CrazyPOS.Server.Models;

namespace CrazyPOS.Server.Services.Pricing;

public interface IPricingEngine
{
    Task<PricingPreviewResponseDto> PreviewPricingAsync(
        crazypos_devContext dbContext,
        PricingPreviewRequestDto request,
        long userId,
        CancellationToken cancellationToken = default);

    bool TryGetSnapshot(string snapshotId, out PricingSnapshot snapshot);

    bool TryApproveSnapshot(
        string snapshotId,
        long approvedByUserId,
        string? note,
        out PricingApprovalRecord? approval,
        out string? error);

    void RemoveSnapshot(string snapshotId);
}
