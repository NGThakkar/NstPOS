using CrazyPOS.Server.Dto;
using CrazyPOS.Server.Services.InternalAgent;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CrazyPOS.Server.Controllers
{
    [Authorize(Policy = "ManagerUp")]
    [Route("api/[controller]/[action]")]
    [ApiController]
    public class InternalAgentController : ControllerBase
    {
        private readonly IInternalCommandService _internalCommandService;

        public InternalAgentController(IInternalCommandService internalCommandService)
        {
            _internalCommandService = internalCommandService;
        }

        [HttpPost]
        [ActionName("ParseCommand")]
        public async Task<IActionResult> ParseCommand([FromBody] InternalAgentCommandRequestDto request, CancellationToken cancellationToken)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Command))
            {
                return BadRequest(new InternalAgentCommandResponseDto
                {
                    Success = false,
                    Message = "Command is required.",
                    Action = "none"
                });
            }

            var result = await _internalCommandService.ParseCommandAsync(request.Command, cancellationToken);
            return Ok(result);
        }

        [HttpGet]
        [ActionName("Health")]
        public async Task<IActionResult> Health(CancellationToken cancellationToken)
        {
            var result = await _internalCommandService.CheckHealthAsync(cancellationToken);
            return Ok(result);
        }
    }
}
