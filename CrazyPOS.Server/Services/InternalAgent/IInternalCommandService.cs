using CrazyPOS.Server.Dto;

namespace CrazyPOS.Server.Services.InternalAgent
{
    public interface IInternalCommandService
    {
        Task<InternalAgentCommandResponseDto> ParseCommandAsync(string command, CancellationToken cancellationToken = default);
        Task<InternalAgentHealthResponseDto> CheckHealthAsync(CancellationToken cancellationToken = default);
    }
}
