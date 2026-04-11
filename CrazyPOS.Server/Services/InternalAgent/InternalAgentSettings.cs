namespace CrazyPOS.Server.Services.InternalAgent
{
    public class InternalAgentSettings
    {
        public bool Enabled { get; set; } = true;
        public string BaseUrl { get; set; } = "http://localhost:11434";
        public string Model { get; set; } = "qwen2.5:3b";
        public int TimeoutSeconds { get; set; } = 20;
    }
}
