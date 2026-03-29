namespace CrazyPOS.Server.Auth;

/// <summary>
/// Applied to an action or controller to exempt it from the per-request single-use token check.
/// Use on endpoints that issue request tokens themselves (e.g. IssueRequestToken) to break
/// the bootstrap cycle.
/// </summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = false)]
public sealed class SkipRequestTokenAttribute : Attribute { }
